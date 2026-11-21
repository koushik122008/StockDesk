"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Printer,
  FileSpreadsheet,
  Download,
  Filter,
  Building2,
  Boxes,
} from "lucide-react";
import { formatPaise, formatIST } from "@/lib/money";

interface PrintStockReportProps {
  initialProducts: any[];
  categories: any[];
  brands: any[];
  retailers: any[];
  shopSettings: Record<string, string>;
  operatorName: string;
}

export function PrintStockReport({
  initialProducts,
  categories,
  brands,
  retailers,
  shopSettings,
  operatorName,
}: PrintStockReportProps) {
  const [groupByRetailer, setGroupByRetailer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedRetailer, setSelectedRetailer] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");

  const shopName = shopSettings["shop_name"] || "StockDesk Computer Peripherals";
  const shopTagline = shopSettings["shop_tagline"] || "Wholesale & Retail Peripherals Hub";
  const shopAddress = shopSettings["shop_address"] || "Shop #14, IT Plaza, Commercial Street";
  const shopCity = shopSettings["shop_city"] || "Bengaluru, Karnataka 560001";
  const shopGstin = shopSettings["shop_gstin"] || "29ABCDE1234F1Z5";
  const shopPhone = shopSettings["shop_phone"] || "+91 80 4123 4567";
  const shopEmail = shopSettings["shop_email"] || "billing@stockdesk.local";

  const currentDateIST = formatIST(new Date(), true);

  // Filter products based on current settings
  const filtered = initialProducts.filter((p) => {
    const isOut = p.quantity === 0;

    if (selectedCategory !== "ALL" && p.categoryId !== selectedCategory) return false;
    if (selectedBrand !== "ALL" && p.brandId !== selectedBrand) return false;

    if (selectedRetailer !== "ALL") {
      const hasRetailer = p.retailers?.some((rel: any) => rel.retailerId === selectedRetailer);
      if (!hasRetailer) return false;
    }

    if (selectedStatus === "OUT_OF_STOCK" && !isOut) return false;
    if (selectedStatus === "IN_STOCK" && isOut) return false;

    return true;
  });

  // Calculate summary totals (Cost valuation only, selling price removed)
  let totalUnits = 0;
  let totalCostPaise = 0;
  let outCount = 0;

  for (const p of filtered) {
    totalUnits += p.quantity;
    totalCostPaise += p.quantity * p.purchasePricePaise;
    if (p.quantity === 0) outCount++;
  }

  // Export to Excel (.xlsx) with ALL required distributor columns
  const handleExportExcel = () => {
    const rows = filtered.map((p, idx) => {
      const isOut = p.quantity === 0;
      const statusStr = isOut ? "Out of Stock" : "In Stock";
      const primaryRel = p.retailers?.find((r: any) => r.isPrimary) || p.retailers?.[0];
      const ret = primaryRel?.retailer;

      return {
        "S.No": idx + 1,
        "SKU": p.sku,
        "Product Name": p.name,
        "Brand": p.brand?.name || "",
        "Model": p.model,
        "Category": p.category?.name || "",
        "Qty on Hand": p.quantity,
        "Status": statusStr,
        "Purchase Cost (₹)": p.purchasePricePaise / 100,
        "Total Stock Valuation (₹)": (p.quantity * p.purchasePricePaise) / 100,
        "Rack Location": p.rackLocation || "General",
        "Distributor Name": ret?.name || "Unassigned",
        "Contact Person": ret?.contactPerson || "",
        "Distributor Phone": ret?.phone || "",
        "Distributor Email": ret?.email || "",
        "Distributor City": ret?.city || "",
        "Distributor GSTIN": ret?.gstin || "",
        "Last Purchase Date": primaryRel?.lastPurchaseDate
          ? formatIST(primaryRel.lastPurchaseDate, false)
          : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Report");
    XLSX.writeFile(
      workbook,
      `StockDesk_Stock_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "S.No",
      "SKU",
      "Product Name",
      "Brand",
      "Model",
      "Category",
      "Qty on Hand",
      "Status",
      "Purchase Cost (INR)",
      "Total Stock Valuation (INR)",
      "Rack Location",
      "Distributor Name",
      "Contact Person",
      "Distributor Phone",
      "Distributor Email",
      "Distributor City",
      "Distributor GSTIN",
      "Last Purchase Date",
    ];

    const csvRows = filtered.map((p, idx) => {
      const isOut = p.quantity === 0;
      const statusStr = isOut ? "Out of Stock" : "In Stock";
      const primaryRel = p.retailers?.find((r: any) => r.isPrimary) || p.retailers?.[0];
      const ret = primaryRel?.retailer;

      return [
        idx + 1,
        `"${p.sku}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.brand?.name || ""}"`,
        `"${p.model}"`,
        `"${p.category?.name || ""}"`,
        p.quantity,
        `"${statusStr}"`,
        (p.purchasePricePaise / 100).toFixed(2),
        ((p.quantity * p.purchasePricePaise) / 100).toFixed(2),
        `"${p.rackLocation || ""}"`,
        `"${(ret?.name || "").replace(/"/g, '""')}"`,
        `"${ret?.contactPerson || ""}"`,
        `"${ret?.phone || ""}"`,
        `"${ret?.email || ""}"`,
        `"${ret?.city || ""}"`,
        `"${ret?.gstin || ""}"`,
        `"${primaryRel?.lastPurchaseDate ? formatIST(primaryRel.lastPurchaseDate, false) : "-"}"`,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `StockDesk_Stock_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grouped by retailer structure helper
  const groupedData: Record<string, { retailer: any; products: any[] }> = {};
  if (groupByRetailer) {
    for (const p of filtered) {
      const primaryRel = p.retailers?.find((r: any) => r.isPrimary) || p.retailers?.[0];
      const retId = primaryRel?.retailer?.id || "unassigned";
      if (!groupedData[retId]) {
        groupedData[retId] = {
          retailer: primaryRel?.retailer || {
            name: "Unassigned Distributor",
            contactPerson: "N/A",
            phone: "-",
            email: "-",
            city: "-",
            gstin: "-",
          },
          products: [],
        };
      }
      groupedData[retId].products.push(p);
    }
  }

  return (
    <div className="space-y-6">
      {/* On-screen Toolbar & Controls (Hidden during A4 printing) */}
      <div className="no-print p-4 rounded-xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              <span>Print Stock &amp; Distributor Report</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              A4 Landscape print stylesheet &bull; Repeating table headers on every page &bull; Complete distributor contact details
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Report</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-muted-foreground font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background font-medium"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRetailer}
              onChange={(e) => setSelectedRetailer(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background font-medium"
            >
              <option value="ALL">All Distributors</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background font-medium"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="OUT_OF_STOCK">Out of Stock Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 font-semibold text-foreground cursor-pointer bg-muted px-3 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={groupByRetailer}
                onChange={(e) => setGroupByRetailer(e.target.checked)}
                className="rounded border-input text-primary"
              />
              <span>Group by Distributor</span>
            </label>
          </div>
        </div>
      </div>

      {/* Printable Area - Designed for A4 Landscape with repeating <thead> */}
      <div className="printable-area bg-card border border-border rounded-xl p-6 sm:p-8 shadow-md">
        {/* Printable Report Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
                {shopName}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">{shopTagline}</p>
              <div className="text-xs text-muted-foreground mt-1">
                {shopAddress}, {shopCity}
              </div>
              <div className="text-xs font-mono mt-0.5">
                <span className="font-semibold text-foreground">GSTIN:</span> {shopGstin} &bull;{" "}
                <span className="font-semibold text-foreground">Phone:</span> {shopPhone} &bull;{" "}
                <span className="font-semibold text-foreground">Email:</span> {shopEmail}
              </div>
            </div>

            <div className="text-left sm:text-right text-xs">
              <div className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold uppercase tracking-wider text-xs mb-1">
                CURRENT STOCK &amp; DISTRIBUTOR AUDIT REPORT
              </div>
              <div className="text-muted-foreground">
                Generated: <strong className="text-foreground">{currentDateIST} (IST)</strong>
              </div>
              <div className="text-muted-foreground">
                Operator: <strong className="text-foreground">{operatorName}</strong>
              </div>
              {groupByRetailer && (
                <div className="text-[11px] text-primary font-semibold mt-0.5">
                  Mode: Grouped by Distributor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Case 1: Standard Table (Not Grouped) with All Required Retailer Columns On Every Row */}
        {!groupByRetailer ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-400 bg-muted/60 text-foreground font-bold">
                  <th className="p-1.5 text-center">#</th>
                  <th className="p-1.5 font-mono">SKU</th>
                  <th className="p-1.5">Product Name</th>
                  <th className="p-1.5">Brand / Model</th>
                  <th className="p-1.5">Category</th>
                  <th className="p-1.5 text-center">Qty</th>
                  <th className="p-1.5">Status</th>
                  <th className="p-1.5 text-right">Cost Rate (₹)</th>
                  <th className="p-1.5 text-right">Stock Valuation (₹)</th>
                  <th className="p-1.5">Location</th>
                  {/* REQUIRED DISTRIBUTOR COLUMNS ON EVERY ROW */}
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">Distributor</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">Contact Person</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">Phone</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">Email</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">City</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20 font-mono">GSTIN</th>
                  <th className="p-1.5 bg-blue-50/50 dark:bg-blue-950/20">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-muted-foreground">
                      No stock items found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const isOut = p.quantity === 0;
                    const primaryRel = p.retailers?.find((r: any) => r.isPrimary) || p.retailers?.[0];
                    const ret = primaryRel?.retailer;

                    return (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="p-1.5 text-center font-mono text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 font-mono font-bold text-foreground">{p.sku}</td>
                        <td className="p-1.5 font-semibold text-foreground">{p.name}</td>
                        <td className="p-1.5">
                          {p.brand?.name} &bull; {p.model}
                        </td>
                        <td className="p-1.5 text-muted-foreground">{p.category?.name}</td>
                        <td className="p-1.5 text-center font-bold text-foreground">
                          {p.quantity}
                        </td>
                        <td className="p-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isOut
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            }`}
                          >
                            {isOut ? "Out of Stock" : "In Stock"}
                          </span>
                        </td>
                        <td className="p-1.5 text-right font-mono">
                          {formatPaise(p.purchasePricePaise)}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold">
                          {formatPaise(p.quantity * p.purchasePricePaise)}
                        </td>
                        <td className="p-1.5 font-mono text-[10px]">{p.rackLocation || "-"}</td>

                        {/* Retailer Details on EVERY ROW */}
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10 font-semibold text-foreground">
                          {ret?.name || "Unassigned"}
                        </td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10">
                          {ret?.contactPerson || "-"}
                        </td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10 font-mono text-[10px]">
                          {ret?.phone || "-"}
                        </td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10 text-[10px]">
                          {ret?.email || "-"}
                        </td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10">{ret?.city || "-"}</td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10 font-mono text-[10px]">
                          {ret?.gstin || "-"}
                        </td>
                        <td className="p-1.5 bg-blue-50/30 dark:bg-blue-950/10 text-[10px]">
                          {primaryRel?.lastPurchaseDate
                            ? formatIST(primaryRel.lastPurchaseDate, false)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Case 2: Group by Retailer with distinct Contact Block Header */
          <div className="space-y-6">
            {Object.entries(groupedData).map(([rId, group]) => {
              const r = group.retailer;
              const rUnits = group.products.reduce((acc, p) => acc + p.quantity, 0);
              const rValuation = group.products.reduce(
                (acc, p) => acc + p.quantity * p.purchasePricePaise,
                0
              );

              return (
                <div key={rId} className="border border-border rounded-xl overflow-hidden">
                  {/* Retailer Contact Block Header */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-3.5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span>{r.name}</span>
                        {r.city && <span className="text-xs text-muted-foreground">({r.city})</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Contact: <strong>{r.contactPerson}</strong> &bull; Phone:{" "}
                        <strong className="font-mono">{r.phone}</strong> &bull; Email:{" "}
                        <strong>{r.email}</strong> &bull; GSTIN:{" "}
                        <strong className="font-mono">{r.gstin}</strong>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>
                        Units Supplied: <strong>{rUnits}</strong>
                      </div>
                      <div>
                        Stock Valuation: <strong>{formatPaise(rValuation)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Peripherals Table for this Retailer */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-foreground font-semibold">
                          <th className="p-1.5 text-center">#</th>
                          <th className="p-1.5 font-mono">SKU</th>
                          <th className="p-1.5">Product</th>
                          <th className="p-1.5">Category</th>
                          <th className="p-1.5 text-center">Qty</th>
                          <th className="p-1.5">Status</th>
                          <th className="p-1.5 text-right">Cost Rate (₹)</th>
                          <th className="p-1.5 text-right">Valuation (₹)</th>
                          <th className="p-1.5">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.products.map((p, idx) => {
                          const isOut = p.quantity === 0;

                          return (
                            <tr key={p.id}>
                              <td className="p-1.5 text-center font-mono text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 font-mono font-bold">{p.sku}</td>
                              <td className="p-1.5 font-semibold">
                                {p.name} <span className="text-[10px] text-muted-foreground font-normal">({p.model})</span>
                              </td>
                              <td className="p-1.5 text-muted-foreground">{p.category?.name}</td>
                              <td className="p-1.5 text-center font-bold">{p.quantity}</td>
                              <td className="p-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isOut ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {isOut ? "Out of Stock" : "In Stock"}
                                </span>
                              </td>
                              <td className="p-1.5 text-right font-mono">
                                {formatPaise(p.purchasePricePaise)}
                              </td>
                              <td className="p-1.5 text-right font-mono font-bold">
                                {formatPaise(p.quantity * p.purchasePricePaise)}
                              </td>
                              <td className="p-1.5 font-mono text-[10px]">{p.rackLocation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Summary Totals */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 dark:border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-muted/40 p-4 rounded-xl border border-border">
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Peripherals (SKUs):</span>
              <span className="text-base font-bold text-foreground">{filtered.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Physical Units:</span>
              <span className="text-base font-bold text-foreground">{totalUnits}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Stock Cost Valuation:</span>
              <span className="text-base font-bold text-foreground font-mono">
                {formatPaise(totalCostPaise)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Out of Stock Models:</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                {outCount} items
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
