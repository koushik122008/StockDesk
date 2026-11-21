import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const sales = await prisma.stockMovement.findMany({
      where: {
        type: "SALE",
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ sales });
  } catch (err: any) {
    console.error("Sales fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id || null;
    const body = await req.json();
    const {
      productId,
      quantity,
      customerName,
      customerPhone,
      invoiceNo,
      notes,
    } = body;

    const sellQty = parseInt(quantity, 10);
    if (!productId || isNaN(sellQty) || sellQty <= 0) {
      return NextResponse.json(
        { error: "Product ID and a positive sale quantity are required" },
        { status: 400 }
      );
    }

    // Execute within Prisma interactive transaction with optimistic locking
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { category: true, brand: true },
      });

      if (!product || product.deletedAt) {
        throw new Error("Product not found or has been deleted");
      }

      if (product.quantity < sellQty) {
        throw new Error(
          `Insufficient stock! Only ${product.quantity} unit(s) available for "${product.name}".`
        );
      }

      const previousQuantity = product.quantity;
      const newQuantity = previousQuantity - sellQty;

      // Update product inventory count
      const updatedProduct = await tx.product.update({
        where: {
          id: productId,
          version: product.version,
        },
        data: {
          quantity: newQuantity,
          version: { increment: 1 },
        },
      });

      // Construct reference & notes string
      const customerInfo = [
        customerName?.trim() ? `Customer: ${customerName.trim()}` : "",
        customerPhone?.trim() ? `Phone: ${customerPhone.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const saleNotes = [
        customerInfo,
        notes?.trim() ? notes.trim() : "Counter sale",
      ]
        .filter(Boolean)
        .join(" - ");

      // Record SALE movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          userId,
          type: "SALE",
          quantityChange: -sellQty,
          previousQuantity,
          newQuantity,
          unitPricePaise: product.purchasePricePaise,
          referenceType: "SALE",
          referenceId: invoiceNo?.trim() || null,
          reason: saleNotes || `Sold ${sellQty} unit(s)`,
        },
      });

      // Append-only audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: "STOCK_SALE",
          entity: "PRODUCT",
          entityId: product.id,
          details: `Sold ${sellQty} unit(s) of ${product.name} (${product.sku}). Count: ${previousQuantity} -> ${newQuantity}. Ref: ${invoiceNo || "Counter"}`,
        },
      });

      return {
        product: updatedProduct,
        movement,
        soldQty: sellQty,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully sold ${result.soldQty} unit(s) of ${result.product.name}!`,
      product: result.product,
      movement: result.movement,
    });
  } catch (err: any) {
    console.error("Sale transaction error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process sale" },
      { status: 400 }
    );
  }
}
