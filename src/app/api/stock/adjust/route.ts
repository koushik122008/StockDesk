import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { evaluateStockAlerts } from "@/lib/alerts";

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const body = await req.json();
    const {
      productId,
      quantityChange,
      type = "ADJUSTMENT",
      reason,
      referenceType = "MANUAL",
      referenceId,
      version,
    } = body;

    if (!productId || typeof quantityChange !== "number") {
      return NextResponse.json(
        { error: "productId and numeric quantityChange are required" },
        { status: 400 }
      );
    }

    // Execute within Prisma interactive transaction
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!current || current.deletedAt) {
        throw new Error("Product not found or has been deleted");
      }

      // Optimistic locking verification if version is passed
      if (version !== undefined && version !== null && current.version !== version) {
        const err: any = new Error(
          "Concurrency Conflict: Product was updated by another user. Please refresh and review current stock."
        );
        err.code = "VERSION_MISMATCH";
        err.status = 409;
        throw err;
      }

      const previousQuantity = current.quantity;
      const newQuantity = Math.max(0, previousQuantity + quantityChange);

      const updatedProduct = await tx.product.update({
        where: {
          id: productId,
          version: current.version,
        },
        data: {
          quantity: newQuantity,
          version: { increment: 1 },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: current.id,
          userId,
          type,
          quantityChange,
          previousQuantity,
          newQuantity,
          unitPricePaise: current.purchasePricePaise,
          referenceType,
          referenceId: referenceId || null,
          reason: reason || `Stock adjustment: ${quantityChange >= 0 ? "+" : ""}${quantityChange} units`,
        },
      });

      return {
        product: updatedProduct,
        movement,
        previousQuantity,
        newQuantity,
      };
    });

    // Check low-stock triggers after successful commit
    await evaluateStockAlerts({
      productId: result.product.id,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
    });

    return NextResponse.json({
      success: true,
      product: result.product,
      movement: result.movement,
    });
  } catch (err: any) {
    console.error("Stock adjustment error:", err);
    if (err.code === "VERSION_MISMATCH" || err.status === 409) {
      return NextResponse.json(
        { error: err.message, conflict: true },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message || "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
