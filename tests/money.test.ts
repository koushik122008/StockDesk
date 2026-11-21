import { describe, it, expect } from "vitest";
import { formatPaise, rupeeToPaise, paiseToRupeeNumber } from "@/lib/money";

describe("Money Invariants & Conversion Logic", () => {
  it("converts float and string rupee values to integer paise without rounding errors", () => {
    expect(rupeeToPaise("425.00")).toBe(42500);
    expect(rupeeToPaise("425.50")).toBe(42550);
    expect(rupeeToPaise("7999.99")).toBe(799999);
    expect(rupeeToPaise("₹1,249.00")).toBe(124900);
    expect(rupeeToPaise(100)).toBe(10000);
    expect(rupeeToPaise(0)).toBe(0);
  });

  it("converts integer paise to rupee number", () => {
    expect(paiseToRupeeNumber(42500)).toBe(425);
    expect(paiseToRupeeNumber(42550)).toBe(425.5);
    expect(paiseToRupeeNumber(0)).toBe(0);
  });

  it("formats paise integers to Indian Rupee currency strings", () => {
    const formatted = formatPaise(42500);
    expect(formatted).toContain("425.00");
    expect(formatPaise(0)).toContain("0.00");
    expect(formatPaise(null)).toContain("0.00");
  });
});
