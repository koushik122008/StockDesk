import React from "react";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { MovementsClient } from "@/components/movements/MovementsClient";

export const dynamic = "force-dynamic";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await ensureSqlitePragmas();
  const { productId } = await searchParams;

  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where: productId ? { productId } : undefined,
      include: {
        product: {
          include: { brand: true, category: true },
        },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sku: true, quantity: true, sellingPricePaise: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <MovementsClient
        initialMovements={movements}
        products={products}
        filterProductId={productId}
      />
    </div>
  );
}
