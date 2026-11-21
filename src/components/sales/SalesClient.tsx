"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  X,
  Package,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ArrowDownRight,
  TrendingDown,
} from "lucide-react";
import { formatIST } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";

interface SalesClientProps {
  initialSales: any[];
  products: any[];
  currentUser?: { name: string; email: string; role: string } | null;
}

export function SalesClient({
  initialSales,
  products,
  currentUser,
}: SalesClientProps) {
  const { toast } = useToast();
  const [salesList, setSalesList] = useState<any[]>(initialSales);
  const [availableProducts, setAvailableProducts] = useState<any[]>(products);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // New Sale Modal state
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(
    products.find((p) => p.quantity > 0)?.id || products[0]?.id || ""
  );
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleNotes, setSaleNotes] = useState("Counter sale");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);

  // Filter sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

    return salesList.filter((item) => {
      // Date filter
      const itemTime = new Date(item.createdAt).getTime();
      if (dateFilter === "TODAY" && itemTime < todayStart) return false;
      if (dateFilter === "WEEK" && itemTime < sevenDaysAgo) return false;
      if (dateFilter === "MONTH" && itemTime < thirtyDaysAgo) return false;

      // Category filter
      if (
        categoryFilter !== "ALL" &&
        item.product?.categoryId !== categoryFilter &&
        item.product?.category?.name !== categoryFilter
      ) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const prodName = item.product?.name?.toLowerCase() || "";
        const sku = item.product?.sku?.toLowerCase() || "";
        const model = item.product?.model?.toLowerCase() || "";
        const refId = item.referenceId?.toLowerCase() || "";
        const reason = item.reason?.toLowerCase() || "";
        const seller = item.user?.name?.toLowerCase() || "";

        return (
          prodName.includes(query) ||
          sku.includes(query) ||
          model.includes(query) ||
          refId.includes(query) ||
          reason.includes(query) ||
          seller.includes(query)
        );
      }

      return true;
    });
  }, [salesList, search, dateFilter, categoryFilter]);

  // Metrics
  const totalUnitsSold = useMemo(() => {
    return salesList.reduce((acc, s) => acc + Math.abs(s.quantityChange), 0);
  }, [salesList]);

  const todayUnitsSold = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return salesList
      .filter((s) => new Date(s.createdAt).getTime() >= todayStart)
      .reduce((acc, s) => acc + Math.abs(s.quantityChange), 0);
  }, [salesList]);

  const uniqueProductsSoldCount = useMemo(() => {
    const ids = new Set(salesList.map((s) => s.productId));
    return ids.size;
  }, [salesList]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of availableProducts) {
      if (p.category) {
        map.set(p.category.id, p.category.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableProducts]);

  // Record Sale Handler
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    if (saleQuantity <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (saleQuantity > selectedProduct.quantity) {
      toast.error(
        `Insufficient stock! Only ${selectedProduct.quantity} units available.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: saleQuantity,
          customerName,
          customerPhone,
          invoiceNo: invoiceNo || `SALE-${Date.now().toString().slice(-6)}`,
          notes: saleNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record sale");
      }

      toast.success(data.message || `Sold ${saleQuantity} units!`);

      // Update local state
      setSalesList([data.movement, ...salesList]);
      setAvailableProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProductId
            ? { ...p, quantity: p.quantity - saleQuantity }
            : p
        )
      );

      // Reset form
      setSaleQuantity(1);
      setCustomerName("");
      setCustomerPhone("");
      setInvoiceNo("");
      setSaleNotes("Counter sale");
      setIsSaleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export of Sold Products
  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      toast.error("No sales records to export");
      return;
    }

    const headers = [
      "Date (IST)",
      "Product Name",
      "Model",
      "SKU",
      "Category",
      "Units Sold",
      "Invoice / Ref",
      "Customer & Notes",
      "Sold By",
    ];

    const rows = filteredSales.map((s) => [
      formatIST(s.createdAt, true),
      `"${s.product?.name || ""}"`,
      `"${s.product?.model || ""}"`,
      s.product?.sku || "",
      s.product?.category?.name || "",
      Math.abs(s.quantityChange),
      `"${s.referenceId || "Counter"}"`,
      `"${s.reason || ""}"`,
      `"${s.user?.name || "Staff"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `StockDesk_Sold_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sold products CSV exported!");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>Sales &amp; Sold Products</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record customer checkouts, deduct stock immediately, and track sold peripheral history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setIsSaleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
            <span>Total Units Sold</span>
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {totalUnitsSold.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Lifetime units dispatched
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
            <span>Sales Transactions</span>
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {salesList.length.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Total recorded sale entries
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
            <span>Sold Today</span>
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {todayUnitsSold.toLocaleString("en-IN")} units
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Counter sales since midnight
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-purple-500" />
            <span>Unique Products Sold</span>
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {uniqueProductsSoldCount}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Distinct peripheral models
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3 no-print">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by peripheral name, SKU, model, invoice, customer, or staff..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "WEEK", label: "This Week" },
              { id: "MONTH", label: "This Month" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  dateFilter === d.id
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sold Products Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Peripheral Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4">Invoice / Reference</th>
                <th className="py-3 px-4">Customer &amp; Notes</th>
                <th className="py-3 px-4 text-right">Sold By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-sm">No sales records found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use the &quot;Record New Sale&quot; button to record customer checkouts.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                      {formatIST(sale.createdAt, true)}
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground leading-snug">
                        {sale.product?.name || "Deleted Product"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-mono">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                          {sale.product?.sku}
                        </span>
                        {sale.product?.model && (
                          <span>Model: {sale.product.model}</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                        {sale.product?.category?.name || "Peripherals"}
                      </span>
                    </td>

                    {/* Units Sold */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>{Math.abs(sale.quantityChange)} units</span>
                      </span>
                    </td>

                    {/* Invoice / Ref */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {sale.referenceId ? (
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">
                          {sale.referenceId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">
                          Counter Sale
                        </span>
                      )}
                    </td>

                    {/* Notes / Customer */}
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                      {sale.reason || "Walk-in purchase"}
                    </td>

                    {/* Sold By */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                        <User className="w-3 h-3 text-primary" />
                        <span>{sale.user?.name || "Staff"}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <div>
            Showing <strong className="text-foreground">{filteredSales.length}</strong> sales entries
          </div>
          <div>
            Total units sold in filter:{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {filteredSales.reduce((acc, s) => acc + Math.abs(s.quantityChange), 0)} units
            </strong>
          </div>
        </div>
      </div>

      {/* Record New Sale Modal */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <span>Sell Stock / Record Customer Sale</span>
              </h3>
              <button
                onClick={() => setIsSaleModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSale} className="space-y-4 text-xs">
              {/* Product Picker */}
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Select Peripheral <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSaleQuantity(1);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-medium"
                >
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                      {p.name} ({p.sku}) &bull; Stock: {p.quantity} {p.quantity <= 0 ? "(OUT OF STOCK)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Stock Badge & Quantity Input */}
              {selectedProduct && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">
                      Current Available Stock
                    </span>
                    <span
                      className={`text-sm font-black ${
                        selectedProduct.quantity > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600"
                      }`}
                    >
                      {selectedProduct.quantity} units available
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block text-right">
                      Rack Location
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {selectedProduct.rackLocation || "General"}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity to Sell */}
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Quantity to Sell <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct?.quantity || 1}
                    required
                    value={saleQuantity}
                    onChange={(e) =>
                      setSaleQuantity(
                        Math.max(
                          1,
                          Math.min(
                            selectedProduct?.quantity || 9999,
                            parseInt(e.target.value) || 1
                          )
                        )
                      )
                    }
                    className="w-32 px-3 py-2 rounded-lg border border-input bg-background text-foreground font-bold text-center text-sm"
                  />
                  <span className="text-muted-foreground text-xs">
                    (Max: {selectedProduct?.quantity || 0} units)
                  </span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Chandra"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Customer Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono"
                  />
                </div>
              </div>

              {/* Invoice / Reference Number */}
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Invoice / Bill / Receipt No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-0042 (Auto-generated if left blank)"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Sale Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Walk-in counter cash sale"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsSaleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !selectedProduct ||
                    selectedProduct.quantity < saleQuantity ||
                    selectedProduct.quantity <= 0
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 shadow-sm transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isSubmitting ? "Processing..." : "Confirm & Sell Stock"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
