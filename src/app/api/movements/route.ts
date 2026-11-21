import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await ensureSqlitePragmas();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");

    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(type && type !== "ALL" ? { type } : {}),
      },
      include: {
        product: {
          include: { brand: true, category: true },
        },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ movements });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch movements" }, { status: 500 });
  }
}
