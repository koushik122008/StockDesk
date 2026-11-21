"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SearchModal } from "@/components/modals/SearchModal";
import { BarcodeScannerModal } from "@/components/modals/BarcodeScannerModal";
import { QuickStockAddModal } from "@/components/modals/QuickStockAddModal";
import { useToast } from "@/components/ui/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [quickScanProduct, setQuickScanProduct] = useState<any | null>(null);

  // USB Keyboard-Wedge Scanner Detection
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input/textarea/select
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Global Shortcuts:
      // '/' -> open search (if not typing in input)
      if (!isInput && e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // 'N' -> new item (if not typing in input)
      if (!isInput && (e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/stock/add");
        return;
      }

      // 'P' -> print current report (if on /reports or /stock)
      if (!isInput && (e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey) {
        if (pathname === "/stock" || pathname === "/reports") {
          e.preventDefault();
          window.print();
          return;
        }
      }

      // Barcode Scanner Listener:
      // Hardware USB barcode scanners send keystrokes with < 50ms interval and end with "Enter"
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 4 && timeDiff < 100) {
          // Detected scanner input!
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = "";
          handleScannedBarcode(scannedCode);
        } else {
          barcodeBufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          // Reset buffer if delay too long (manual typing)
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  const handleScannedBarcode = async (code: string) => {
    try {
      const res = await fetch(`/api/stock/lookup?query=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setQuickScanProduct(data.product);
          toast.info(`Scanned: ${data.product.name} (SKU: ${data.product.sku})`);
        } else {
          toast.error(`No product found for barcode/SKU: ${code}`);
        }
      } else {
        toast.error(`Lookup failed for: ${code}`);
      }
    } catch (err) {
      toast.error(`Error scanning barcode`);
    }
  };

  // If login page, don't show sidebar/header
  if (pathname === "/login") {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => {
          setIsSearchOpen(false);
          router.push(`/stock?highlight=${p.id}`);
        }}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          handleScannedBarcode(code);
        }}
      />

      {quickScanProduct && (
        <QuickStockAddModal
          product={quickScanProduct}
          onClose={() => setQuickScanProduct(null)}
          onStockUpdated={() => {
            setQuickScanProduct(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
