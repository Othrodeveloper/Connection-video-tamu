import { describe, expect, it } from "vitest";
import {
  generatePinCode,
  normalizePinCode,
  validateAccessTokenForRedemption,
  type AccessTokenRecord,
} from "@/lib/access-token";

const baseToken: AccessTokenRecord = {
  id: "tok-1",
  code: "TV-7K9M-3P2X",
  user_id: "user-1",
  package_id: "pkg-week",
  group_id: null,
  package_name: "Wiki 1",
  duration_days: 7,
  amount: 3000,
  created_by: "admin-1",
  created_at: "2026-01-01T00:00:00.000Z",
  used_at: null,
};

describe("Access PIN tokens", () => {
  it("generates TV-XXXX-XXXX codes without ambiguous characters", () => {
    const code = generatePinCode((i) => i * 3);
    expect(code).toMatch(/^TV-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toMatch(/[01IO]/);
  });

  it("normalizes whitespace and lowercase user input", () => {
    expect(normalizePinCode("  tv-7k9m-3p2x ")).toBe("TV-7K9M-3P2X");
  });

  it("accepts a matching unused token for the registered owner and package", () => {
    expect(
      validateAccessTokenForRedemption(baseToken, {
        userId: "user-1",
        packageId: "pkg-week",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects tokens generated for a different user account", () => {
    const res = validateAccessTokenForRedemption(baseToken, {
      userId: "user-2",
      packageId: "pkg-week",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects tokens already used or missing", () => {
    expect(
      validateAccessTokenForRedemption(null, { userId: "user-1", packageId: "pkg-week" }).ok,
    ).toBe(false);
    expect(
      validateAccessTokenForRedemption(
        { ...baseToken, used_at: "2026-01-02T00:00:00.000Z" },
        { userId: "user-1", packageId: "pkg-week" },
      ).ok,
    ).toBe(false);
  });

  it("rejects tokens redeemed against a different package or group", () => {
    expect(
      validateAccessTokenForRedemption(baseToken, {
        userId: "user-1",
        packageId: "pkg-month",
      }).ok,
    ).toBe(false);
    expect(
      validateAccessTokenForRedemption(baseToken, {
        userId: "user-1",
        groupId: "grp-1",
      }).ok,
    ).toBe(false);
  });
});
