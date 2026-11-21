"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  AlertOctagon,
  SlidersHorizontal,
  Download,
  Search,
  ShoppingCart,
  ScanLine,
  X,
  Check,
  Package,
} from "lucide-react";
import { formatPaise, formatIST } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface MovementsClientProps {
  initialMovements: any[];
  products: any[];
  filterProductId?: string;
}

export function MovementsClient({
  initialMovements,
  products,
  filterProductId,
}: MovementsClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [movements, setMovements] = useState<any[]>(initialMovements);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<string>(filterProductId || "ALL");
  const [search, setSearch] = useState("");

  // Quick Sale modal
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [saleProductId, setSaleProductId] = useState(products[0]?.id || "");
  const [saleQty, setSaleQty] = useState(1);
  const [saleReason, setSaleReason] = useState("Walk-in customer counter sale");
  const [isSaleSubmitting, setIsSaleSubmitting] = useState(false);

  // Return / Adjustment modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"RETURN_RMA" | "DAMAGED" | "ADJUSTMENT">("RETURN_RMA");
  const [adjustProductId, setAdjustProductId] = useState(products[0]?.id || "");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === saleProductId);
    if (!prod) return;

    if (saleQty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (prod.quantity < saleQty) {
      toast.error(`Insufficient stock! Only ${prod.quantity} units available.`);
      return;
    }

    setIsSaleSubmitting(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: saleProductId,
          quantityChange: -saleQty,
          type: "SALE",
          reason: saleReason || "Counter sale",
          referenceType: "QUICK_SALE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sale recording failed");
      }

      toast.success(`Sale recorded! Sold ${saleQty} unit(s) of ${prod.name}`);
      setIsQuickSaleOpen(false);
      router.refresh();
      // Reload
      const reload = await fetch("/api/movements");
      if (reload.ok) {
        const d = await reload.json();
        setMovements(d.movements || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    } finally {
      setIsSaleSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === adjustProductId);
    if (!prod) return;

    const delta = adjustType === "DAMAGED" ? -Math.abs(adjustQty) : Math.abs(adjustQty);

    setIsAdjustSubmitting(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProductId,
          quantityChange: delta,
          type: adjustType,
          reason: adjustReason || `${adjustType} recorded`,
          referenceType: adjustType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record movement");
      }

      toast.success(`Recorded ${adjustType} for ${prod.name}`);
      setIsAdjustModalOpen(false);
      router.refresh();
      const reload = await fetch("/api/movements");
      if (reload.ok) {
        const d = await reload.json();
        setMovements(d.movements || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record adjustment");
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  const filtered = movements.filter((m) => {
    if (selectedType !== "ALL" && m.type !== selectedType) return false;
    if (selectedProduct !== "ALL" && m.productId !== selectedProduct) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        m.product?.name.toLowerCase().includes(q) ||
        m.product?.sku.toLowerCase().includes(q) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      "Timestamp (IST)",
      "SKU",
      "Product Name",
      "Movement Type",
      "Quantity Change",
      "Previous Stock",
      "New Stock",
      "Unit Cost (INR)",
      "Reference",
      "Reason",
      "Staff Operator",
    ];

    const rows = filtered.map((m) => [
      `"${formatIST(m.createdAt)}"`,
      `"${m.product?.sku || ""}"`,
      `"${(m.product?.name || "").replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantityChange,
      m.previousQuantity,
      m.newQuantity,
      m.unitPricePaise ? (m.unitPricePaise / 100).toFixed(2) : "-",
      `"${m.referenceType || ""}: ${m.referenceId || ""}"`,
      `"${(m.reason || "").replace(/"/g, '""')}"`,
      `"${m.user?.name || "System"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `StockDesk_Movements_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            <span>Stock Movements &amp; Counter Sales</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Append-only audit trail of every unit received, sold, returned, or adjusted
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>RMA / Damage Write-off</span>
          </button>

          <button
            onClick={() => setIsQuickSaleOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Quick Counter Sale</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movements by peripheral name, SKU, invoice no, or reason..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-input bg-background font-medium"
            >
              <option value="ALL">All Movement Types</option>
              <option value="PURCHASE">Purchase / Stock In</option>
              <option value="SALE">Sale (Retail / Counter)</option>
              <option value="RETURN_RMA">Customer Return (RMA)</option>
              <option value="DAMAGED">Damaged / Write-off</option>
              <option value="ADJUSTMENT">Inventory Adjustment</option>
            </select>

            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-input bg-background font-medium max-w-xs truncate"
            >
              <option value="ALL">All Peripherals</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Date &amp; Time (IST)</th>
                <th className="py-3 px-4">Peripheral</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Change</th>
                <th className="py-3 px-4 text-right">Count (Before &rarr; After)</th>
                <th className="py-3 px-4">Reference &amp; Reason</th>
                <th className="py-3 px-4">Staff Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No movements match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {formatIST(m.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {m.product?.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {m.product?.sku}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === "PURCHASE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : m.type === "SALE"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                              : m.type === "DAMAGED"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                              : m.type === "RETURN_RMA"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {isPositive ? "+" : ""}
                          {m.quantityChange}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {m.previousQuantity} &rarr;{" "}
                        <strong className="text-foreground">{m.newQuantity}</strong>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-foreground">{m.reason || "Manual update"}</div>
                        {m.referenceId && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {m.referenceType}: {m.referenceId}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {m.user?.name || "System"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Counter Sale Modal */}
      {isQuickSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-emerald-500/10">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <span>Quick Counter Sale</span>
              </div>
              <button
                onClick={() => setIsQuickSaleOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSaleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Select Peripheral</label>
                <select
                  value={saleProductId}
                  onChange={(e) => setSaleProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity}) &bull; {formatPaise(p.sellingPricePaise)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Units Sold</label>
                <input
                  type="number"
                  min="1"
                  value={saleQty}
                  onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 font-bold rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Sale Note / Receipt</label>
                <input
                  type="text"
                  value={saleReason}
                  onChange={(e) => setSaleReason(e.target.value)}
                  placeholder="e.g. Counter Sale - Cash"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSaleOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaleSubmitting}
                  className="px-5 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {isSaleSubmitting ? "Recording..." : "Confirm Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return / Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="font-bold text-sm text-foreground">Record RMA or Damaged Stock</div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Movement Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="RETURN_RMA">Customer Return (RMA - Stock +)</option>
                  <option value="DAMAGED">Damaged / Faulty Write-off (Stock -)</option>
                  <option value="ADJUSTMENT">Inventory Audit Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Peripheral</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 font-bold rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Reason / RMA Details</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Defective left click switch - returned for replacement"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustSubmitting}
                  className="px-5 py-2 font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                >
                  {isAdjustSubmitting ? "Submitting..." : "Save Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
