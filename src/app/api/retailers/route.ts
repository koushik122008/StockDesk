import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureSqlitePragmas();

    const retailers = await prisma.retailer.findMany({
      where: { deletedAt: null },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, quantity: true, purchasePricePaise: true },
            },
          },
        },
        purchaseOrders: {
          select: { id: true, totalPaise: true, status: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = retailers.map((r) => {
      let totalPurchasePaise = 0;
      for (const po of r.purchaseOrders) {
        if (po.status !== "CANCELLED") {
          totalPurchasePaise += po.totalPaise;
        }
      }

      return {
        ...r,
        productCount: r.products.length,
        totalPurchasePaise,
        pendingPOCount: r.purchaseOrders.filter((po) => po.status === "SENT" || po.status === "PARTIALLY_RECEIVED").length,
      };
    });

    return NextResponse.json({ retailers: enriched });
  } catch (err: any) {
    console.error("Retailers GET error:", err);
    return NextResponse.json({ error: "Failed to fetch retailers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
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
      paymentTerms = "Net 30",
      notes,
      rating = 5,
    } = body;

    if (!name || !contactPerson || !phone || !email || !gstin) {
      return NextResponse.json(
        { error: "Name, Contact Person, Phone, Email, and GSTIN are required" },
        { status: 400 }
      );
    }

    const created = await prisma.retailer.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        altPhone: altPhone ? altPhone.trim() : null,
        email: email.trim().toLowerCase(),
        address: address ? address.trim() : "",
        city: city ? city.trim() : "",
        state: state ? state.trim() : "",
        pincode: pincode ? pincode.trim() : "",
        gstin: gstin.trim().toUpperCase(),
        paymentTerms: paymentTerms || "Net 30",
        notes: notes ? notes.trim() : null,
        rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
        active: true,
      },
    });

    return NextResponse.json({ success: true, retailer: created });
  } catch (err: any) {
    console.error("Retailer create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create retailer" }, { status: 500 });
  }
}
