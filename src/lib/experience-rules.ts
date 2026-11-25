export const CHANNEL_REMINDER_MS = 10 * 60 * 1000;
export const PAYMENT_WAIT_SECONDS = 90;
export const TRIAL_SECONDS = 5;
export const MANUAL_NOTICE_SECONDS = 4;
export const REFERRAL_SIGNUP_MINUTES = 20;
export const REFERRAL_REWARD_DAYS_DEFAULT = 1;

export const MANUAL_PAYMENT_WARNING =
  "LIPIA KWA KUTUMA HELA KWA NAMBA KAWAIDA NA UKITUMA BASI UTAPEWA ACCES PIN KULINGANA NA PACKAGE YAKO HAIRUHUSIWI KUSHARE HIYO PIN";

export function trialExpired(seconds: number) {
  return seconds >= TRIAL_SECONDS;
}
export function groupPaymentPrice(group: { is_paid: boolean; price: number }) {
  return group.is_paid ? group.price : 0;
}
export function accountDeletionAllowed(
  fullAdmin: boolean,
  sameAccount: boolean,
  protectedAccount: boolean,
) {
  return fullAdmin && !sameAccount && !protectedAccount;
}

/** New accounts see the invitation immediately; Back snoozes it, Follow stops it permanently. */
export function channelDue(dismissedAt: number | null, followedAt: number | null, now: number) {
  if (followedAt !== null) return false;
  if (dismissedAt === null) return true;
  return now - dismissedAt >= CHANNEL_REMINDER_MS;
}

export function whatsappChannel(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "whatsapp.com" &&
      /^\/channel\/[^/]+\/?$/.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function preferredWhatsappChannel(channelValue: string, supportValue: string) {
  return whatsappChannel(channelValue) ?? whatsappChannel(supportValue);
}

export function countdownTone(totalMs: number) {
  return totalMs <= 60 * 60 * 1000 ? "urgent" : "healthy";
}
export function paymentCountdownTone(seconds: number) {
  return seconds <= 30 ? "urgent" : "healthy";
}

/** The checkout has two steps: selection, then name/phone or Access PIN confirmation. */
export function paymentStepValid(
  step: number,
  packageId: string | null,
  name: string,
  phone: string | null,
) {
  if (step === 1) return !!packageId;
  return !!packageId && name.trim().length >= 2 && !!phone;
}

const DAILY_MANUAL_NAME_TONES = ["text-success", "text-foreground", "text-orange"] as const;

/** Rotates the manual payment recipient name color daily across green, white, and orange. */
export function dailyManualNameColorClass(
  date: Date = new Date(),
): (typeof DAILY_MANUAL_NAME_TONES)[number] {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
  const idx =
    ((dayNumber % DAILY_MANUAL_NAME_TONES.length) + DAILY_MANUAL_NAME_TONES.length) %
    DAILY_MANUAL_NAME_TONES.length;
  return DAILY_MANUAL_NAME_TONES[idx]!;
}

/** Hide unredeemed Access PIN vouchers from the customer's payment history until they are used. */
export function filterVisiblePaymentHistory<T extends { channel?: string | null; status: string }>(
  rows: T[],
): T[] {
  return rows.filter((r) => !(r.channel === "ACCESS_PIN" && r.status === "pending"));
}

/** Build TV-decoder-style benefits for a streaming package card. */
export function packageHighlights(pkg: {
  duration_days: number;
  description?: string | null;
}): string[] {
  const days = Math.max(1, Number(pkg.duration_days || 1));
  const durationLine =
    days === 1
      ? "Uhalali wa Saa 24 Kamili"
      : days === 7
        ? "Uhalali wa Siku 7 Kamili"
        : `Uhalali wa Siku ${days} Kamili`;
  const perks = [
    durationLine,
    "Filamu & Tamthilia zote bila kikomo",
    "Ubora wa HD / 720p & Subtitles za Kiswahili",
  ];
  const extra = pkg.description?.trim();
  if (extra && !perks.some((p) => p.toLowerCase() === extra.toLowerCase())) {
    perks.push(extra);
  }
  return perks;
}
