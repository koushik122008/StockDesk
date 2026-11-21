import { NextResponse } from "next/server";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await ensureSqlitePragmas();
    const body = await req.json();

    for (const [key, val] of Object.entries(body)) {
      if (typeof val === "string") {
        await prisma.setting.upsert({
          where: { key },
          create: { key, value: val },
          update: { value: val },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
