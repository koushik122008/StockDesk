"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, Undo2, X } from "lucide-react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "undo";
  title?: string;
  message: string;
  duration?: number;
  onUndo?: () => void;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    undo: (message: string, onUndo: () => void, durationMs?: number) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...item, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = item.duration || (item.type === "undo" ? 8000 : 4000);
      setTimeout(() => {
        dismiss(id);
      }, duration);
    },
    [dismiss]
  );

  const toast = {
    success: (message: string, title?: string) =>
      addToast({ type: "success", message, title }),
    error: (message: string, title?: string) =>
      addToast({ type: "error", message, title }),
    info: (message: string, title?: string) =>
      addToast({ type: "info", message, title }),
    undo: (message: string, onUndo: () => void, durationMs = 8000) =>
      addToast({ type: "undo", message, onUndo, duration: durationMs }),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full no-print pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : t.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
                : t.type === "undo"
                ? "bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100"
                : "bg-card border-border text-foreground"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            {t.type === "info" && (
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            {t.type === "undo" && (
              <Undo2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              {t.title && <div className="font-semibold">{t.title}</div>}
              <div>{t.message}</div>
              {t.type === "undo" && t.onUndo && (
                <button
                  onClick={() => {
                    t.onUndo?.();
                    dismiss(t.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo change
                </button>
              )}
            </div>

            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
