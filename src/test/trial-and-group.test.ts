import { describe, expect, it } from "vitest";
import {
  TRIAL_SECONDS,
  trialExpired,
  groupPaymentPrice,
  accountDeletionAllowed,
} from "../lib/experience-rules";

describe("Trial and group purchase rules", () => {
  it("ends the trial at five seconds, not before", () => {
    expect(TRIAL_SECONDS).toBe(5);
    expect(trialExpired(4.99)).toBe(false);
    expect(trialExpired(5)).toBe(true);
  });
  it("charges the price set for the selected group rather than a video package", () => {
    expect(groupPaymentPrice({ is_paid: true, price: 15000 })).toBe(15000);
    expect(groupPaymentPrice({ is_paid: true, price: 3000 })).toBe(3000);
    expect(groupPaymentPrice({ is_paid: false, price: 15000 })).toBe(0);
  });
  it("requires full-administrator access to delete a registered account", () => {
    expect(accountDeletionAllowed(false, false, false)).toBe(false);
    expect(accountDeletionAllowed(true, false, false)).toBe(true);
  });
  it("protects the current account and staff accounts from account cleanup", () => {
    expect(accountDeletionAllowed(true, true, false)).toBe(false);
    expect(accountDeletionAllowed(true, false, true)).toBe(false);
  });
});
