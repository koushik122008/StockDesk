import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function POST() {
  try {
    await ensureSqlitePragmas();
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
