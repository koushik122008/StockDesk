import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const { id } = await params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
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
    });

    if (!order || order.deletedAt) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch PO" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const { id } = await params;
    const body = await req.json();
    const { status, notes } = body;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { retailer: true, items: true },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update PO" }, { status: 500 });
  }
}
