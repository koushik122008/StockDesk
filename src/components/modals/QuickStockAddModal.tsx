"use client";

import React, { useState } from "react";
import { X, Package, Plus, Check } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";

interface QuickStockAddModalProps {
  product: any;
  onClose: () => void;
  onStockUpdated: () => void;
}

export function QuickStockAddModal({
  product,
  onClose,
  onStockUpdated,
}: QuickStockAddModalProps) {
  const { toast } = useToast();
  const [addQty, setAddQty] = useState<number>(1);
  const [movementType, setMovementType] = useState<string>("PURCHASE");
  const [reason, setReason] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addQty <= 0) {
      toast.error("Please specify a quantity greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantityChange: addQty,
          type: movementType,
          reason: reason || `Scanned stock receipt (+${addQty})`,
          referenceType: invoiceNo ? "INVOICE" : "MANUAL",
          referenceId: invoiceNo || undefined,
          version: product.version,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update stock");
      }

      toast.success(
        `Added ${addQty} unit(s) to ${product.name}. New count: ${product.quantity + addQty}`
      );
      onStockUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <Package className="w-4 h-4 text-primary" />
            <span>Product Scanned: Add Stock</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Card */}
        <div className="p-4 border-b border-border bg-card space-y-2">
          <div className="text-base font-bold text-foreground leading-snug">
            {product.name}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="bg-muted px-2 py-0.5 rounded text-foreground font-bold">
              SKU: {product.sku}
            </span>
            {product.barcode && <span>Barcode: {product.barcode}</span>}
          </div>
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-muted-foreground">Current Stock:</span>
            <span className="font-bold text-sm text-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {product.quantity} units
            </span>
          </div>
          {product.purchasePricePaise ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Unit Cost:</span>
              <span className="font-semibold text-foreground">
                {formatPaise(product.purchasePricePaise)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Location:</span>
            <span className="text-foreground">{product.rackLocation || "General"}</span>
          </div>
        </div>

        {/* Add Quantity Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Quantity to Add
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                autoFocus
                className="w-24 px-3 py-2 text-sm font-bold text-center rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex gap-1">
                {[1, 5, 10, 20].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddQty(amt)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                      addQty === amt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Movement Type
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
              >
                <option value="PURCHASE">Purchase / Stock In</option>
                <option value="RETURN_RMA">Return from Customer</option>
                <option value="ADJUSTMENT">Inventory Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Invoice No (optional)
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-9821"
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Reason / Notes (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Restocked shelf from shipment"
              className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Confirm +{addQty} Units</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
