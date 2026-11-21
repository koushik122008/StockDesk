import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { formatIST } from "@/lib/money";

export async function GET() {
  try {
    const backupDir = path.resolve(process.cwd(), "data", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith(".db") || f.endsWith(".zip") || f.endsWith(".csv"))
      .map((fileName) => {
        const filePath = path.join(backupDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          name: fileName,
          sizeBytes: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const lastBackupSetting = await prisma.setting.findUnique({
      where: { key: "last_backup_at" },
    });

    const secondaryPathSetting = await prisma.setting.findUnique({
      where: { key: "secondary_backup_path" },
    });

    return NextResponse.json({
      backups: files,
      lastBackupAt: lastBackupSetting?.value || null,
      secondaryPath: secondaryPathSetting?.value || "",
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const body = await req.json().catch(() => ({}));

    const sourceDb = path.resolve(process.cwd(), "data", "stockdesk.db");
    const backupDir = path.resolve(process.cwd(), "data", "backups");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDbName = `stockdesk_backup_${timestamp}.db`;
    const targetDbPath = path.join(backupDir, backupDbName);

    // 1. Copy SQLite database file
    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, targetDbPath);
    }

    // 2. Generate CSV snapshots of products, retailers, and movements
    const [products, retailers, movements] = await Promise.all([
      prisma.product.findMany({ where: { deletedAt: null } }),
      prisma.retailer.findMany({ where: { deletedAt: null } }),
      prisma.stockMovement.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
    ]);

    const csvProductsPath = path.join(backupDir, `stock_export_${timestamp}.csv`);
    const productCsv = [
      "ID,SKU,Name,Model,Quantity,PurchasePricePaise,SellingPricePaise,RackLocation",
      ...products.map(
        (p) =>
          `"${p.id}","${p.sku}","${p.name.replace(/"/g, '""')}","${p.model}",${p.quantity},${p.purchasePricePaise},${p.sellingPricePaise},"${p.rackLocation}"`
      ),
    ].join("\n");
    fs.writeFileSync(csvProductsPath, productCsv, "utf8");

    const csvRetailersPath = path.join(backupDir, `retailers_export_${timestamp}.csv`);
    const retailerCsv = [
      "ID,Name,ContactPerson,Phone,Email,City,GSTIN,PaymentTerms",
      ...retailers.map(
        (r) =>
          `"${r.id}","${r.name.replace(/"/g, '""')}","${r.contactPerson}","${r.phone}","${r.email}","${r.city}","${r.gstin}","${r.paymentTerms}"`
      ),
    ].join("\n");
    fs.writeFileSync(csvRetailersPath, retailerCsv, "utf8");

    // 3. Secondary Backup Copy if configured
    let secondarySaved = false;
    const secondarySetting = await prisma.setting.findUnique({
      where: { key: "secondary_backup_path" },
    });
    const secondaryFolder = body.secondaryPath || secondarySetting?.value;

    if (secondaryFolder && fs.existsSync(secondaryFolder)) {
      try {
        const secDbPath = path.join(secondaryFolder, backupDbName);
        fs.copyFileSync(sourceDb, secDbPath);
        secondarySaved = true;
      } catch (err) {
        console.warn("Secondary backup write failed:", err);
      }
    }

    // 4. Rotate backups: Keep only the last 30 .db files
    const allDbBackups = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("stockdesk_backup_") && f.endsWith(".db"))
      .map((f) => ({
        file: f,
        mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (allDbBackups.length > 30) {
      for (let i = 30; i < allDbBackups.length; i++) {
        try {
          fs.unlinkSync(path.join(backupDir, allDbBackups[i].file));
        } catch (e) {}
      }
    }

    // 5. Update last_backup_at setting
    const nowIso = new Date().toISOString();
    await prisma.setting.upsert({
      where: { key: "last_backup_at" },
      create: { key: "last_backup_at", value: nowIso },
      update: { value: nowIso },
    });

    return NextResponse.json({
      success: true,
      backupFile: backupDbName,
      timestamp: nowIso,
      secondarySaved,
    });
  } catch (err: any) {
    console.error("Backup generation failed:", err);
    return NextResponse.json({ error: "Backup generation failed: " + err.message }, { status: 500 });
  }
}
