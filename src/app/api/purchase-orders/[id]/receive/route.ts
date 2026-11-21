import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { evaluateStockAlerts } from "@/lib/alerts";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const { id } = await params;
    const body = await req.json();
    const { items = [], invoiceNo, notes } = body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        retailer: true,
        items: { include: { product: true } },
      },
    });

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    const updatedAlertProducts: Array<{ id: string; prev: number; next: number }> = [];

    // Execute receiving inside transaction
    const result = await prisma.$transaction(async (tx) => {
      let allFullyReceived = true;

      for (const poItem of po.items) {
        // Find match in submitted items
        const incoming = items.find((i: any) => i.itemId === poItem.id);
        const qtyToReceive = incoming ? parseInt(incoming.receivedQty, 10) || 0 : 0;

        if (qtyToReceive > 0) {
          const currentProd = await tx.product.findUnique({
            where: { id: poItem.productId },
          });

          if (currentProd) {
            const prevQty = currentProd.quantity;
            const newQty = prevQty + qtyToReceive;

            // Increment product quantity
            await tx.product.update({
              where: { id: currentProd.id },
              data: {
                quantity: newQty,
                version: { increment: 1 },
                purchasePricePaise: poItem.unitPricePaise,
              },
            });

            // Update primary retailer last purchase price & date
            await tx.productRetailer.upsert({
              where: {
                productId_retailerId: {
                  productId: currentProd.id,
                  retailerId: po.retailerId,
                },
              },
              create: {
                productId: currentProd.id,
                retailerId: po.retailerId,
                lastPurchasePricePaise: poItem.unitPricePaise,
                lastPurchaseDate: new Date(),
                isPrimary: true,
              },
              update: {
                lastPurchasePricePaise: poItem.unitPricePaise,
                lastPurchaseDate: new Date(),
              },
            });

            // Record StockMovement
            await tx.stockMovement.create({
              data: {
                productId: currentProd.id,
                userId,
                type: "PURCHASE",
                quantityChange: qtyToReceive,
                previousQuantity: prevQty,
                newQuantity: newQty,
                unitPricePaise: poItem.unitPricePaise,
                referenceType: "PURCHASE_ORDER",
                referenceId: po.poNumber,
                reason: `Received against ${po.poNumber}${invoiceNo ? ` (Inv: ${invoiceNo})` : ""}`,
              },
            });

            updatedAlertProducts.push({
              id: currentProd.id,
              prev: prevQty,
              next: newQty,
            });
          }
        }

        const newTotalReceived = poItem.receivedQty + qtyToReceive;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: newTotalReceived },
        });

        if (newTotalReceived < poItem.orderedQty) {
          allFullyReceived = false;
        }
      }

      // Update PO status
      const anyReceived = po.items.some((i) => i.receivedQty > 0) || items.some((i: any) => (parseInt(i.receivedQty, 10) || 0) > 0);
      const newStatus = allFullyReceived
        ? "RECEIVED"
        : anyReceived
        ? "PARTIALLY_RECEIVED"
        : po.status;

      const updatedPO = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: newStatus,
          notes: notes ? `${po.notes ? po.notes + " | " : ""}${notes}` : po.notes,
        },
      });

      return updatedPO;
    });

    // Check alert status outside transaction
    for (const p of updatedAlertProducts) {
      await evaluateStockAlerts({
        productId: p.id,
        previousQuantity: p.prev,
        newQuantity: p.next,
      });
    }

    return NextResponse.json({ success: true, order: result });
  } catch (err: any) {
    console.error("Receive stock error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to receive stock" },
      { status: 500 }
    );
  }
}
