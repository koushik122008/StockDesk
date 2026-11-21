import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await ensureSqlitePragmas();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json({ product: null });
    }

    // First try exact SKU match
    let product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        sku: { equals: query },
      },
      include: {
        brand: true,
        category: true,
        retailers: {
          include: { retailer: true },
        },
      },
    });

    // If not found, try barcode match
    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          deletedAt: null,
          barcode: { equals: query },
        },
        include: {
          brand: true,
          category: true,
          retailers: {
            include: { retailer: true },
          },
        },
      });
    }

    return NextResponse.json({ product });
  } catch (err: any) {
    console.error("Lookup API error:", err);
    return NextResponse.json({ error: "Failed to lookup barcode" }, { status: 500 });
  }
}
