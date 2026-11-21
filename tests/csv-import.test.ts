import { describe, it, expect } from "vitest";
import { rupeeToPaise } from "@/lib/money";

interface CsvRow {
  name: string;
  brand: string;
  model: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

function processImportRows(
  existingProducts: Map<string, { quantity: number; purchasePricePaise: number }>,
  rows: CsvRow[],
  duplicateAction: "merge" | "skip"
) {
  let created = 0;
  let merged = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name || !row.name.trim()) {
      errors.push("Missing product name");
      continue;
    }

    const sku = row.sku ? row.sku.trim().toUpperCase() : "AUTO-SKU";
    const qty = Math.max(0, row.quantity || 0);

    if (existingProducts.has(sku)) {
      if (duplicateAction === "skip") {
        skipped++;
      } else if (duplicateAction === "merge") {
        const item = existingProducts.get(sku)!;
        item.quantity += qty;
        merged++;
      }
    } else {
      existingProducts.set(sku, {
        quantity: qty,
        purchasePricePaise: rupeeToPaise(row.purchasePrice),
      });
      created++;
    }
  }

  return { created, merged, skipped, errors };
}

describe("CSV Bulk Import & Duplicate Resolution", () => {
  it("imports new rows and generates valid quantities and prices", () => {
    const existing = new Map();
    const rows: CsvRow[] = [
      {
        name: "Logitech Keyboard",
        brand: "Logitech",
        model: "K120",
        sku: "LOG-KB-K120",
        quantity: 10,
        purchasePrice: 425,
        sellingPrice: 599,
      },
      {
        name: "Dell Mouse",
        brand: "Dell",
        model: "MS116",
        sku: "DEL-MS-116",
        quantity: 20,
        purchasePrice: 220,
        sellingPrice: 320,
      },
    ];

    const result = processImportRows(existing, rows, "merge");
    expect(result.created).toBe(2);
    expect(result.merged).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);
    expect(existing.get("LOG-KB-K120")?.quantity).toBe(10);
    expect(existing.get("DEL-MS-116")?.purchasePricePaise).toBe(22000);
  });

  it("handles duplicate SKUs with merge action by incrementing quantities", () => {
    const existing = new Map();
    existing.set("LOG-KB-K120", { quantity: 15, purchasePricePaise: 42500 });

    const rows: CsvRow[] = [
      {
        name: "Logitech Keyboard (New Batch)",
        brand: "Logitech",
        model: "K120",
        sku: "LOG-KB-K120",
        quantity: 10,
        purchasePrice: 430,
        sellingPrice: 599,
      },
    ];

    const result = processImportRows(existing, rows, "merge");
    expect(result.created).toBe(0);
    expect(result.merged).toBe(1);
    expect(existing.get("LOG-KB-K120")?.quantity).toBe(25); // 15 + 10
  });

  it("handles duplicate SKUs with skip action without changing stock", () => {
    const existing = new Map();
    existing.set("LOG-KB-K120", { quantity: 15, purchasePricePaise: 42500 });

    const rows: CsvRow[] = [
      {
        name: "Logitech Keyboard (Duplicate)",
        brand: "Logitech",
        model: "K120",
        sku: "LOG-KB-K120",
        quantity: 10,
        purchasePrice: 430,
        sellingPrice: 599,
      },
    ];

    const result = processImportRows(existing, rows, "skip");
    expect(result.skipped).toBe(1);
    expect(result.merged).toBe(0);
    expect(existing.get("LOG-KB-K120")?.quantity).toBe(15); // Unchanged
  });

  it("identifies and reports errors for invalid rows", () => {
    const existing = new Map();
    const rows: CsvRow[] = [
      {
        name: "",
        brand: "Unknown",
        model: "X",
        sku: "UNK-01",
        quantity: 5,
        purchasePrice: 100,
        sellingPrice: 150,
      },
    ];

    const result = processImportRows(existing, rows, "merge");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Missing product name");
  });
});
