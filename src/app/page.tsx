import React from "react";
import Link from "next/link";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { formatPaise, formatIST } from "@/lib/money";
import {
  Boxes,
  PackagePlus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  PackageX,
  Printer,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  ShoppingCart,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureSqlitePragmas();

  const totalProducts = await prisma.product.count({
    where: { deletedAt: null },
  });

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      brand: true,
      retailers: {
        where: { isPrimary: true },
        include: { retailer: true },
      },
    },
  });

  let totalUnits = 0;
  let totalCostPaise = 0;
  let outOfStockCount = 0;

  const outOfStockItems: typeof products = [];
  const categoryMap: Record<string, { name: string; count: number; valuePaise: number }> = {};

  for (const p of products) {
    totalUnits += p.quantity;
    totalCostPaise += p.quantity * p.purchasePricePaise;

    if (p.quantity === 0) {
      outOfStockCount++;
      outOfStockItems.push(p);
    }

    const catName = p.category?.name || "Other";
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, count: 0, valuePaise: 0 };
    }
    categoryMap[catName].count += p.quantity;
    categoryMap[catName].valuePaise += p.quantity * p.purchasePricePaise;
  }

  // Recent 8 stock movements
  const recentMovements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
  });

  // Check last backup setting
  const lastBackupSetting = await prisma.setting.findUnique({
    where: { key: "last_backup_at" },
  });

  const lastBackupDate = lastBackupSetting?.value
    ? new Date(lastBackupSetting.value)
    : null;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const backupStale = !lastBackupDate || lastBackupDate < threeDaysAgo;

  const categoryChartData = Object.values(categoryMap).map((c) => ({
    name: c.name,
    units: c.count,
    value: Math.round(c.valuePaise / 100),
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if Backup Stale */}
      {backupStale && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Backup Reminder:</span> No database backup
              has succeeded in the last 3 days! Protect your shop records.
            </div>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm"
          >
            Create Backup Now &rarr;
          </Link>
        </div>
      )}

      {/* Header and Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Inventory Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Host PC LAN Station &bull; All counts synchronized in real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Print Stock Report (P)</span>
          </Link>
          <Link
            href="/stock/add"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Add Stock (N)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (Selling price and reorder threshold removed) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total SKUs</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground">{totalProducts}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Active models</div>
          </div>
        </div>

        {/* Total Physical Units */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Units</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground">{totalUnits}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Physical inventory
            </div>
          </div>
        </div>

        {/* Total Stock Cost Valuation */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Stock Cost Valuation</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-foreground truncate">
              {formatPaise(totalCostPaise)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Wholesale asset value
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {outOfStockCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Zero units on shelf
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <DashboardCharts categoryData={categoryChartData} />

      {/* Two Column Layout: Out of Stock Peripherals & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock Items */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <PackageX className="w-4 h-4 text-rose-500" />
              <h2 className="font-bold text-sm text-foreground">
                Out of Stock Peripherals ({outOfStockItems.length})
              </h2>
            </div>
            <Link
              href="/stock"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All Stock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px]">
            {outOfStockItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All computer peripherals currently have available units in stock.
              </div>
            ) : (
              outOfStockItems.map((item) => {
                const primaryRet = item.retailers?.[0]?.retailer;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border/80 bg-background hover:border-primary/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-foreground">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{item.sku}</span>
                        <span>&bull;</span>
                        <span>{primaryRet ? primaryRet.name : "No distributor"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                        0 Units
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Stock Movements Stream */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="font-bold text-sm text-foreground">
                Recent Stock Movements
              </h2>
            </div>
            <Link
              href="/movements"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px]">
            {recentMovements.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent movements recorded.
              </div>
            ) : (
              recentMovements.map((m) => {
                const isPositive = m.quantityChange > 0;
                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-border/60 bg-background flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-md ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {m.product.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {m.type} &bull; {m.reason || "Manual update"} &bull;{" "}
                          {formatIST(m.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {m.quantityChange}
                      </span>
                      <div className="text-[10px] text-muted-foreground">
                        {m.newQuantity} left
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
