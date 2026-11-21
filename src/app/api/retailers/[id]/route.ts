import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const { id } = await params;

    const retailer = await prisma.retailer.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              include: { brand: true, category: true },
            },
          },
        },
        purchaseOrders: {
          include: {
            items: {
              include: { product: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!retailer || retailer.deletedAt) {
      return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
    }

    return NextResponse.json({ retailer });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch retailer" }, { status: 500 });
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

    const {
      name,
      contactPerson,
      phone,
      altPhone,
      email,
      address,
      city,
      state,
      pincode,
      gstin,
      paymentTerms,
      notes,
      rating,
      active,
    } = body;

    const updated = await prisma.retailer.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(contactPerson ? { contactPerson: contactPerson.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        altPhone: altPhone !== undefined ? (altPhone ? altPhone.trim() : null) : undefined,
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(address !== undefined ? { address: address.trim() } : {}),
        ...(city !== undefined ? { city: city.trim() } : {}),
        ...(state !== undefined ? { state: state.trim() } : {}),
        ...(pincode !== undefined ? { pincode: pincode.trim() } : {}),
        ...(gstin ? { gstin: gstin.trim().toUpperCase() } : {}),
        ...(paymentTerms ? { paymentTerms } : {}),
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        ...(rating !== undefined ? { rating: parseInt(rating, 10) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    return NextResponse.json({ success: true, retailer: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update retailer" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const { id } = await params;

    // SOFT DELETE! Never hard delete.
    await prisma.retailer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete retailer" }, { status: 500 });
  }
}
