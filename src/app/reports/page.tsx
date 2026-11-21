import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { PrintStockReport } from "@/components/reports/PrintStockReport";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await ensureSqlitePragmas();
  const session = await getServerSession(authOptions);
  const { type } = await searchParams;

  const [products, categories, brands, retailers, shopSettings] = await Promise.all([
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
    prisma.retailer.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.setting.findMany(),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of shopSettings) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div className="space-y-6">
      <PrintStockReport
        initialProducts={products}
        categories={categories}
        brands={brands}
        retailers={retailers}
        shopSettings={settingsMap}
        operatorName={session?.user?.name || "Admin"}
      />
    </div>
  );
}
