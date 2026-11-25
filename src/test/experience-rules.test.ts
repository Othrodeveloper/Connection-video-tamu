import { describe, expect, it } from "vitest";
import {
  channelDue,
  whatsappChannel,
  preferredWhatsappChannel,
  paymentStepValid,
  PAYMENT_WAIT_SECONDS,
  countdownTone,
  paymentCountdownTone,
  CHANNEL_REMINDER_MS,
  MANUAL_NOTICE_SECONDS,
  MANUAL_PAYMENT_WARNING,
  REFERRAL_SIGNUP_MINUTES,
  dailyManualNameColorClass,
  filterVisiblePaymentHistory,
  packageHighlights,
} from "@/lib/experience-rules";
import { timeLeft } from "@/lib/format";

describe("Viewing and payment rules", () => {
  it("shows a new account invitation immediately", () => {
    expect(channelDue(null, null, 1000)).toBe(true);
  });
  it("reminds an account that pressed Back after exactly ten minutes", () => {
    expect(CHANNEL_REMINDER_MS).toBe(600000);
    expect(channelDue(1000, null, 600999)).toBe(false);
    expect(channelDue(1000, null, 601000)).toBe(true);
  });
  it("never shows the invitation again after Follow", () => {
    expect(channelDue(null, 1000, 1000000)).toBe(false);
    expect(channelDue(1000, 2000, 1000000)).toBe(false);
  });
  it("Follow opens only a real HTTPS WhatsApp channel address", () => {
    expect(whatsappChannel("https://whatsapp.com/channel/0029Example")).toBe(
      "https://whatsapp.com/channel/0029Example",
    );
    expect(whatsappChannel("https://whatsapp.com.evil.example/channel/0029Example")).toBeNull();
    expect(whatsappChannel("javascript:alert(1)")).toBeNull();
  });
  it("uses the Support channel link when the separate channel field is empty", () => {
    expect(preferredWhatsappChannel("", "https://whatsapp.com/channel/0029Support")).toBe(
      "https://whatsapp.com/channel/0029Support",
    );
    expect(
      preferredWhatsappChannel(
        "https://whatsapp.com/channel/0029Main",
        "https://whatsapp.com/channel/0029Support",
      ),
    ).toBe("https://whatsapp.com/channel/0029Main");
  });
  it("uses two steps: package selection, then name and valid phone confirmation", () => {
    expect(paymentStepValid(1, null, "", null)).toBe(false);
    expect(paymentStepValid(1, "package", "", null)).toBe(true);
    expect(paymentStepValid(2, "package", "", null)).toBe(false);
    expect(paymentStepValid(2, "package", "Amina", null)).toBe(false);
    expect(paymentStepValid(2, "package", "Amina", "255765902345")).toBe(true);
    expect(paymentStepValid(2, null, "Amina", "255765902345")).toBe(false);
  });
  it("waits ninety seconds for a phone payment", () => {
    expect(PAYMENT_WAIT_SECONDS).toBe(90);
  });
  it("counts seconds and never counts below zero", () => {
    expect(timeLeft("2026-11-21T14:00:05Z", Date.parse("2026-11-21T14:00:00Z")).seconds).toBe(5);
    expect(timeLeft("2026-11-21T14:00:00Z", Date.parse("2026-11-21T14:00:05Z")).totalMs).toBe(0);
  });
  it("shows green for time remaining and red near expiry", () => {
    expect(countdownTone(3_600_001)).toBe("healthy");
    expect(countdownTone(3_600_000)).toBe("urgent");
    expect(countdownTone(0)).toBe("urgent");
  });
  it("turns the payment countdown red for the final thirty seconds", () => {
    expect(paymentCountdownTone(31)).toBe("healthy");
    expect(paymentCountdownTone(30)).toBe("urgent");
    expect(paymentCountdownTone(0)).toBe("urgent");
  });
  it("enforces 4-second manual warning notice and 20-minute referral signup gift", () => {
    expect(MANUAL_NOTICE_SECONDS).toBe(4);
    expect(MANUAL_PAYMENT_WARNING).toContain("HAIRUHUSIWI KUSHARE HIYO PIN");
    expect(REFERRAL_SIGNUP_MINUTES).toBe(20);
  });
  it("cycles manual recipient name color daily across green, white, and orange", () => {
    const d0 = dailyManualNameColorClass(new Date(Date.UTC(2026, 10, 24)));
    const d1 = dailyManualNameColorClass(new Date(Date.UTC(2026, 10, 25)));
    const d2 = dailyManualNameColorClass(new Date(Date.UTC(2026, 10, 26)));
    const d3 = dailyManualNameColorClass(new Date(Date.UTC(2026, 10, 27)));
    expect(new Set([d0, d1, d2])).toEqual(
      new Set(["text-success", "text-foreground", "text-orange"]),
    );
    expect(d3).toBe(d0);
  });
  it("hides pending ACCESS_PIN vouchers from customer payment history while keeping redeemed ones", () => {
    const rows = [
      { id: "1", channel: "ACCESS_PIN", status: "pending" },
      { id: "2", channel: "ACCESS_PIN", status: "paid" },
      { id: "3", channel: null, status: "pending" },
    ];
    expect(filterVisiblePaymentHistory(rows).map((r) => r.id)).toEqual(["2", "3"]);
  });
  it("builds TV-style package benefits including custom description", () => {
    const perks = packageHighlights({ duration_days: 7, description: "Familia na Watoto" });
    expect(perks[0]).toContain("Siku 7");
    expect(perks).toContain("Familia na Watoto");
  });
});
