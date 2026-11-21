"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ShoppingCart,
  Users2,
  FileText,
  ArrowLeftRight,
  BarChart3,
  Settings,
  X,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/money";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Stock Items", href: "/stock", icon: Boxes },
    { label: "Sales & Sold Items", href: "/sales", icon: ShoppingCart },
    { label: "Add Stock", href: "/stock/add", icon: PackagePlus },
    { label: "Retailers", href: "/retailers", icon: Users2 },
    { label: "Purchase Orders", href: "/purchase-orders", icon: FileText },
    { label: "Movements", href: "/movements", icon: ArrowLeftRight },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Settings & Staff", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static no-print flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-primary">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight text-foreground font-black tracking-tight">StockDesk</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Peripherals Hub</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Local Office Network Pill Footer */}
        <div className="p-4 border-t border-border bg-muted/40">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>LAN Host Mode</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono text-muted-foreground truncate">
            0.0.0.0:3000 (Local Wi-Fi)
          </div>
        </div>
      </aside>
    </>
  );
}
