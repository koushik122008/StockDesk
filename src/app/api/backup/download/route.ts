import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");

    let targetPath = path.resolve(process.cwd(), "data", "stockdesk.db");
    let downloadName = `stockdesk_${new Date().toISOString().split("T")[0]}.db`;

    if (fileName) {
      const backupDir = path.resolve(process.cwd(), "data", "backups");
      const requestedPath = path.join(backupDir, path.basename(fileName));
      if (fs.existsSync(requestedPath)) {
        targetPath = requestedPath;
        downloadName = path.basename(fileName);
      }
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    return new Response(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
