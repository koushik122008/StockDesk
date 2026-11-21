export type Role = "ADMIN" | "MANAGER" | "STAFF";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type StockMovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT"
  | "RETURN_RMA"
  | "DAMAGED"
  | "TRANSFER";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export type SerialStatus = "IN_STOCK" | "SOLD" | "DEFECTIVE" | "RETURNED";

export interface ProductWithRelations {
  id: string;
  name: string;
  brandId: string;
  brand: { id: string; name: string };
  model: string;
  sku: string;
  barcode: string | null;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  quantity: number;
  minReorderLevel: number;
  purchasePricePaise: number;
  sellingPricePaise: number;
  gstRate: number;
  warrantyMonths: number;
  rackLocation: string;
  version: number;
  imagePath: string | null;
  invoiceNo: string | null;
  purchaseDate: Date | string | null;
  notes: string | null;
  tags: string | null;
  alertArmed: boolean;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  retailers?: Array<{
    id: string;
    retailerId: string;
    lastPurchasePricePaise: number;
    lastPurchaseDate: Date | string;
    isPrimary: boolean;
    retailerSku: string | null;
    retailer: {
      id: string;
      name: string;
      contactPerson: string;
      phone: string;
      altPhone: string | null;
      email: string;
      city: string;
      state: string;
      pincode: string;
      gstin: string;
      paymentTerms: string;
    };
  }>;
}

export interface RetailerSummary {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  altPhone: string | null;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  paymentTerms: string;
  notes: string | null;
  rating: number;
  active: boolean;
  productCount?: number;
  totalPurchasePaise?: number;
}
