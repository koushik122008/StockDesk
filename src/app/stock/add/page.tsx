import React from "react";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { AddStockClient } from "@/components/stock/AddStockClient";

export const dynamic = "force-dynamic";

export default async function AddStockPage() {
  await ensureSqlitePragmas();

  const [categories, brands, retailers] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.retailer.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AddStockClient
        categories={categories}
        brands={brands}
        retailers={retailers}
      />
    </div>
  );
}
