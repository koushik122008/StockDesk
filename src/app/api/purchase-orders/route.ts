import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureSqlitePragmas();

    const orders = await prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      include: {
        retailer: true,
        items: {
          include: {
            product: {
              include: { brand: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const body = await req.json();
    const { action, retailerId, items = [], notes, expectedDate } = body;

    // Action: Auto-create POs for ALL low-stock items grouped by retailer!
    if (action === "create-from-low-stock") {
      const lowProducts = await prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          category: true,
          retailers: {
            include: { retailer: true },
          },
        },
      });

      const itemsNeedingReorder = lowProducts.filter((p) => {
        const threshold = p.minReorderLevel ?? p.category?.defaultReorderLevel ?? 5;
        return p.quantity <= threshold;
      });

      if (itemsNeedingReorder.length === 0) {
        return NextResponse.json(
          { error: "No products currently need restocking." },
          { status: 400 }
        );
      }

      // Group items by their primary retailer
      const retailerGroups = new Map<string, typeof itemsNeedingReorder>();
      const defaultRetailer = await prisma.retailer.findFirst({ where: { deletedAt: null } });

      for (const p of itemsNeedingReorder) {
        const rId =
          p.retailers?.find((r: any) => r.isPrimary)?.retailerId ||
          p.retailers?.[0]?.retailerId ||
          defaultRetailer?.id;

        if (rId) {
          if (!retailerGroups.has(rId)) {
            retailerGroups.set(rId, []);
          }
          retailerGroups.get(rId)!.push(p);
        }
      }

      const createdPOs = [];
      const now = new Date();

      for (const [rId, groupProducts] of retailerGroups.entries()) {
        const count = await prisma.purchaseOrder.count();
        const poNumber = `PO-${now.getFullYear()}-${String(count + 1).padStart(4, "0")}`;

        let totalPaise = 0;
        const lineItems = groupProducts.map((p) => {
          const threshold = p.minReorderLevel ?? p.category?.defaultReorderLevel ?? 5;
          const orderQty = Math.max(1, threshold * 2 - p.quantity);
          const lineTotal = orderQty * p.purchasePricePaise;
          totalPaise += lineTotal;

          return {
            productId: p.id,
            orderedQty: orderQty,
            receivedQty: 0,
            unitPricePaise: p.purchasePricePaise,
            gstRate: p.gstRate,
          };
        });

        const po = await prisma.purchaseOrder.create({
          data: {
            poNumber,
            retailerId: rId,
            status: "DRAFT",
            totalPaise,
            notes: "Auto-generated from low-stock threshold alert",
            expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            items: {
              create: lineItems,
            },
          },
          include: { retailer: true, items: true },
        });

        createdPOs.push(po);
      }

      return NextResponse.json({
        success: true,
        count: createdPOs.length,
        purchaseOrders: createdPOs,
      });
    }

    // Action: Manual PO creation
    if (!retailerId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Retailer and at least one item are required" },
        { status: 400 }
      );
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    let totalPaise = 0;
    const lineItems = [];

    for (const item of items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod) continue;

      const qty = parseInt(item.orderedQty, 10) || 1;
      const unitPricePaise =
        item.unitPricePaise !== undefined ? parseInt(item.unitPricePaise, 10) : prod.purchasePricePaise;
      totalPaise += qty * unitPricePaise;

      lineItems.push({
        productId: prod.id,
        orderedQty: qty,
        receivedQty: 0,
        unitPricePaise,
        gstRate: prod.gstRate,
      });
    }

    const createdPO = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        retailerId,
        status: "DRAFT",
        totalPaise,
        notes: notes || null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        items: {
          create: lineItems,
        },
      },
      include: {
        retailer: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, purchaseOrder: createdPO });
  } catch (err: any) {
    console.error("PO create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create PO" }, { status: 500 });
  }
}
