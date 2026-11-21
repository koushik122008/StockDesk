import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise integer into Indian Rupee currency string
 * e.g. 42500 paise -> "₹425.00"
 */
export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || isNaN(paise)) return "₹0.00";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert Rupee input (string or number) into integer Paise
 * e.g. "425.50" -> 42550
 */
export function rupeeToPaise(val: string | number): number {
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }
  return Math.round(val * 100);
}

/**
 * Convert Paise integer into Rupee number for inputs
 * e.g. 42500 -> 425
 */
export function paiseToRupeeNumber(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Format UTC date to Indian Standard Time (IST)
 */
export function formatIST(date: Date | string | null | undefined, includeTime = true): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      : {}),
  }).format(d);
}

/**
 * Format date for HTML input type="date" (YYYY-MM-DD)
 */
export function formatInputDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}
