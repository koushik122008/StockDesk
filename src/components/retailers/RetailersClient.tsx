"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users2,
  Plus,
  Phone,
  MessageSquare,
  Mail,
  Building2,
  MapPin,
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Check,
  Search,
} from "lucide-react";
import { formatPaise } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface RetailersClientProps {
  initialRetailers: any[];
}

export function RetailersClient({ initialRetailers }: RetailersClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [retailers, setRetailers] = useState<any[]>(initialRetailers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<any | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingRetailer(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setAltPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
    setGstin("");
    setPaymentTerms("Net 30");
    setRating(5);
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (r: any) => {
    setEditingRetailer(r);
    setName(r.name);
    setContactPerson(r.contactPerson);
    setPhone(r.phone);
    setAltPhone(r.altPhone || "");
    setEmail(r.email);
    setAddress(r.address || "");
    setCity(r.city || "");
    setState(r.state || "");
    setPincode(r.pincode || "");
    setGstin(r.gstin);
    setPaymentTerms(r.paymentTerms || "Net 30");
    setRating(r.rating || 5);
    setNotes(r.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactPerson || !phone || !email || !gstin) {
      toast.error("Please fill in all required fields (Name, Contact, Phone, Email, GSTIN)");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingRetailer ? `/api/retailers/${editingRetailer.id}` : "/api/retailers";
      const method = editingRetailer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactPerson,
          phone,
          altPhone: altPhone || undefined,
          email,
          address,
          city,
          state,
          pincode,
          gstin,
          paymentTerms,
          rating,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save distributor");
      }

      toast.success(editingRetailer ? "Distributor updated" : "Distributor added successfully");
      setIsModalOpen(false);
      router.refresh();
      // Update local state
      if (editingRetailer) {
        setRetailers((prev) =>
          prev.map((r) => (r.id === editingRetailer.id ? { ...r, ...data.retailer } : r))
        );
      } else {
        setRetailers((prev) => [...prev, { ...data.retailer, productCount: 0, totalPurchasesPaise: 0 }]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save distributor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, rName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${rName}? Existing product links and movements will be preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/retailers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Distributor ${rName} deactivated`);
        setRetailers((prev) => prev.filter((r) => r.id !== id));
      } else {
        toast.error("Failed to deactivate distributor");
      }
    } catch (err) {
      toast.error("Error deleting distributor");
    }
  };

  const filtered = retailers.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.contactPerson.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.gstin.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="w-6 h-6 text-primary" />
            <span>Distributor &amp; Retailer Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suppliers, authorized IT distributors, payment terms, and direct reorder channels
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Distributor</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-card border border-border rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search distributors by company name, contact person, phone, city, or GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background"
          />
        </div>
      </div>

      {/* Retailers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const phoneClean = r.phone.replace(/[^0-9]/g, "");
          const waText = encodeURIComponent(
            `Hello ${r.contactPerson}, this is StockDesk Computer Peripherals. Reaching out regarding an inventory reorder inquiry.`
          );

          return (
            <div
              key={r.id}
              className="p-5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {r.name}
                    </h3>
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {r.contactPerson}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {r.address ? `${r.address}, ` : ""}
                      {r.city}, {r.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="font-semibold text-foreground">GSTIN:</span>
                    <span>{r.gstin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-foreground">
                      Terms: {r.paymentTerms}
                    </span>
                    <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-semibold text-foreground">
                      {r.productCount || 0} Peripherals
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {/* Call */}
                  <a
                    href={`tel:${phoneClean}`}
                    className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    title={`Call ${r.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${phoneClean}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${r.email}`}
                    className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                    title={`Email ${r.email}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" />
                  </a>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/retailers/${r.id}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1"
                  >
                    <span>Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md"
                    title="Edit Distributor"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(r.id, r.name)}
                    className="p-1.5 text-muted-foreground hover:text-rose-600 rounded-md"
                    title="Deactivate Distributor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Retailer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{editingRetailer ? "Edit Distributor" : "Add New Distributor"}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Company / Trade Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Infotech Distribution Pvt Ltd"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Gupta"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Phone (Primary) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 12345"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Alt Phone (optional)
                  </label>
                  <input
                    type="text"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="+91 98201 54321"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sales@infotechdist.in"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="104, Lamington Road"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    GSTIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AABCI1234A1Z5"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 21">Net 21 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Reliability Rating (1-5)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                  >
                    <option value={5}>5 Stars (Excellent)</option>
                    <option value={4}>4 Stars (Good)</option>
                    <option value={3}>3 Stars (Average)</option>
                    <option value={2}>2 Stars (Slow)</option>
                    <option value={1}>1 Star (Poor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Notes &amp; Authorized Brands
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Authorized distributor for Logitech, SanDisk. Fast warranty processing."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save Distributor"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
