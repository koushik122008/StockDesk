"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Printer,
  CheckCircle2,
  PackageCheck,
  Send,
  XCircle,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
  Check,
  X,
} from "lucide-react";
import { formatPaise, formatIST } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface PurchaseOrdersClientProps {
  initialOrders: any[];
  retailers: any[];
  products: any[];
  initialAction?: string;
  preselectedRetailerId?: string;
  highlightPoNumber?: string;
}

export function PurchaseOrdersClient({
  initialOrders,
  retailers,
  products,
  initialAction,
  preselectedRetailerId,
  highlightPoNumber,
}: PurchaseOrdersClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Receive stock modal state
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [receiveInvoiceNo, setReceiveInvoiceNo] = useState("");
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});
  const [isReceivingSubmitting, setIsReceivingSubmitting] = useState(false);

  // Print / View PO Modal state
  const [viewingPO, setViewingPO] = useState<any | null>(null);

  // New PO Modal state
  const [isNewPOOpen, setIsNewPOOpen] = useState(
    initialAction === "new" || initialAction === "new-from-low"
  );
  const [newRetailerId, setNewRetailerId] = useState(
    preselectedRetailerId || retailers[0]?.id || ""
  );
  const [newItems, setNewItems] = useState<Array<{ productId: string; orderedQty: number }>>([
    { productId: products[0]?.id || "", orderedQty: 5 },
  ]);
  const [newNotes, setNewNotes] = useState("");
  const [isCreatingSubmitting, setIsCreatingSubmitting] = useState(false);

  // Auto-generate POs for all low stock items
  const handleAutoCreateFromLowStock = async () => {
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-from-low-stock" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to auto-generate POs");
      }

      toast.success(
        `Generated ${data.count} Purchase Order(s) auto-grouped by distributor!`
      );
      router.refresh();
      // Reload orders
      const listRes = await fetch("/api/purchase-orders");
      if (listRes.ok) {
        const listData = await listRes.json();
        setOrders(listData.orders || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-generate POs");
    }
  };

  const handleUpdateStatus = async (poId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Purchase Order marked as ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === poId ? { ...o, status: newStatus } : o))
        );
      } else {
        toast.error("Failed to update PO status");
      }
    } catch (err) {
      toast.error("Error updating PO status");
    }
  };

  const openReceiveModal = (po: any) => {
    setReceivingPO(po);
    setReceiveInvoiceNo("");
    // Default remaining needed qty
    const initialMap: Record<string, number> = {};
    for (const item of po.items) {
      const remaining = Math.max(0, item.orderedQty - item.receivedQty);
      initialMap[item.id] = remaining;
    }
    setReceiveItems(initialMap);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPO) return;
    setIsReceivingSubmitting(true);

    const payloadItems = Object.entries(receiveItems).map(([itemId, receivedQty]) => ({
      itemId,
      receivedQty: Number(receivedQty) || 0,
    }));

    try {
      const res = await fetch(`/api/purchase-orders/${receivingPO.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          invoiceNo: receiveInvoiceNo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to receive stock");
      }

      toast.success(`Stock received successfully for ${receivingPO.poNumber}!`);
      setReceivingPO(null);
      router.refresh();

      // Refresh list
      const listRes = await fetch("/api/purchase-orders");
      if (listRes.ok) {
        const listData = await listRes.json();
        setOrders(listData.orders || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Error receiving stock");
    } finally {
      setIsReceivingSubmitting(false);
    }
  };

  const handleCreateManualPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRetailerId) {
      toast.error("Please select a distributor");
      return;
    }
    if (newItems.length === 0) {
      toast.error("Add at least one peripheral line item");
      return;
    }

    setIsCreatingSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId: newRetailerId,
          items: newItems,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create PO");
      }

      toast.success(`Purchase Order ${data.purchaseOrder.poNumber} created!`);
      setIsNewPOOpen(false);
      setOrders([data.purchaseOrder, ...orders]);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error creating PO");
    } finally {
      setIsCreatingSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <span>Purchase Orders &amp; Inward Stock</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restock workflow &bull; Draft &rarr; Sent &rarr; Partially Received &rarr; Received &bull; Auto-increment inventory counts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNewPOOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-card border border-border text-xs font-semibold">
        {[
          { label: "All POs", val: "ALL" },
          { label: "Draft", val: "DRAFT" },
          { label: "Sent to Supplier", val: "SENT" },
          { label: "Partially Received", val: "PARTIALLY_RECEIVED" },
          { label: "Received (Complete)", val: "RECEIVED" },
          { label: "Cancelled", val: "CANCELLED" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === tab.val
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Purchase Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-foreground">No Purchase Orders found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a new PO manually or auto-generate orders from low stock items.
            </p>
          </div>
        ) : (
          filteredOrders.map((po) => {
            const isHighlighted = highlightPoNumber === po.poNumber;
            const canReceive =
              po.status === "SENT" || po.status === "PARTIALLY_RECEIVED";
            const canSend = po.status === "DRAFT";

            return (
              <div
                key={po.id}
                className={`p-5 rounded-xl border bg-card shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isHighlighted ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                }`}
              >
                {/* PO Left Info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-foreground">
                      {po.poNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.status === "RECEIVED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : po.status === "PARTIALLY_RECEIVED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          : po.status === "SENT"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          : po.status === "DRAFT"
                          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                      }`}
                    >
                      {po.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ordered: {formatIST(po.orderDate, false)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-foreground">{po.retailer?.name}</span>
                    <span className="text-muted-foreground font-mono">
                      ({po.retailer?.contactPerson} &bull; {po.retailer?.phone})
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Items: <strong>{po.items.length} line item(s)</strong> &bull; Total Value:{" "}
                    <strong className="text-foreground">{formatPaise(po.totalPaise)}</strong>
                  </div>
                </div>

                {/* PO Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* View / Print Formal PO */}
                  <button
                    onClick={() => setViewingPO(po)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>View / Print PO</span>
                  </button>

                  {/* Mark as Sent */}
                  {canSend && (
                    <button
                      onClick={() => handleUpdateStatus(po.id, "SENT")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Supplier</span>
                    </button>
                  )}

                  {/* Receive Stock Button */}
                  {canReceive && (
                    <button
                      onClick={() => openReceiveModal(po)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Receive Stock</span>
                    </button>
                  )}

                  {/* Cancel */}
                  {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleUpdateStatus(po.id, "CANCELLED")}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-md"
                      title="Cancel Purchase Order"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Receive Stock Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-emerald-500/10">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Receive Inward Stock: {receivingPO.poNumber}</span>
              </div>
              <button
                onClick={() => setReceivingPO(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Distributor:</span>{" "}
                <strong>{receivingPO.retailer?.name}</strong>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-foreground">Distributor Invoice #:</label>
                <input
                  type="text"
                  value={receiveInvoiceNo}
                  onChange={(e) => setReceiveInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-99214"
                  className="px-2.5 py-1 text-xs rounded border border-input bg-background font-mono"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="p-2">Peripheral</th>
                    <th className="p-2 text-center">Ordered</th>
                    <th className="p-2 text-center">Received</th>
                    <th className="p-2 text-center">Receiving Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivingPO.items.map((item: any) => {
                    const remaining = Math.max(0, item.orderedQty - item.receivedQty);
                    return (
                      <tr key={item.id}>
                        <td className="p-2">
                          <div className="font-semibold text-foreground">
                            {item.product?.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            SKU: {item.product?.sku}
                          </div>
                        </td>
                        <td className="p-2 text-center font-bold">{item.orderedQty}</td>
                        <td className="p-2 text-center text-muted-foreground">
                          {item.receivedQty}
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={receiveItems[item.id] ?? remaining}
                            onChange={(e) =>
                              setReceiveItems({
                                ...receiveItems,
                                [item.id]: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            className="w-20 px-2 py-1 text-center font-bold border border-primary rounded bg-background"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReceivingSubmitting}
                onClick={handleConfirmReceive}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isReceivingSubmitting ? "Receiving & Logging Movements..." : "Confirm Stock Inward"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable PO Modal */}
      {viewingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40 no-print">
              <div className="font-bold text-sm text-foreground">
                Purchase Order Document: {viewingPO.poNumber}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setViewingPO(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto printable-area space-y-6 text-xs">
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase text-foreground">StockDesk Peripherals</h1>
                  <p className="text-muted-foreground">Office Host System &bull; Purchase Order</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-base font-black text-foreground">
                    {viewingPO.poNumber}
                  </div>
                  <div>Date: {formatIST(viewingPO.orderDate, false)}</div>
                  <div>Status: <strong>{viewingPO.status}</strong></div>
                </div>
              </div>

              {/* Vendor & Delivery Blocks */}
              <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-muted/30 border border-border">
                <div>
                  <span className="font-bold text-foreground block mb-1">VENDOR / DISTRIBUTOR:</span>
                  <div className="font-semibold text-sm">{viewingPO.retailer?.name}</div>
                  <div>Attn: {viewingPO.retailer?.contactPerson}</div>
                  <div>Phone: {viewingPO.retailer?.phone}</div>
                  <div>Email: {viewingPO.retailer?.email}</div>
                  <div>City: {viewingPO.retailer?.city}, {viewingPO.retailer?.state}</div>
                  <div className="font-mono">GSTIN: {viewingPO.retailer?.gstin}</div>
                </div>

                <div>
                  <span className="font-bold text-foreground block mb-1">DELIVER TO:</span>
                  <div className="font-semibold text-sm">StockDesk Computer Peripherals</div>
                  <div>Shop #14, IT Plaza, Commercial Street</div>
                  <div>Bengaluru, Karnataka 560001</div>
                  <div>Phone: +91 80 4123 4567</div>
                  <div className="font-mono">GSTIN: 29ABCDE1234F1Z5</div>
                </div>
              </div>

              {/* PO Items Table */}
              <table className="w-full text-left border-collapse border border-border">
                <thead>
                  <tr className="border-b border-border bg-muted/60 font-bold">
                    <th className="p-2">#</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Ordered Qty</th>
                    <th className="p-2 text-right">Unit Rate (₹)</th>
                    <th className="p-2 text-right">GST %</th>
                    <th className="p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {viewingPO.items.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold">{item.product?.sku}</td>
                      <td className="p-2">{item.product?.name}</td>
                      <td className="p-2 text-center font-bold">{item.orderedQty}</td>
                      <td className="p-2 text-right font-mono">{formatPaise(item.unitPricePaise)}</td>
                      <td className="p-2 text-right">{item.gstRate}%</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatPaise(item.orderedQty * item.unitPricePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td colSpan={6} className="p-2 text-right">Total Order Value:</td>
                    <td className="p-2 text-right font-mono text-sm">{formatPaise(viewingPO.totalPaise)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="pt-8 border-t border-dashed border-border flex justify-between items-end">
                <div>Terms: {viewingPO.retailer?.paymentTerms || "Net 30"}</div>
                <div className="text-center">
                  <div className="w-40 border-b border-foreground mb-1"></div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Manual Purchase Order Modal */}
      {isNewPOOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="font-bold text-sm text-foreground">Create Purchase Order</div>
              <button
                onClick={() => setIsNewPOOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualPO} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Select Distributor</label>
                <select
                  value={newRetailerId}
                  onChange={(e) => setNewRetailerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background font-medium"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.city}) &bull; Terms: {r.paymentTerms}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Order Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewItems([
                        ...newItems,
                        { productId: products[0]?.id || "", orderedQty: 5 },
                      ])
                    }
                    className="text-primary hover:underline font-medium"
                  >
                    + Add Another Item
                  </button>
                </div>

                {newItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const updated = [...newItems];
                        updated[idx].productId = e.target.value;
                        setNewItems(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (SKU: {p.sku}) - Current Stock: {p.quantity}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={item.orderedQty}
                      onChange={(e) => {
                        const updated = [...newItems];
                        updated[idx].orderedQty = Math.max(1, parseInt(e.target.value) || 1);
                        setNewItems(updated);
                      }}
                      className="w-20 px-2 py-1.5 text-center font-bold rounded-lg border border-input bg-background"
                    />

                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-rose-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Please supply warranty seal packs. Expected delivery Friday."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPOOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSubmitting}
                  className="px-5 py-2 font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                >
                  {isCreatingSubmitting ? "Generating..." : "Generate Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
