import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await ensureSqlitePragmas();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json({ products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
          { model: { contains: q } },
          { brand: { name: { contains: q } } },
          { category: { name: { contains: q } } },
          { rackLocation: { contains: q } },
        ],
      },
      include: {
        brand: true,
        category: true,
      },
      take: 20,
    });

    return NextResponse.json({ products });
  } catch (err: any) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}
