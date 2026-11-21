"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  Edit2,
  History,
  Check,
  X,
  Search,
  Filter,
  PackagePlus,
  Printer,
  Building2,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { formatPaise, cn } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";

interface StockTableProps {
  initialProducts: any[];
  categories: any[];
  brands: any[];
  highlightId?: string;
}

export function StockTable({
  initialProducts,
  categories,
  brands,
  highlightId,
}: StockTableProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");

  // Inline editing state: { [productId]: number }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Quick Sell modal state
  const [sellingProduct, setSellingProduct] = useState<any | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellCustomer, setSellCustomer] = useState("");
  const [sellInvoice, setSellInvoice] = useState("");
  const [sellNotes, setSellNotes] = useState("Counter sale");
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // Filter products
  const filtered = products.filter((p) => {
    // Search match
    const q = search.toLowerCase().trim();
    if (q) {
      const match =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        p.model.toLowerCase().includes(q) ||
        p.rackLocation.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category match
    if (selectedCategory !== "ALL" && p.categoryId !== selectedCategory) {
      return false;
    }

    // Brand match
    if (selectedBrand !== "ALL" && p.brandId !== selectedBrand) {
      return false;
    }

    // Status match
    if (selectedStatus === "OUT_OF_STOCK" && p.quantity > 0) return false;
    if (selectedStatus === "IN_STOCK" && p.quantity === 0) return false;

    return true;
  });

  const handleAdjustQuantity = async (product: any, delta: number) => {
    const prevQty = product.quantity;
    const newQty = Math.max(0, prevQty + delta);
    if (prevQty === newQty) return;

    // Optimistically update UI
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, quantity: newQty, version: item.version + 1 } : item
      )
    );

    // Call API
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantityChange: delta,
          type: delta > 0 ? "PURCHASE" : "SALE",
          reason: `Quick inline ${delta > 0 ? "+" : ""}${delta} adjustment`,
          version: product.version,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Rollback
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, quantity: prevQty } : item))
        );
        toast.error(errorData.error || "Failed to update quantity");
        return;
      }

      // Show Undo Toast!
      toast.undo(
        `Adjusted ${product.name} to ${newQty} units (${delta > 0 ? "+" : ""}${delta})`,
        async () => {
          // Revert action
          await fetch("/api/stock/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              quantityChange: -delta,
              type: "ADJUSTMENT",
              reason: `Undo inline adjustment back to ${prevQty}`,
            }),
          });
          setProducts((prev) =>
            prev.map((item) => (item.id === product.id ? { ...item, quantity: prevQty } : item))
          );
          toast.info(`Reverted ${product.name} back to ${prevQty} units`);
        }
      );
    } catch (err: any) {
      // Rollback
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? { ...item, quantity: prevQty } : item))
      );
      toast.error(err.message || "Failed to update stock");
    }
  };

  const handleSaveInlineEdit = async (product: any) => {
    const parsed = parseInt(editValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid non-negative number");
      return;
    }

    const prevQty = product.quantity;
    const delta = parsed - prevQty;
    if (delta === 0) {
      setEditingId(null);
      return;
    }

    setEditingId(null);
    await handleAdjustQuantity(product, delta);
  };

  const handleQuickSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingProduct) return;

    if (sellQuantity <= 0) {
      toast.error("Please enter a valid quantity to sell");
      return;
    }

    if (sellQuantity > sellingProduct.quantity) {
      toast.error(`Only ${sellingProduct.quantity} unit(s) available in stock`);
      return;
    }

    setIsSubmittingSale(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: sellingProduct.id,
          quantity: sellQuantity,
          customerName: sellCustomer,
          invoiceNo: sellInvoice || `INV-${Date.now().toString().slice(-6)}`,
          notes: sellNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sale failed");
      }

      toast.success(
        `Sold ${sellQuantity} unit(s) of ${sellingProduct.name}! New stock: ${
          sellingProduct.quantity - sellQuantity
        }`
      );

      // Update table state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === sellingProduct.id
            ? { ...p, quantity: p.quantity - sellQuantity, version: (p.version || 0) + 1 }
            : p
        )
      );

      setSellingProduct(null);
      setSellQuantity(1);
      setSellCustomer("");
      setSellInvoice("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by peripheral name, SKU, model, rack location..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/sales"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Sales &amp; Sold Log</span>
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Print Stock Report</span>
            </Link>
            <Link
              href="/stock/add"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock</span>
            </Link>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-foreground font-medium"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand Dropdown */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-input bg-background text-foreground font-medium"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Stock Status Pills (Reorder/Low stock removed) */}
          <div className="flex items-center gap-1 ml-auto">
            {(
              [
                { label: "All Items", val: "ALL" },
                { label: "In Stock", val: "IN_STOCK" },
                { label: "Out of Stock", val: "OUT_OF_STOCK" },
              ] as const
            ).map((s) => (
              <button
                key={s.val}
                onClick={() => setSelectedStatus(s.val)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedStatus === s.val
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                <th className="py-3 px-4">SKU / Model</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Purchase Cost</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Primary Distributor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No computer peripherals match your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOut = p.quantity === 0;
                  const isHighlighted = highlightId === p.id;
                  const primaryRetailer = p.retailers?.find((r: any) => r.isPrimary)?.retailer;

                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors group",
                        isHighlighted && "bg-primary/10 border-l-4 border-primary"
                      )}
                    >
                      {/* SKU & Barcode */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-foreground">{p.sku}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-muted-foreground">{p.barcode}</div>
                        )}
                      </td>

                      {/* Product Name & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.brand?.name} &bull; {p.model}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {p.category?.name || "Peripheral"}
                      </td>

                      {/* Rack Location */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-0.5 rounded text-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {p.rackLocation || "General"}
                        </span>
                      </td>

                      {/* Purchase Cost (Selling price removed) */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {formatPaise(p.purchasePricePaise)}
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          Valuation: {formatPaise(p.quantity * p.purchasePricePaise)}
                        </span>
                      </td>

                      {/* Quantity & Inline +/- Buttons */}
                      <td className="py-3 px-4 text-center">
                        {editingId === p.id ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveInlineEdit(p);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              autoFocus
                              className="w-16 px-2 py-1 text-xs font-bold text-center border border-primary rounded bg-background"
                            />
                            <button
                              onClick={() => handleSaveInlineEdit(p)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            {/* Decrement Button */}
                            <button
                              onClick={() => handleAdjustQuantity(p, -1)}
                              disabled={p.quantity <= 0}
                              className="w-6 h-6 rounded border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground disabled:opacity-30 transition-colors"
                              title="Deduct 1 unit (Sale / Inward adjustment)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            {/* Clickable quantity number for direct typing */}
                            <button
                              onClick={() => {
                                setEditingId(p.id);
                                setEditValue(String(p.quantity));
                              }}
                              className="px-2 py-0.5 rounded font-bold font-mono text-xs hover:bg-muted transition-colors"
                              title="Click to type exact quantity"
                            >
                              {p.quantity}
                            </button>

                            {/* Increment Button */}
                            <button
                              onClick={() => handleAdjustQuantity(p, 1)}
                              className="w-6 h-6 rounded border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
                              title="Add 1 unit (Stock In)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status Badge (Reorder threshold removed) */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isOut
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          }`}
                        >
                          {isOut ? "Out of Stock" : "In Stock"}
                        </span>
                      </td>

                      {/* Primary Retailer / Distributor */}
                      <td className="py-3 px-4">
                        {primaryRetailer ? (
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span>{primaryRetailer.name}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {primaryRetailer.contactPerson} &bull; {primaryRetailer.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setSellingProduct(p);
                              setSellQuantity(1);
                              setSellCustomer("");
                              setSellInvoice("");
                              setSellNotes("Counter sale");
                            }}
                            disabled={p.quantity <= 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-30 transition-colors shadow-2xs"
                            title={p.quantity > 0 ? "Sell units of this product" : "Out of stock"}
                          >
                            <ShoppingCart className="w-3 h-3 text-emerald-600" />
                            <span>Sell</span>
                          </button>
                          <Link
                            href={`/movements?productId=${p.id}`}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                            title="View Stock Movement Audit Trail"
                          >
                            <History className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <div>
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of{" "}
            <span className="font-bold text-foreground">{products.length}</span> peripherals
          </div>
          <div className="flex items-center gap-4">
            <span>
              Total Units in view:{" "}
              <strong className="text-foreground">
                {filtered.reduce((acc, p) => acc + p.quantity, 0)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Sell Modal */}
      {sellingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <span>Sell Product</span>
              </h3>
              <button
                onClick={() => setSellingProduct(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product info banner */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1">
              <div className="font-bold text-sm text-foreground leading-snug">
                {sellingProduct.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="bg-card px-1.5 py-0.5 rounded border border-border font-bold text-foreground">
                  {sellingProduct.sku}
                </span>
                <span>Model: {sellingProduct.model}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Available in stock:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {sellingProduct.quantity} units
                </span>
              </div>
            </div>

            <form onSubmit={handleQuickSellSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Quantity to Sell <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={sellingProduct.quantity}
                    required
                    autoFocus
                    value={sellQuantity}
                    onChange={(e) =>
                      setSellQuantity(
                        Math.max(
                          1,
                          Math.min(sellingProduct.quantity, parseInt(e.target.value) || 1)
                        )
                      )
                    }
                    className="w-28 px-3 py-2 rounded-lg border border-input bg-background text-foreground font-bold text-center text-sm"
                  />
                  <span className="text-muted-foreground text-xs">
                    (Max: {sellingProduct.quantity} units)
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Tech / Retail Walk-in"
                  value={sellCustomer}
                  onChange={(e) => setSellCustomer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Invoice / Receipt No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-0091"
                  value={sellInvoice}
                  onChange={(e) => setSellInvoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter sale, warranty slip issued"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSellingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSale || sellingProduct.quantity < sellQuantity}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 shadow-sm transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{isSubmittingSale ? "Selling..." : "Confirm Sale"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
