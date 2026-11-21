"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Mail,
  FileText,
  Printer,
  Building2,
  PackageX,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { formatPaise } from "@/lib/money";

interface LowStockClientProps {
  initialItems: any[];
}

export function LowStockClient({ initialItems }: LowStockClientProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("ALL");

  // Extract unique retailers from low-stock items
  const retailerMap = new Map<string, string>();
  for (const item of items) {
    const r = item.retailers?.find((rel: any) => rel.isPrimary)?.retailer || item.retailers?.[0]?.retailer;
    if (r) retailerMap.set(r.id, r.name);
  }

  const filtered = items.filter((p) => {
    if (selectedRetailer === "ALL") return true;
    const r = p.retailers?.find((rel: any) => rel.isPrimary)?.retailer || p.retailers?.[0]?.retailer;
    return r?.id === selectedRetailer;
  });

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>Low Stock Reorder Hub</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Peripherals below reorder levels &bull; Direct 1-click supplier contact via Phone, WhatsApp &amp; Email
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/reports?type=reorder"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Print Reorder Sheet</span>
          </Link>
          <Link
            href="/purchase-orders?action=new-from-low"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Purchase Orders</span>
          </Link>
        </div>
      </div>

      {/* Filter by Distributor */}
      {retailerMap.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl text-xs">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground">Filter by Distributor:</span>
          <select
            value={selectedRetailer}
            onChange={(e) => setSelectedRetailer(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-input bg-background text-foreground"
          >
            <option value="ALL">All Distributors ({items.length} items)</option>
            {Array.from(retailerMap.entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Low Stock Items List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
          <h3 className="font-bold text-base text-foreground">Zero Low Stock Alerts!</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All computer peripherals are fully stocked above their minimum reorder thresholds.
          </p>
          <Link
            href="/stock"
            className="inline-block mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
          >
            View All Stock
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const threshold = item.minReorderLevel ?? item.category?.defaultReorderLevel ?? 5;
            const isOut = item.quantity === 0;
            const suggestedOrderQty = Math.max(1, threshold * 2 - item.quantity);
            const primaryRetailer =
              item.retailers?.find((r: any) => r.isPrimary)?.retailer || item.retailers?.[0]?.retailer;

            const phoneClean = primaryRetailer?.phone?.replace(/[^0-9]/g, "") || "";
            const waText = encodeURIComponent(
              `Hello ${primaryRetailer?.contactPerson || primaryRetailer?.name || "Supplier"}, this is StockDesk. Please supply ${suggestedOrderQty} units of ${item.name} (SKU: ${item.sku}) at your earliest. Thank you!`
            );
            const mailSubject = encodeURIComponent(
              `Purchase Reorder Request: ${item.name} (SKU: ${item.sku})`
            );
            const mailBody = encodeURIComponent(
              `Dear ${primaryRetailer?.contactPerson || primaryRetailer?.name},\n\nPlease quote and dispatch the following reorder for our computer peripherals shop:\n\nProduct: ${item.name}\nSKU: ${item.sku}\nModel: ${item.model}\nRequested Quantity: ${suggestedOrderQty} units\nLast Purchase Rate: ${formatPaise(item.purchasePricePaise)}\n\nThank you,\nStockDesk Procurement Team`
            );

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Product Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isOut
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      }`}
                    >
                      {isOut ? "Out of Stock" : "Low Stock"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-bold">
                      SKU: {item.sku}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.category?.name} &bull; {item.rackLocation}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-foreground">{item.name}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <div>
                      Current Stock:{" "}
                      <strong className={isOut ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}>
                        {item.quantity}
                      </strong>{" "}
                      / Min: <strong>{threshold}</strong>
                    </div>
                    <div>
                      Suggested Reorder:{" "}
                      <strong className="text-foreground">+{suggestedOrderQty} units</strong>
                    </div>
                    <div>
                      Est. Reorder Cost:{" "}
                      <strong className="text-foreground">
                        {formatPaise(suggestedOrderQty * item.purchasePricePaise)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Distributor Contact Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  {primaryRetailer ? (
                    <div className="flex flex-col items-start sm:items-end text-left sm:text-right pr-2">
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <Link
                          href={`/retailers/${primaryRetailer.id}`}
                          className="hover:underline hover:text-primary"
                        >
                          {primaryRetailer.name}
                        </Link>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {primaryRetailer.contactPerson} &bull; {primaryRetailer.city}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic mr-2">
                      No distributor linked
                    </span>
                  )}

                  {primaryRetailer && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Call Button */}
                      <a
                        href={`tel:${phoneClean}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                        title={`Call ${primaryRetailer.contactPerson} at ${primaryRetailer.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Call</span>
                      </a>

                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/${phoneClean}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                        title="Send WhatsApp Reorder Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      {/* Email Button */}
                      <a
                        href={`mailto:${primaryRetailer.email}?subject=${mailSubject}&body=${mailBody}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                        title={`Email ${primaryRetailer.email}`}
                      >
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden sm:inline">Email</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
