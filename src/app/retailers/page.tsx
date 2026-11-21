import React from "react";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { RetailersClient } from "@/components/retailers/RetailersClient";

export const dynamic = "force-dynamic";

export default async function RetailersPage() {
  await ensureSqlitePragmas();

  const retailers = await prisma.retailer.findMany({
    where: { deletedAt: null },
    include: {
      products: {
        include: { product: true },
      },
      purchaseOrders: true,
    },
    orderBy: { name: "asc" },
  });

  const enriched = retailers.map((r) => {
    let totalPurchases = 0;
    for (const po of r.purchaseOrders) {
      if (po.status !== "CANCELLED") {
        totalPurchases += po.totalPaise;
      }
    }
    return {
      ...r,
      productCount: r.products.length,
      totalPurchasesPaise: totalPurchases,
      pendingPOCount: r.purchaseOrders.filter(
        (po) => po.status === "SENT" || po.status === "PARTIALLY_RECEIVED"
      ).length,
    };
  });

  return (
    <div className="space-y-6">
      <RetailersClient initialRetailers={enriched} />
    </div>
  );
}
