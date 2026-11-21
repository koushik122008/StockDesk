"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Keyboard, AlertCircle } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    let scannerInstance: any = null;

    if (isOpen) {
      setCameraError(null);
      setManualCode("");

      // Dynamically load html5-qrcode
      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          const qrCodeRegionId = "qr-reader-region";
          scannerInstance = new Html5Qrcode(qrCodeRegionId);
          html5QrCodeRef.current = scannerInstance;

          scannerInstance
            .start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 180 },
              },
              (decodedText: string) => {
                onScanSuccess(decodedText);
              },
              () => {
                // scanning frame error (ignore)
              }
            )
            .then(() => {
              setIsScanning(true);
            })
            .catch((err: any) => {
              console.warn("Camera start failed:", err);
              setCameraError(
                "Camera access unavailable or blocked. You can type or use a USB scanner."
              );
            });
        })
        .catch((err) => {
          console.error("Failed to load html5-qrcode library", err);
          setCameraError("Scanner module failed to load.");
        });
    }

    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current
            .stop()
            .then(() => html5QrCodeRef.current?.clear())
            .catch(() => {});
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Camera className="w-4 h-4 text-primary" />
            <span>Barcode &amp; QR Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Scanner Area */}
        <div className="p-4 flex flex-col items-center">
          <div
            id="qr-reader-region"
            className="w-full max-w-sm rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center text-xs text-white"
          />

          {cameraError && (
            <div className="mt-3 p-3 w-full rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground text-center">
            Point camera at peripheral barcode / QR sticker, or use USB laser scanner.
          </div>
        </div>

        {/* Manual Keyboard Entry Alternative */}
        <form onSubmit={handleManualSubmit} className="p-4 border-t border-border bg-muted/30">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
            Manual Entry / USB Scan
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 097855065551 or LOG-KB-K120"
              autoFocus
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors"
            >
              Lookup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
