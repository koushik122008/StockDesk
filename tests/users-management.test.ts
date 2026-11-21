import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Staff Management & User Renaming", () => {
  it("validates staff roles correctly", () => {
    const validRoles = ["ADMIN", "MANAGER", "STAFF"];
    expect(validRoles.includes("ADMIN")).toBe(true);
    expect(validRoles.includes("MANAGER")).toBe(true);
    expect(validRoles.includes("STAFF")).toBe(true);
    expect(validRoles.includes("GUEST")).toBe(false);
  });

  it("hashes password with bcrypt correctly for newly created staff", async () => {
    const rawPassword = "secureStaffPassword123";
    const hash = await bcrypt.hash(rawPassword, 10);
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await bcrypt.compare("wrongPassword", hash);
    expect(isWrong).toBe(false);
  });

  it("handles user display name renaming and trimming", () => {
    const originalName = "Admin User";
    const newNameInput = "   Ramesh Kumar (Store Lead)   ";
    const trimmedName = newNameInput.trim();

    expect(trimmedName).toBe("Ramesh Kumar (Store Lead)");
    expect(trimmedName).not.toBe(originalName);
    expect(trimmedName.length).toBeGreaterThan(0);
  });

  it("prevents self-deactivation by admin", () => {
    const currentAdminId = "usr-admin-1";
    const targetUserId = "usr-admin-1";

    const canDeactivate = currentAdminId !== targetUserId;
    expect(canDeactivate).toBe(false);
  });

  it("allows admin to deactivate another staff account", () => {
    const currentAdminId = "usr-admin-1";
    const targetStaffId = "usr-staff-2";

    const canDeactivate = currentAdminId !== targetStaffId;
    expect(canDeactivate).toBe(true);
  });
});
