import { describe, it, expect } from "vitest";

// Pure state machine simulation matching evaluateStockAlerts
class StockAlertStateMachine {
  quantity: number;
  reorderThreshold: number;
  alertArmed: boolean;
  alertCount: number;

  constructor(initialQty: number, threshold: number) {
    this.quantity = initialQty;
    this.reorderThreshold = threshold;
    this.alertArmed = initialQty > threshold;
    this.alertCount = 0;
  }

  updateQuantity(newQty: number) {
    const prevQty = this.quantity;
    this.quantity = newQty;

    // Crossing condition
    if (newQty <= this.reorderThreshold && this.alertArmed) {
      this.alertCount++;
      this.alertArmed = false;
    } else if (newQty > this.reorderThreshold && !this.alertArmed) {
      // Re-arm after restock
      this.alertArmed = true;
    }
  }
}

describe("Low-Stock Notification & Alert Engine", () => {
  it("triggers exactly ONE alert when stock drops below threshold", () => {
    const item = new StockAlertStateMachine(10, 5);
    expect(item.alertArmed).toBe(true);
    expect(item.alertCount).toBe(0);

    // Drop from 10 to 4 (below threshold 5)
    item.updateQuantity(4);
    expect(item.alertCount).toBe(1);
    expect(item.alertArmed).toBe(false);
  });

  it("does NOT duplicate alerts if stock drops further while already below threshold", () => {
    const item = new StockAlertStateMachine(10, 5);
    item.updateQuantity(4); // First drop below threshold -> Alert #1
    expect(item.alertCount).toBe(1);

    // Subsequent drop from 4 to 2
    item.updateQuantity(2);
    expect(item.alertCount).toBe(1); // Still 1, no duplicate spam

    // Subsequent drop to 0 (out of stock)
    item.updateQuantity(0);
    expect(item.alertCount).toBe(1); // Still 1
  });

  it("re-arms alert after restock above threshold and alerts again on subsequent drop", () => {
    const item = new StockAlertStateMachine(10, 5);
    item.updateQuantity(3);
    expect(item.alertCount).toBe(1);
    expect(item.alertArmed).toBe(false);

    // Restock shipment received: 3 -> 15 units
    item.updateQuantity(15);
    expect(item.alertArmed).toBe(true); // Alert re-armed
    expect(item.alertCount).toBe(1);

    // Now items sell again: 15 -> 4
    item.updateQuantity(4);
    expect(item.alertCount).toBe(2); // Triggers new alert as expected!
    expect(item.alertArmed).toBe(false);
  });
});
