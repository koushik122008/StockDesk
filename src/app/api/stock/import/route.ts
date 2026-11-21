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

    const { items, duplicateAction = "merge" } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for import" }, { status: 400 });
    }

    let createdCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Pre-fetch categories and brands to minimize queries
    const allCategories = await prisma.category.findMany();
    const allBrands = await prisma.brand.findMany();
    const allRetailers = await prisma.retailer.findMany({ where: { deletedAt: null } });

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNum = i + 1;

      try {
        const name = row.name?.toString().trim();
        const model = row.model?.toString().trim() || "Standard";
        const brandName = row.brand?.toString().trim() || "Generic";
        const categoryName = row.category?.toString().trim() || "Keyboards";
        let sku = row.sku?.toString().trim().toUpperCase();
        const barcode = row.barcode?.toString().trim() || null;
        const qty = Math.max(0, parseInt(row.quantity, 10) || 0);
        const purchasePricePaise = rupeeToPaise(row.purchasePrice || 0);
        const sellingPricePaise = rupeeToPaise(row.sellingPrice || 0);
        const gstRate = parseInt(row.gstRate, 10) || 18;
        const warrantyMonths = parseInt(row.warrantyMonths, 10) || 12;
        const rackLocation = row.rackLocation?.toString().trim() || "General";
        const retailerName = row.retailer?.toString().trim();

        if (!name) {
          errors.push({ row: rowNum, error: "Missing product name" });
          continue;
        }

        // Match or create category
        let category = allCategories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.slug === categoryName.toLowerCase()
        );
        if (!category) {
          category = allCategories[0]; // fallback
        }

        // Match or create brand
        let brand = allBrands.find(
          (b) => b.name.toLowerCase() === brandName.toLowerCase()
        );
        if (!brand) {
          brand = await prisma.brand.create({ data: { name: brandName } });
          allBrands.push(brand);
        }

        // Match retailer
        const retailer = retailerName
          ? allRetailers.find((r) => r.name.toLowerCase().includes(retailerName.toLowerCase()))
          : allRetailers[0];

        // Generate SKU if blank
        if (!sku) {
          const prefix = category.slug.substring(0, 3).toUpperCase();
          const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
          sku = `${prefix}-${rand}`;
        }

        // Check if SKU exists
        const existing = await prisma.product.findUnique({ where: { sku } });

        if (existing) {
          if (duplicateAction === "skip") {
            skippedCount++;
            continue;
          } else if (duplicateAction === "merge") {
            // Increment existing quantity
            const newQty = existing.quantity + qty;
            await prisma.$transaction(async (tx) => {
              await tx.product.update({
                where: { id: existing.id },
                data: {
                  quantity: newQty,
                  version: { increment: 1 },
                  ...(purchasePricePaise > 0 ? { purchasePricePaise } : {}),
                  ...(sellingPricePaise > 0 ? { sellingPricePaise } : {}),
                },
              });

              if (qty > 0) {
                await tx.stockMovement.create({
                  data: {
                    productId: existing.id,
                    userId,
                    type: "PURCHASE",
                    quantityChange: qty,
                    previousQuantity: existing.quantity,
                    newQuantity: newQty,
                    unitPricePaise: purchasePricePaise || existing.purchasePricePaise,
                    referenceType: "IMPORT_MERGE",
                    reason: `CSV bulk import merged +${qty} units`,
                  },
                });
              }
            });
            mergedCount++;
            continue;
          }
        }

        // Create new product
        await prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              name,
              brandId: brand!.id,
              model,
              sku,
              barcode,
              categoryId: category!.id,
              quantity: qty,
              minReorderLevel: category!.defaultReorderLevel,
              purchasePricePaise,
              sellingPricePaise,
              gstRate,
              warrantyMonths,
              rackLocation,
              version: 1,
            },
          });

          if (retailer) {
            await tx.productRetailer.create({
              data: {
                productId: created.id,
                retailerId: retailer.id,
                lastPurchasePricePaise: purchasePricePaise,
                isPrimary: true,
              },
            });
          }

          if (qty > 0) {
            await tx.stockMovement.create({
              data: {
                productId: created.id,
                userId,
                type: "PURCHASE",
                quantityChange: qty,
                previousQuantity: 0,
                newQuantity: qty,
                unitPricePaise: purchasePricePaise,
                referenceType: "BULK_IMPORT",
                reason: "CSV/Excel bulk import",
              },
            });
          }
        });

        createdCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || "Row processing error" });
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      mergedCount,
      skippedCount,
      errors,
    });
  } catch (err: any) {
    console.error("Bulk import error:", err);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
