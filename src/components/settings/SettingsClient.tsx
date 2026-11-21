"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Settings,
  Wifi,
  HardDrive,
  ShieldCheck,
  Tag,
  Clock,
  Keyboard,
  Copy,
  Check,
  Download,
  Upload,
  AlertTriangle,
  Printer,
  Sparkles,
  Building2,
  Save,
  RotateCw,
  Users,
  UserPlus,
  UserCheck,
  Key,
  Edit2,
  Trash2,
  User,
  X,
  Lock,
} from "lucide-react";
import { formatIST } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  networkUrl: string;
  hostIp: string;
  port: string;
  qrCodeDataUrl: string;
  userRole: string;
  currentUser?: { id: string; name: string; email: string; role: string } | null;
  initialUsers?: any[];
  products: any[];
  warrantyExpiringItems: any[];
}

export function SettingsClient({
  initialSettings,
  networkUrl,
  hostIp,
  port,
  qrCodeDataUrl,
  userRole,
  currentUser,
  initialUsers = [],
  products,
  warrantyExpiringItems,
}: SettingsClientProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "network" | "backup" | "profile" | "staff" | "labels" | "warranty" | "shortcuts"
  >("network");

  // User rename profile state
  const [displayName, setDisplayName] = useState(currentUser?.name || "");
  const [isRenamingProfile, setIsRenamingProfile] = useState(false);

  // Staff management state
  const [usersList, setUsersList] = useState<any[]>(initialUsers);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("STAFF");
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Rename staff modal state
  const [editingStaffUser, setEditingStaffUser] = useState<any | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("STAFF");
  const [editStaffPassword, setEditStaffPassword] = useState("");
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);

  // Shop Profile state
  const [shopName, setShopName] = useState(initialSettings["shop_name"] || "");
  const [shopTagline, setShopTagline] = useState(initialSettings["shop_tagline"] || "");
  const [shopAddress, setShopAddress] = useState(initialSettings["shop_address"] || "");
  const [shopCity, setShopCity] = useState(initialSettings["shop_city"] || "");
  const [shopGstin, setShopGstin] = useState(initialSettings["shop_gstin"] || "");
  const [shopPhone, setShopPhone] = useState(initialSettings["shop_phone"] || "");
  const [shopEmail, setShopEmail] = useState(initialSettings["shop_email"] || "");
  const [ownerEmail, setOwnerEmail] = useState(initialSettings["owner_email"] || "");
  const [defaultGstRate, setDefaultGstRate] = useState(initialSettings["default_gst_rate"] || "18");
  const [secondaryPath, setSecondaryPath] = useState(initialSettings["secondary_backup_path"] || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Backup state
  const [backups, setBackups] = useState<any[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(
    initialSettings["last_backup_at"] || null
  );
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Barcode label generator state
  const [labelProductId, setLabelProductId] = useState(products[0]?.id || "");
  const [labelQuantity, setLabelQuantity] = useState(8);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFirewall, setCopiedFirewall] = useState(false);

  // Fetch backups on load
  const loadBackups = async () => {
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        if (data.lastBackupAt) setLastBackupAt(data.lastBackupAt);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(networkUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success("Network URL copied to clipboard!");
  };

  const handleCopyFirewallCmd = () => {
    const cmd = `netsh advfirewall firewall add rule name="StockDesk Host" dir=in action=allow protocol=TCP localport=${port}`;
    navigator.clipboard.writeText(cmd);
    setCopiedFirewall(true);
    setTimeout(() => setCopiedFirewall(false), 2000);
    toast.success("Firewall command copied!");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: shopName,
          shop_tagline: shopTagline,
          shop_address: shopAddress,
          shop_city: shopCity,
          shop_gstin: shopGstin,
          shop_phone: shopPhone,
          shop_email: shopEmail,
          owner_email: ownerEmail,
          default_gst_rate: defaultGstRate,
          secondary_backup_path: secondaryPath,
        }),
      });

      if (res.ok) {
        toast.success("Shop settings saved successfully!");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (e) {
      toast.error("Error saving settings");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Profile rename handler (self)
  const handleRenameSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("User name cannot be empty");
      return;
    }
    setIsRenamingProfile(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Display name updated to "${data.user.name}"!`);
        // Refresh page to update header session
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error(data.error || "Failed to rename user");
      }
    } catch (err: any) {
      toast.error("Error updating user name");
    } finally {
      setIsRenamingProfile(false);
    }
  };

  // Staff refresh
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Add staff handler
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsCreatingStaff(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaffName.trim(),
          email: newStaffEmail.trim(),
          password: newStaffPassword.trim(),
          role: newStaffRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Staff member "${data.user.name}" created!`);
        setNewStaffName("");
        setNewStaffEmail("");
        setNewStaffPassword("");
        setNewStaffRole("STAFF");
        setShowAddStaffModal(false);
        await fetchUsers();
      } else {
        toast.error(data.error || "Failed to create staff member");
      }
    } catch (err: any) {
      toast.error("Error creating staff member");
    } finally {
      setIsCreatingStaff(false);
    }
  };

  // Update staff handler (rename, role, password, active)
  const handleUpdateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffUser) return;
    if (!editStaffName.trim()) {
      toast.error("Staff name cannot be empty");
      return;
    }

    setIsUpdatingStaff(true);
    try {
      const payload: any = {
        name: editStaffName.trim(),
        role: editStaffRole,
      };
      if (editStaffPassword.trim()) {
        payload.password = editStaffPassword.trim();
      }

      const res = await fetch(`/api/users/${editingStaffUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User updated to "${data.user.name}"!`);
        setEditingStaffUser(null);
        setEditStaffPassword("");
        await fetchUsers();
      } else {
        toast.error(data.error || "Failed to update user");
      }
    } catch (err: any) {
      toast.error("Error updating user");
    } finally {
      setIsUpdatingStaff(false);
    }
  };

  // Toggle staff active state
  const handleToggleStaffActive = async (user: any) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    const newActive = !user.active;
    const confirmMsg = newActive
      ? `Reactivate account for ${user.name}?`
      : `Deactivate account for ${user.name}? They will not be able to log in.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      if (res.ok) {
        toast.success(`User ${user.name} is now ${newActive ? "Active" : "Inactive"}`);
        await fetchUsers();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating user status");
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secondaryPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backup failed");

      toast.success("Daily SQLite & CSV snapshot created successfully!");
      setLastBackupAt(data.timestamp);
      await loadBackups();
    } catch (err: any) {
      toast.error(err.message || "Failed to create backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) {
      toast.error("Please select a .db backup file to restore");
      return;
    }

    if (userRole !== "ADMIN") {
      toast.error("Only Administrators can restore backups");
      return;
    }

    const confirmed = confirm(
      "CAUTION: Restoring a backup will overwrite the current live SQLite database. All records added after this backup will be replaced. Proceed?"
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Restore failed");
      }

      toast.success(
        `Database restored! Verified: ${data.metrics?.productCount} products, ${data.metrics?.movementCount} movements.`
      );
      setRestoreFile(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || "Database restore failed");
    } finally {
      setIsRestoring(false);
    }
  };

  const selectedLabelProd = products.find((p) => p.id === labelProductId) || products[0];

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-card border border-border text-xs font-semibold no-print">
        {[
          { id: "network", label: "Office LAN & QR", icon: Wifi },
          { id: "staff", label: `Staff & Users (${usersList.length})`, icon: Users },
          { id: "backup", label: "Backup & Restore", icon: HardDrive },
          { id: "profile", label: "Shop & Profile", icon: Building2 },
          { id: "labels", label: "Barcode Labels", icon: Tag },
          {
            id: "warranty",
            label: `Warranty Tracker (${warrantyExpiringItems.length})`,
            icon: Clock,
          },
          { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Office LAN & Mobile QR Code */}
      {activeTab === "network" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-500" />
                  <span>Host PC Office Network Access</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  StockDesk is bound to <code>0.0.0.0:{port}</code>. Any phone, tablet, or PC on this office Wi-Fi can open it.
                </p>
              </div>

              {/* URL Display Box */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-semibold">
                    Local Office LAN Address
                  </span>
                  <span className="text-base font-mono font-bold text-foreground">
                    {networkUrl}
                  </span>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-xs"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "Copied" : "Copy URL"}</span>
                </button>
              </div>

              {/* Windows Firewall Configuration Instructions */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">
                    Windows Firewall Rule (One-Time Host PC Setup)
                  </span>
                  <button
                    onClick={handleCopyFirewallCmd}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                  >
                    {copiedFirewall ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFirewall ? "Copied" : "Copy Command"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  If another device on the Wi-Fi cannot open the link, allow Port {port} through Windows Firewall by running PowerShell as Administrator:
                </p>
                <pre className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  netsh advfirewall firewall add rule name=&quot;StockDesk Host&quot; dir=in action=allow protocol=TCP localport={port}
                </pre>
              </div>

              {/* Auto Start-on-Boot Setup Guide */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                <span className="text-xs font-bold text-foreground">
                  Host PC Auto-Start on Boot (pm2 or Windows Task Scheduler)
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To ensure StockDesk restarts automatically whenever the host PC boots up without manual intervention:
                </p>
                <div className="p-2.5 rounded-lg bg-muted font-mono text-[11px] text-foreground space-y-1">
                  <div>npm install -g pm2</div>
                  <div>pm2 start npm --name &quot;stockdesk&quot; -- start</div>
                  <div>pm2 save &amp;&amp; pm2-startup install</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Large Mobile QR Code */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div>
              <h3 className="font-bold text-sm text-foreground">Scan to Open on Phone</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Connect your phone to office Wi-Fi, open camera, and scan:
              </p>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                <img
                  src={qrCodeDataUrl}
                  alt="StockDesk Local Network QR Code"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              </div>
            ) : (
              <div className="w-56 h-56 bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                Generating QR...
              </div>
            )}

            <div className="text-[11px] font-mono text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {networkUrl}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Backup & Recovery */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <span>SQLite Database Backup &amp; Disaster Recovery</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automated snapshots of <code>./data/stockdesk.db</code> &amp; CSV records with 30-day rotation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBackingUp}
                  onClick={handleCreateBackup}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isBackingUp ? "animate-spin" : ""}`} />
                  <span>{isBackingUp ? "Backing up..." : "Create Backup Now"}</span>
                </button>

                <a
                  href="/api/backup/download"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Live DB</span>
                </a>
              </div>
            </div>

            {/* Backup Status Bar */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Last Successful Backup:</span>{" "}
                <strong className="text-foreground">
                  {lastBackupAt ? formatIST(lastBackupAt) : "Never"}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Retention: Last 30 Snapshots Preserved
                </span>
              </div>
            </div>

            {/* Secondary Backup Destination */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Secondary Backup Folder (Optional USB Drive / Google Drive Sync Folder)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={secondaryPath}
                  onChange={(e) => setSecondaryPath(e.target.value)}
                  placeholder="e.g. E:\Backups\StockDesk or D:\GoogleDrive\StockDeskBackups"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                >
                  Save Path
                </button>
              </div>
            </div>

            {/* Restore from Backup (Admin Only) */}
            <form
              onSubmit={handleRestoreSubmit}
              className="p-5 rounded-xl border-2 border-dashed border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20 space-y-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="font-bold text-xs text-rose-800 dark:text-rose-200">
                    Restore Database from Backup (Admin Role Only)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select a valid <code>.db</code> snapshot file. Confirmation preview will be shown before overwriting live records.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  accept=".db"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                />

                <button
                  type="submit"
                  disabled={!restoreFile || isRestoring || userRole !== "ADMIN"}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {isRestoring ? "Restoring Database..." : "Execute Database Restore"}
                </button>
              </div>
            </form>

            {/* Backups Archive Table */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs text-foreground">
                Saved Backup Archives in <code>./data/backups/</code>
              </h3>

              <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                      <th className="p-2.5">File Name</th>
                      <th className="p-2.5">Created At</th>
                      <th className="p-2.5 text-right">Size</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          No backup files generated yet.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b) => (
                        <tr key={b.name} className="hover:bg-muted/30">
                          <td className="p-2.5 font-mono text-foreground font-medium">
                            {b.name}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {formatIST(b.createdAt)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">
                            {(b.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="p-2.5 text-right">
                            <a
                              href={`/api/backup/download?file=${encodeURIComponent(b.name)}`}
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Staff &amp; User Accounts</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage office staff members, roles, permissions, and account activation.
                </p>
              </div>

              {userRole === "ADMIN" && (
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Staff Member</span>
                </button>
              )}
            </div>

            {/* Staff list table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3 text-center">Role</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-foreground flex items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{u.email}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === "ADMIN"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                  : u.role === "MANAGER"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.active
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {u.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatIST(u.createdAt, false)}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {(userRole === "ADMIN" || isSelf) && (
                                <button
                                  onClick={() => {
                                    setEditingStaffUser(u);
                                    setEditStaffName(u.name);
                                    setEditStaffRole(u.role);
                                    setEditStaffPassword("");
                                  }}
                                  title="Rename / Edit User"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors"
                                >
                                  <Edit2 className="w-3 h-3 text-primary" />
                                  <span>Rename / Edit</span>
                                </button>
                              )}

                              {userRole === "ADMIN" && !isSelf && (
                                <button
                                  onClick={() => handleToggleStaffActive(u)}
                                  title={u.active ? "Deactivate User" : "Activate User"}
                                  className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                                    u.active
                                      ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  }`}
                                >
                                  {u.active ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>Add New Staff Member</span>
              </h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Full Name / Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@stockdesk.local"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Role &amp; Permissions</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                >
                  <option value="STAFF">Staff (Add &amp; view stock, scan barcode)</option>
                  <option value="MANAGER">Manager (Stock operations, purchase orders, retailers)</option>
                  <option value="ADMIN">Admin (Full access, staff management, backup/restore)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreatingStaff ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename / Edit Staff Modal */}
      {editingStaffUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                <span>Rename / Manage Staff</span>
              </h3>
              <button
                onClick={() => setEditingStaffUser(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Rename User Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Email</label>
                <input
                  type="text"
                  disabled
                  value={editingStaffUser.email}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground font-mono"
                />
              </div>

              {userRole === "ADMIN" && (
                <div>
                  <label className="block font-semibold text-foreground mb-1">Role</label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value)}
                    disabled={editingStaffUser.id === currentUser?.id}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground disabled:opacity-50"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Reset Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  placeholder="New password"
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffUser(null)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStaff}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdatingStaff ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Shop Profile & Defaults & User Profile */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* User Display Name Rename Section */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>My User Profile (Rename User Name)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Change your user display name shown across the system and receipts.
              </p>
            </div>

            <form onSubmit={handleRenameSelf} className="flex flex-col sm:flex-row gap-3 items-end max-w-lg text-xs">
              <div className="flex-1 w-full">
                <label className="block font-semibold text-foreground mb-1">Your Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground font-bold"
                  placeholder="Enter your name"
                />
              </div>
              <button
                type="submit"
                disabled={isRenamingProfile || !displayName.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-sm transition-colors disabled:opacity-50"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isRenamingProfile ? "Updating..." : "Update Name"}</span>
              </button>
            </form>
          </div>

          <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Shop Profile &amp; Billing Defaults</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                These details appear on printed Stock Reports, Purchase Orders, and customer receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">Shop / Business Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background font-bold text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={shopTagline}
                  onChange={(e) => setShopTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-foreground mb-1">Shop Address</label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">City, State &amp; Pincode</label>
                <input
                  type="text"
                  value={shopCity}
                  onChange={(e) => setShopCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={shopGstin}
                  onChange={(e) => setShopGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Phone Number</label>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Billing Email</label>
                <input
                  type="email"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Owner Email (For Weekly CSV Stock Summary &amp; System Alerts)
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Default Peripheral GST %</label>
                <select
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  <option value="18">18% (Standard Computer Peripherals)</option>
                  <option value="12">12%</option>
                  <option value="28">28%</option>
                  <option value="5">5%</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Barcode Label Generator */}
      {activeTab === "labels" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <span>Peripheral Barcode &amp; Shelf Label Generator</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate sticker sheet labels for inventory shelving and peripheral packaging
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Sheet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-foreground mb-1">Select Peripheral</label>
                <select
                  value={labelProductId}
                  onChange={(e) => setLabelProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Number of Stickers</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={labelQuantity}
                  onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                />
              </div>
            </div>
          </div>

          {/* Sticker Preview Grid (Printable) */}
          <div className="printable-area p-6 bg-white dark:bg-card border border-border rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: labelQuantity }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 border-2 border-dashed border-slate-300 rounded-lg text-center bg-white text-slate-900 flex flex-col justify-between h-40 shadow-xs"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                    {shopName}
                  </div>
                  <div className="font-bold text-xs leading-tight line-clamp-2 text-slate-900 my-1">
                    {selectedLabelProd?.name}
                  </div>
                  <div className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 py-0.5 rounded">
                    SKU: {selectedLabelProd?.sku}
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wide">
                    Stock SKU: {selectedLabelProd?.sku}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    {selectedLabelProd?.barcode || "097855065551"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Warranty Tracker */}
      {activeTab === "warranty" && (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Warranty Tracker (Expiring in 30 Days)</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Peripherals whose distributor or customer warranty period is concluding shortly
            </p>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                  <th className="p-3">Peripheral</th>
                  <th className="p-3 font-mono">SKU</th>
                  <th className="p-3 text-center">Warranty</th>
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {warrantyExpiringItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No peripherals with warranty expiring in the next 30 days.
                    </td>
                  </tr>
                ) : (
                  warrantyExpiringItems.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 font-semibold text-foreground">{p.name}</td>
                      <td className="p-3 font-mono">{p.sku}</td>
                      <td className="p-3 text-center">{p.warrantyMonths} Months</td>
                      <td className="p-3">{formatIST(p.purchaseDate, false)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Expiring Soon
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Keyboard Shortcuts */}
      {activeTab === "shortcuts" && (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              <span>Keyboard Shortcuts &amp; Rapid Operations</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Navigate and manage inventory without taking your hands off the keyboard
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
            {[
              { key: "/", desc: "Open Global Search modal (peripherals, SKU, barcode)" },
              { key: "N", desc: "Open Add New Stock form" },
              { key: "P", desc: "Open Print Stock Report (when on /stock or /reports)" },
              { key: "ESC", desc: "Close any open dialog or scanner modal" },
              { key: "Enter", desc: "Save / submit active form" },
              { key: "USB Scanner", desc: "Scan barcode instantly opens 'Add Quantity' modal" },
            ].map((s) => (
              <div
                key={s.key}
                className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between"
              >
                <span className="text-muted-foreground">{s.desc}</span>
                <kbd className="px-2.5 py-1 rounded bg-background border border-border font-mono font-bold text-xs text-foreground shadow-xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
