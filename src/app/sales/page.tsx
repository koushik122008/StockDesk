import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { SalesClient } from "@/components/sales/SalesClient";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  await ensureSqlitePragmas();
  const session = await getServerSession(authOptions);

  const [sales, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { type: "SALE" },
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
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        brand: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SalesClient
        initialSales={sales}
        products={products}
        currentUser={session?.user as any}
      />
    </div>
  );
}
