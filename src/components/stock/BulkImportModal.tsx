"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: BulkImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<"merge" | "skip">("merge");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  // Download Sample CSV
  const handleDownloadTemplate = () => {
    const headers = [
      "name",
      "brand",
      "model",
      "sku",
      "barcode",
      "category",
      "quantity",
      "purchasePrice",
      "gstRate",
      "warrantyMonths",
      "rackLocation",
      "retailer",
    ];

    const sampleData = [
      [
        "Logitech G213 Prodigy Gaming Keyboard",
        "Logitech",
        "G213",
        "LOG-KB-G213",
        "097855123456",
        "Keyboards",
        "10",
        "3450.00",
        "18",
        "24",
        "Rack A-06",
        "Infotech Distribution Pvt Ltd",
      ],
      [
        "Dell Optical Mouse MS116 Black",
        "Dell",
        "MS116-BLK",
        "DEL-MS-116B",
        "884116987654",
        "Mice & Pointers",
        "25",
        "220.00",
        "18",
        "12",
        "Rack B-06",
        "Apex Peripherals & Components",
      ],
      [
        "Samsung 24-inch Curved Bezel-Less Monitor",
        "Samsung",
        "LC24F390FHWXXL",
        "SAM-MN-24F39",
        "880609123456",
        "Monitors & Displays",
        "5",
        "8900.00",
        "18",
        "36",
        "Display Shelf 5",
        "Apex Peripherals & Components",
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...sampleData.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "StockDesk_Peripherals_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file select & parse via XLSX
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (data.length === 0) {
          setErrors(["The uploaded file is empty."]);
          setParsedRows([]);
          return;
        }

        // Validate basic headers
        const firstRow = data[0] as any;
        if (!("name" in firstRow) && !("Name" in firstRow)) {
          setErrors(["Missing required column 'name'. Please download and follow the template."]);
        }

        setParsedRows(data);
      } catch (err: any) {
        setErrors(["Failed to parse spreadsheet: " + err.message]);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stock/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsedRows,
          duplicateAction,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to import items");
      }

      toast.success(
        `Import complete: ${result.createdCount} new created, ${result.mergedCount} merged, ${result.skippedCount} skipped.`
      );
      onImportComplete();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Bulk import failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>Bulk Stock Import (CSV / Excel)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Download template & File Picker */}
        <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Download CSV Template</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors">
              <Upload className="w-4 h-4" />
              <span>Select CSV / Excel File</span>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && (
              <span className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                {file.name}
              </span>
            )}
          </div>
        </div>

        {/* Duplicate Action Settings */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">On Duplicate SKU:</span>
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "merge"}
                onChange={() => setDuplicateAction("merge")}
                className="text-primary"
              />
              <span>Merge &amp; Add Quantity</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer ml-2">
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "skip"}
                onChange={() => setDuplicateAction("skip")}
                className="text-primary"
              />
              <span>Skip Duplicate</span>
            </label>
          </div>
          <div className="text-muted-foreground">
            Parsed: <strong>{parsedRows.length}</strong> items
          </div>
        </div>

        {/* Errors Alert */}
        {errors.length > 0 && (
          <div className="p-3 mx-4 mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-1">
            {errors.map((e, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview Table */}
        <div className="flex-1 overflow-auto p-4">
          {parsedRows.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
              <div>No file selected yet.</div>
              <div>Download the template, fill your peripheral rows, and upload.</div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                  <th className="p-2">#</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Model</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Cost (₹)</th>
                  <th className="p-2 text-right">Sell (₹)</th>
                  <th className="p-2">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.slice(0, 30).map((row, idx) => {
                  const hasName = Boolean(row.name);
                  return (
                    <tr
                      key={idx}
                      className={!hasName ? "bg-rose-500/10 text-rose-600" : "hover:bg-muted/30"}
                    >
                      <td className="p-2 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-semibold">{row.name || "Missing Name*"}</td>
                      <td className="p-2">{row.brand || "-"}</td>
                      <td className="p-2">{row.model || "-"}</td>
                      <td className="p-2 font-mono text-[11px]">{row.sku || "(Auto)"}</td>
                      <td className="p-2">{row.category || "Keyboards"}</td>
                      <td className="p-2 text-right font-bold">{row.quantity || 0}</td>
                      <td className="p-2 text-right">₹{row.purchasePrice || 0}</td>
                      <td className="p-2 text-right font-semibold">₹{row.sellingPrice || 0}</td>
                      <td className="p-2">{row.rackLocation || "General"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {parsedRows.length > 30 && `Showing first 30 of ${parsedRows.length} items`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || parsedRows.length === 0}
              onClick={handleUploadSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Importing...</span>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Execute Bulk Import ({parsedRows.length} items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
