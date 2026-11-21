import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureSqlitePragmas();

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        product: {
          select: { id: true, name: true, sku: true, quantity: true, minReorderLevel: true },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
