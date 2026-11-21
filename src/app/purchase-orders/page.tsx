import React from "react";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { PurchaseOrdersClient } from "@/components/orders/PurchaseOrdersClient";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; retailerId?: string; poNumber?: string }>;
}) {
  await ensureSqlitePragmas();
  const { action, retailerId, poNumber } = await searchParams;

  const [orders, retailers, products] = await Promise.all([
    prisma.purchaseOrder.findMany({
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
    }),
    prisma.retailer.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        purchasePricePaise: true,
        quantity: true,
        minReorderLevel: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PurchaseOrdersClient
        initialOrders={orders}
        retailers={retailers}
        products={products}
        initialAction={action}
        preselectedRetailerId={retailerId}
        highlightPoNumber={poNumber}
      />
    </div>
  );
}
