"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Search,
  ScanLine,
  AlertTriangle,
  PackagePlus,
  Wifi,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
  onOpenScanner?: () => void;
}

export function Header({
  onToggleSidebar,
  onOpenSearch,
  onOpenScanner,
}: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Fetch real unread notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        // fail gracefully
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s for low stock alerts
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const role = (session?.user as any)?.role || "STAFF";

  return (
    <header className="h-16 bg-card border-b border-border px-4 lg:px-8 flex items-center justify-between no-print sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-muted-foreground hover:text-foreground lg:hidden rounded-lg hover:bg-muted"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Shortcut trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors w-64 md:w-80"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="flex-1 text-left truncate">Search peripherals, SKU, barcode...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">
            /
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Scan Action */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
          title="Open Barcode / QR Scanner"
        >
          <ScanLine className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Scanner</span>
        </button>

        {/* New Item Action */}
        <Link
          href="/stock/add"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
        >
          <PackagePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Stock</span>
        </Link>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors flex items-start gap-2.5 ${
                        !n.isRead ? "bg-amber-500/5 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-foreground font-semibold">{n.title}</div>
                        <div className="text-muted-foreground mt-0.5">{n.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-border text-center">
                <Link
                  href="/stock"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all Stock Items &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Profile & Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none">{session?.user?.name || "Staff User"}</span>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {role}
              </span>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-foreground">{session?.user?.name || "Staff User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email || "staff@stockdesk.local"}</p>
                <span
                  className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    role === "ADMIN"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      : role === "MANAGER"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  Role: {role}
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-muted text-foreground"
                >
                  <Wifi className="w-4 h-4 text-muted-foreground" />
                  Office Network / Settings
                </Link>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
