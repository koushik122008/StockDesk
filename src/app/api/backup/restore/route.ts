import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Admin only security check
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Admin users can restore database backups" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const backupFile = formData.get("file") as File | null;

    if (!backupFile) {
      return NextResponse.json({ error: "No backup file uploaded" }, { status: 400 });
    }

    const bytes = await backupFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify it looks like an SQLite database (SQLite header check "SQLite format 3")
    const header = buffer.subarray(0, 16).toString();
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json(
        { error: "Invalid backup file: Not a valid SQLite database" },
        { status: 400 }
      );
    }

    // Disconnect Prisma before file swap
    await prisma.$disconnect();

    const dbPath = path.resolve(process.cwd(), "data", "stockdesk.db");
    const walPath = path.resolve(process.cwd(), "data", "stockdesk.db-wal");
    const shmPath = path.resolve(process.cwd(), "data", "stockdesk.db-shm");

    // Remove WAL/SHM locks
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch (e) {}
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch (e) {}
    }

    // Overwrite SQLite database
    fs.writeFileSync(dbPath, buffer);

    // Re-connect and enforce PRAGMAs
    await ensureSqlitePragmas();

    // Check row count in restored DB to return verification metrics
    const productCount = await prisma.product.count();
    const retailerCount = await prisma.retailer.count();
    const movementCount = await prisma.stockMovement.count();

    return NextResponse.json({
      success: true,
      message: "Database successfully restored from backup!",
      metrics: {
        productCount,
        retailerCount,
        movementCount,
      },
    });
  } catch (err: any) {
    console.error("Restore failed:", err);
    return NextResponse.json(
      { error: "Database restore failed: " + err.message },
      { status: 500 }
    );
  }
}
