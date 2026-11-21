import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import { formatPaise, formatIST } from "@/lib/money";
import {
  Building2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Star,
  ArrowLeft,
  Package,
  FileText,
  Clock,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RetailerDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSqlitePragmas();
  const { id } = await params;

  const retailer = await prisma.retailer.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: {
            include: { brand: true, category: true },
          },
        },
      },
      purchaseOrders: {
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!retailer || retailer.deletedAt) {
    notFound();
  }

  const phoneClean = retailer.phone.replace(/[^0-9]/g, "");
  const waText = encodeURIComponent(
    `Hello ${retailer.contactPerson}, this is StockDesk Computer Peripherals. Reaching out regarding our active orders and inventory supply.`
  );

  let totalLifetimePurchasesPaise = 0;
  for (const po of retailer.purchaseOrders) {
    if (po.status !== "CANCELLED") {
      totalLifetimePurchasesPaise += po.totalPaise;
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/retailers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Distributors</span>
        </Link>
      </div>

      {/* Distributor Hero Dossier Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {retailer.name}
                </h1>
                <p className="text-xs font-medium text-primary">
                  Contact: {retailer.contactPerson}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`tel:${phoneClean}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call ({retailer.phone})</span>
            </a>

            <a
              href={`https://wa.me/${phoneClean}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>

            <a
              href={`mailto:${retailer.email}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
            >
              <Mail className="w-4 h-4 text-primary" />
              <span>Email</span>
            </a>

            <Link
              href={`/purchase-orders?retailerId=${retailer.id}&action=new`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create PO</span>
            </Link>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Address:</span>
            <span className="font-medium text-foreground">
              {retailer.address}, {retailer.city}, {retailer.state} {retailer.pincode}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">GSTIN:</span>
            <span className="font-mono font-bold text-foreground">{retailer.gstin}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Payment Terms:</span>
            <span className="font-semibold text-foreground">{retailer.paymentTerms}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Vendor Rating:</span>
            <div className="flex items-center gap-1 text-amber-500 font-bold mt-0.5">
              <span>{retailer.rating} / 5</span>
              <div className="flex">
                {Array.from({ length: retailer.rating || 5 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {retailer.notes && (
          <div className="text-xs text-muted-foreground bg-card p-3 rounded-lg border border-border">
            <span className="font-semibold text-foreground">Distributor Notes:</span> {retailer.notes}
          </div>
        )}
      </div>

      {/* Two Columns: Supplied Products & Purchase Order History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplied Peripherals */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-sm text-foreground">
                Peripherals Supplied ({retailer.products.length})
              </h2>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {retailer.products.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No peripherals currently linked to this distributor.
              </div>
            ) : (
              retailer.products.map((rp) => (
                <div
                  key={rp.id}
                  className="p-3 rounded-lg border border-border/80 bg-background flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-foreground">{rp.product.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                      <span>SKU: {rp.product.sku}</span>
                      <span>&bull;</span>
                      <span>Rack: {rp.product.rackLocation}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-foreground">
                      {formatPaise(rp.lastPurchasePricePaise)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Current Stock: <strong>{rp.product.quantity}</strong> units
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Purchase Orders Placed */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-sm text-foreground">
                Purchase Order History ({retailer.purchaseOrders.length})
              </h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Volume:{" "}
              <strong className="text-foreground">
                {formatPaise(totalLifetimePurchasesPaise)}
              </strong>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {retailer.purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No purchase orders generated for this distributor yet.
              </div>
            ) : (
              retailer.purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="p-3 rounded-lg border border-border/80 bg-background flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{po.poNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          po.status === "RECEIVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : po.status === "SENT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {po.items.length} line items &bull; Ordered on {formatIST(po.orderDate, false)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-foreground">{formatPaise(po.totalPaise)}</div>
                    <Link
                      href={`/purchase-orders?poNumber=${po.poNumber}`}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
