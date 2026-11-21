import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Skip internal/loopback and non-IPv4
        if (!iface.internal && iface.family === "IPv4") {
          addresses.push(iface.address);
        }
      }
    }

    const hostIp = addresses[0] || "127.0.0.1";
    const port = process.env.PORT || "3000";
    const networkUrl = `http://${hostIp}:${port}`;

    return NextResponse.json({
      hostIp,
      port,
      networkUrl,
      allIps: addresses,
    });
  } catch (err: any) {
    return NextResponse.json(
      { hostIp: "127.0.0.1", port: "3000", networkUrl: "http://localhost:3000", allIps: [] },
      { status: 200 }
    );
  }
}
