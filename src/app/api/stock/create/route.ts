import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { rupeeToPaise } from "@/lib/money";

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const body = await req.json();
    let {
      name,
      brandId,
      brandName,
      model,
      sku,
      barcode,
      categoryId,
      quantity = 0,
      minReorderLevel = 0,
      purchasePriceRupees,
      sellingPriceRupees,
      gstRate = 18,
      warrantyMonths = 12,
      rackLocation = "General",
      retailerId,
      purchaseDate,
      invoiceNo,
      serialNumbers = [],
      tags,
      notes,
    } = body;

    if (!name || !model || !categoryId) {
      return NextResponse.json(
        { error: "Name, Model, and Category are required" },
        { status: 400 }
      );
    }

    // Auto-resolve or create brand if brandName is supplied without brandId
    if (!brandId && brandName) {
      const existingBrand = await prisma.brand.findUnique({ where: { name: brandName.trim() } });
      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const createdBrand = await prisma.brand.create({ data: { name: brandName.trim() } });
        brandId = createdBrand.id;
      }
    }

    if (!brandId) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Auto-generate SKU if blank
    if (!sku || !sku.trim()) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      const prefix = cat ? cat.slug.substring(0, 3).toUpperCase() : "PRP";
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      sku = `${prefix}-${randomPart}`;
    } else {
      sku = sku.trim().toUpperCase();
    }

    // Check duplicate SKU
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json(
        {
          error: `Product with SKU "${sku}" already exists (${existingSku.name}). Use "Add quantity" or modify SKU.`,
          duplicateProduct: existingSku,
        },
        { status: 409 }
      );
    }

    const purchasePricePaise = rupeeToPaise(purchasePriceRupees || 0);
    // If sellingPrice is not provided, default to 0
    const sellingPricePaise = sellingPriceRupees ? rupeeToPaise(sellingPriceRupees) : 0;
    const initialQty = Math.max(0, parseInt(quantity, 10) || 0);

    // Run transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          brandId,
          model: model.trim(),
          sku,
          barcode: barcode ? barcode.trim() : null,
          categoryId,
          quantity: initialQty,
          minReorderLevel: parseInt(minReorderLevel, 10) || 0,
          purchasePricePaise,
          sellingPricePaise,
          gstRate: parseInt(gstRate, 10) || 18,
          warrantyMonths: parseInt(warrantyMonths, 10) || 12,
          rackLocation: rackLocation.trim() || "General",
          invoiceNo: invoiceNo ? invoiceNo.trim() : null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          tags: tags || null,
          notes: notes || null,
          alertArmed: false,
          version: 1,
        },
      });

      // Link retailer if provided
      if (retailerId) {
        await tx.productRetailer.create({
          data: {
            productId: product.id,
            retailerId,
            lastPurchasePricePaise: purchasePricePaise,
            lastPurchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            isPrimary: true,
          },
        });
      }

      // Record initial stock movement if quantity > 0
      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId,
            type: "PURCHASE",
            quantityChange: initialQty,
            previousQuantity: 0,
            newQuantity: initialQty,
            unitPricePaise: purchasePricePaise,
            referenceType: invoiceNo ? "INVOICE" : "MANUAL",
            referenceId: invoiceNo || null,
            reason: `Initial stock receipt of ${initialQty} units`,
          },
        });
      }

      // Add serial numbers if provided
      if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
        for (const sn of serialNumbers) {
          if (sn && typeof sn === "string" && sn.trim()) {
            await tx.serialNumber.create({
              data: {
                productId: product.id,
                serialNumber: sn.trim(),
                status: "IN_STOCK",
              },
            });
          }
        }
      }

      return product;
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    console.error("Create product error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
