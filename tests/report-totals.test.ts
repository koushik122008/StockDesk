import { describe, it, expect } from "vitest";

interface ProductReportRow {
  sku: string;
  name: string;
  quantity: number;
  minReorderLevel: number;
  purchasePricePaise: number;
  sellingPricePaise: number;
  retailer: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    city: string;
    gstin: string;
  };
}

function calculateReportTotals(products: ProductReportRow[]) {
  let totalUnits = 0;
  let totalCostPaise = 0;
  let totalRetailPaise = 0;
  let lowStockCount = 0;

  for (const p of products) {
    totalUnits += p.quantity;
    totalCostPaise += p.quantity * p.purchasePricePaise;
    totalRetailPaise += p.quantity * p.sellingPricePaise;
    if (p.quantity <= p.minReorderLevel) {
      lowStockCount++;
    }
  }

  return {
    totalSkus: products.length,
    totalUnits,
    totalCostPaise,
    totalRetailPaise,
    lowStockCount,
  };
}

describe("Stock Report & Valuation Totals", () => {
  const sampleProducts: ProductReportRow[] = [
    {
      sku: "LOG-KB-K120",
      name: "Logitech K120 Keyboard",
      quantity: 10,
      minReorderLevel: 5,
      purchasePricePaise: 42500, // ₹425
      sellingPricePaise: 59900,  // ₹599
      retailer: {
        name: "Infotech Distribution Pvt Ltd",
        contactPerson: "Rajesh Gupta",
        phone: "+91 98201 12345",
        email: "sales@infotechdist.in",
        city: "Mumbai",
        gstin: "27AABCI1234A1Z5",
      },
    },
    {
      sku: "DEL-MN-2421",
      name: "Dell 24-inch Monitor",
      quantity: 2, // Low stock (<= 3)
      minReorderLevel: 3,
      purchasePricePaise: 920000, // ₹9,200
      sellingPricePaise: 1149900, // ₹11,499
      retailer: {
        name: "Apex Peripherals & Components",
        contactPerson: "Sanjay Verma",
        phone: "+91 98110 98765",
        email: "orders@apexperipherals.com",
        city: "New Delhi",
        gstin: "07AAACA9876B1ZQ",
      },
    },
    {
      sku: "RED-KB-552",
      name: "Redragon Mechanical Keyboard",
      quantity: 0, // Out of stock (<= 4)
      minReorderLevel: 4,
      purchasePricePaise: 210000, // ₹2,100
      sellingPricePaise: 279900,  // ₹2,799
      retailer: {
        name: "Prime Comps Hub",
        contactPerson: "Mohan Lal",
        phone: "+91 98401 77889",
        email: "sales@primecomps.com",
        city: "Chennai",
        gstin: "33AAACP4455E1ZO",
      },
    },
  ];

  it("calculates accurate stock metrics without float rounding errors", () => {
    const totals = calculateReportTotals(sampleProducts);

    expect(totals.totalSkus).toBe(3);
    expect(totals.totalUnits).toBe(12); // 10 + 2 + 0

    // Cost: 10 * 42500 + 2 * 920000 + 0 = 425000 + 1840000 = 2265000 paise (₹22,650.00)
    expect(totals.totalCostPaise).toBe(2265000);

    // Retail: 10 * 59900 + 2 * 1149900 + 0 = 599000 + 2299800 = 2898800 paise (₹28,988.00)
    expect(totals.totalRetailPaise).toBe(2898800);

    // Low stock: Dell (2 <= 3) and Redragon (0 <= 4) -> 2 items
    expect(totals.lowStockCount).toBe(2);
  });

  it("verifies that all required retailer columns are populated on every row", () => {
    for (const p of sampleProducts) {
      expect(p.retailer.name).toBeTruthy();
      expect(p.retailer.contactPerson).toBeTruthy();
      expect(p.retailer.phone).toBeTruthy();
      expect(p.retailer.email).toBeTruthy();
      expect(p.retailer.city).toBeTruthy();
      expect(p.retailer.gstin).toMatch(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/);
    }
  });
});
