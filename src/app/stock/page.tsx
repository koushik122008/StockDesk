import React from "react";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { StockTable } from "@/components/stock/StockTable";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  await ensureSqlitePragmas();
  const { highlight } = await searchParams;

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        brand: true,
        retailers: {
          include: { retailer: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Computer Peripherals Inventory
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Live stock on shelf &bull; Click any count to edit &bull; Use +/- buttons for quick counter transactions
        </p>
      </div>

      <StockTable
        initialProducts={products}
        categories={categories}
        brands={brands}
        highlightId={highlight}
      />
    </div>
  );
}
