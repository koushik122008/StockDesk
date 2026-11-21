import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";
import QRCode from "qrcode";
import os from "os";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await ensureSqlitePragmas();
  const session = await getServerSession(authOptions);

  const [settings, products, allUsers] = await Promise.all([
    prisma.setting.findMany(),
    prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        sellingPricePaise: true,
        purchasePricePaise: true,
        warrantyMonths: true,
        purchaseDate: true,
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  // Get Host Local Network IP
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === "IPv4") {
        addresses.push(iface.address);
      }
    }
  }

  const hostIp = addresses[0] || "127.0.0.1";
  const port = process.env.PORT || "3000";
  const networkUrl = `http://${hostIp}:${port}`;

  // Generate QR code data URL
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(networkUrl, {
      width: 260,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
  }

  // Check warranty items expiring in 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const warrantyExpiringItems = products.filter((p) => {
    if (!p.purchaseDate || !p.warrantyMonths) return false;
    const expiry = new Date(p.purchaseDate);
    expiry.setMonth(expiry.getMonth() + p.warrantyMonths);
    return expiry >= now && expiry <= thirtyDaysFromNow;
  });

  return (
    <div className="space-y-6">
      <SettingsClient
        initialSettings={settingsMap}
        networkUrl={networkUrl}
        hostIp={hostIp}
        port={port}
        qrCodeDataUrl={qrCodeDataUrl}
        userRole={(session?.user as any)?.role || "STAFF"}
        currentUser={
          session?.user
            ? {
                id: (session.user as any).id,
                name: session.user.name || "",
                email: session.user.email || "",
                role: (session.user as any).role || "STAFF",
              }
            : null
        }
        initialUsers={allUsers.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        products={products}
        warrantyExpiringItems={warrantyExpiringItems}
      />
    </div>
  );
}
