"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  Barcode,
  Building2,
  Calendar,
  Layers,
  MapPin,
  Shield,
  FileText,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Search,
  Sparkles,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import { formatPaise } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";

interface AddStockFormProps {
  categories: any[];
  brands: any[];
  retailers: any[];
}

export function AddStockForm({
  categories,
  brands,
  retailers,
}: AddStockFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id || "");
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [gstRate, setGstRate] = useState<number>(18);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [rackLocation, setRackLocation] = useState("Rack A-01");
  const [retailerId, setRetailerId] = useState(retailers[0]?.id || "");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");

  // Serial numbers list for high-value peripherals
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
  const [currentSerial, setCurrentSerial] = useState("");
  const [loading, setLoading] = useState(false);

  // Floating window for existing item suggestions
  const [matchingProducts, setMatchingProducts] = useState<any[]>([]);
  const [showFloatingWindow, setShowFloatingWindow] = useState(false);
  const modelWrapperRef = useRef<HTMLDivElement>(null);

  // Close floating window when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelWrapperRef.current &&
        !modelWrapperRef.current.contains(event.target as Node)
      ) {
        setShowFloatingWindow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // When model number changes, check for existing matching items
  useEffect(() => {
    const trimmed = model.trim();
    if (trimmed.length < 2) {
      setMatchingProducts([]);
      setShowFloatingWindow(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          const items = data.products || [];
          setMatchingProducts(items);
          if (items.length > 0) {
            setShowFloatingWindow(true);
          } else {
            setShowFloatingWindow(false);
          }
        }
      } catch (e) {
        // fail silently
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [model]);

  // Autofill form from an existing product
  const handleSelectExistingProduct = (p: any) => {
    setName(p.name);
    setModel(p.model);
    if (p.brandId) setBrandId(p.brandId);
    if (p.categoryId) setCategoryId(p.categoryId);
    if (p.purchasePricePaise) {
      setPurchasePrice((p.purchasePricePaise / 100).toString());
    }
    if (p.gstRate !== undefined) setGstRate(p.gstRate);
    if (p.warrantyMonths !== undefined) setWarrantyMonths(p.warrantyMonths);
    if (p.rackLocation) setRackLocation(p.rackLocation);
    if (p.barcode) setBarcode(p.barcode);
    if (p.retailers && p.retailers.length > 0) {
      const primary = p.retailers.find((r: any) => r.isPrimary) || p.retailers[0];
      if (primary?.retailerId) setRetailerId(primary.retailerId);
    }
    setShowFloatingWindow(false);
    toast.info(`Filled details from existing item: ${p.name}`);
  };

  // Auto SKU generator helper
  const handleAutoGenerateSku = () => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    const prefix = selectedCat ? selectedCat.slug.substring(0, 3).toUpperCase() : "PRP";
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(`${prefix}-${rand}`);
  };

  const handleAddSerial = () => {
    if (currentSerial.trim() && !serialNumbers.includes(currentSerial.trim())) {
      setSerialNumbers([...serialNumbers, currentSerial.trim()]);
      setCurrentSerial("");
    }
  };

  const handleRemoveSerial = (index: number) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName("");
    setModel("");
    setSku("");
    setBarcode("");
    setQuantity(1);
    setPurchasePrice("");
    setInvoiceNo("");
    setNotes("");
    setSerialNumbers([]);
    setMatchingProducts([]);
    setShowFloatingWindow(false);
  };

  const handleSubmit = async (addAnother = false) => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!model.trim()) {
      toast.error("Model name/number is required");
      return;
    }
    if (!purchasePrice) {
      toast.error("Purchase cost price is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/stock/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brandId,
          model: model.trim(),
          sku: sku.trim() || undefined,
          barcode: barcode.trim() || undefined,
          categoryId,
          quantity: Number(quantity) || 0,
          purchasePriceRupees: purchasePrice,
          gstRate: Number(gstRate),
          warrantyMonths: Number(warrantyMonths),
          rackLocation: rackLocation.trim() || "General",
          retailerId,
          purchaseDate,
          invoiceNo: invoiceNo.trim() || undefined,
          serialNumbers,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create product");
        setLoading(false);
        return;
      }

      toast.success(`Created product: ${data.product.name} (SKU: ${data.product.sku})`);

      if (addAnother) {
        resetForm();
        setLoading(false);
      } else {
        router.push("/stock");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(false);
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Peripheral Specifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <PackagePlus className="w-4 h-4 text-primary" />
              <span>Peripheral Specifications</span>
            </h2>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Product Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Logitech MX Master 3S Wireless Mouse"
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Model No with Floating Autocomplete Window */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div ref={modelWrapperRef} className="relative">
                <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                  <span>
                    Model No / Code <span className="text-rose-500">*</span>
                  </span>
                  {matchingProducts.length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {matchingProducts.length} Existing Found
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setShowFloatingWindow(true);
                  }}
                  onFocus={() => {
                    if (matchingProducts.length > 0) setShowFloatingWindow(true);
                  }}
                  placeholder="e.g. MXM3S or K120"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-medium"
                />

                {/* Floating Suggestions Window (Closes when clicking anywhere outside) */}
                {showFloatingWindow && matchingProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-2.5 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-primary" />
                        Existing items matching &quot;{model}&quot;:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFloatingWindow(false)}
                        className="p-0.5 hover:text-foreground text-muted-foreground rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {matchingProducts.map((p) => (
                        <div
                          key={p.id}
                          className="p-2 rounded-lg bg-muted/40 hover:bg-muted border border-border/60 transition-colors flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-foreground text-[11px]">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Model: <span className="text-foreground font-semibold">{p.model}</span> &bull; SKU: {p.sku}
                              </div>
                            </div>
                            <span className="bg-primary/10 text-primary font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                              {p.quantity} in stock
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground pt-0.5 border-t border-border/40">
                            <span>Cost: <strong className="text-foreground">{formatPaise(p.purchasePricePaise)}</strong></span>
                            <span>&bull;</span>
                            <span>Rack: <strong className="text-foreground">{p.rackLocation}</strong></span>
                            <span>&bull;</span>
                            <span>{p.category?.name}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectExistingProduct(p)}
                            className="mt-1 w-full text-center py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1 shadow-xs"
                          >
                            <span>Fill form with this item</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Brand <span className="text-rose-500">*</span>
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    if (cat) {
                      setGstRate(cat.defaultGstRate);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SKU and Barcode Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    SKU (Stock Keeping Unit)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSku}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Barcode / EAN (optional)
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan with USB scanner or type"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Stock Count (Selling price and reorder threshold removed) */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Purchase Cost &amp; Inward Quantity</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Purchase Cost Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 7200.00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background font-bold text-foreground"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Unit wholesale cost paid to distributor
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Quantity Received <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background font-bold text-foreground"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Physical units added to inventory
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  GST Rate (%)
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-medium"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard Peripherals)</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Warranty (Months)
                </label>
                <select
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                >
                  <option value={0}>No Warranty</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Rack / Shelf Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    placeholder="e.g. Rack A-01"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Distributor Details & Serial Tracking */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Distributor &amp; Invoice</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Primary Supplier / Retailer
              </label>
              <select
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-medium"
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Distributor Invoice No
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2026-904"
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Purchase Date
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background"
                />
              </div>
            </div>
          </div>

          {/* Optional Serial Numbers */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm space-y-3">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Unit Serial Numbers (Optional)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Scan individual unit serial numbers for monitors, SSDs, or laser printers.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={currentSerial}
                onChange={(e) => setCurrentSerial(e.target.value)}
                placeholder="Scan or type serial"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSerial();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSerial}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Add
              </button>
            </div>

            {serialNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-muted/40 rounded-lg">
                {serialNumbers.map((sn, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background border border-border text-[11px] font-mono"
                  >
                    <span>{sn}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSerial(idx)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Form</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50"
          >
            <span>Save &amp; Add Another</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? "Saving Stock..." : "Save Stock Item (Enter)"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
