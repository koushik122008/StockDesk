"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Package, Tag, ArrowRight } from "lucide-react";
import { formatPaise } from "@/lib/money";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onSelectProduct,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Header input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search peripherals by name, SKU, brand, model, barcode..."
            className="w-full py-4 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border">
              ESC
            </kbd>
          </button>
        </div>

        {/* Results view */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/50">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Searching peripherals...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No peripherals found matching &quot;{query}&quot;
            </div>
          )}

          {!loading && !query && (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
              <div>Quick search tips:</div>
              <div>Type product name (e.g. &ldquo;Logitech&rdquo;), SKU (&ldquo;LOG-KB-K120&rdquo;), or category.</div>
            </div>
          )}

          {results.map((p) => {
            const isLow = p.quantity <= p.minReorderLevel;
            const isOut = p.quantity === 0;

            return (
              <button
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/70 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                      {p.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                        {p.sku}
                      </span>
                      <span>&bull;</span>
                      <span>{p.category?.name || "Peripheral"}</span>
                      <span>&bull;</span>
                      <span>Rack: {p.rackLocation}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-foreground">
                        {formatPaise(p.sellingPricePaise)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        isOut
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                          : isLow
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      }`}
                    >
                      {p.quantity} units
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
