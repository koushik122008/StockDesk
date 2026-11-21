"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, PackagePlus } from "lucide-react";
import { AddStockForm } from "@/components/stock/AddStockForm";
import { BulkImportModal } from "@/components/stock/BulkImportModal";
import { useRouter } from "next/navigation";

interface AddStockClientProps {
  categories: any[];
  brands: any[];
  retailers: any[];
}

export function AddStockClient({
  categories,
  brands,
  retailers,
}: AddStockClientProps) {
  const router = useRouter();
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/stock"
            className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Stock"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Add Peripheral Stock
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter individual item details or perform bulk CSV/Excel import
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBulkOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bulk CSV / Excel Import</span>
        </button>
      </div>

      <AddStockForm
        categories={categories}
        brands={brands}
        retailers={retailers}
      />

      <BulkImportModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onImportComplete={() => {
          router.push("/stock");
          router.refresh();
        }}
      />
    </>
  );
}
