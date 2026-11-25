export function formatTSh(amount: number): string {
  return `TSh ${amount.toLocaleString("en-US")}`;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function timeLeft(expiresAt: string | Date, now: number = Date.now()): TimeLeft {
  const totalMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const days = Math.floor(totalMs / 86_400_000);
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  return { days, hours, minutes, seconds, totalMs };
}

export function durationLabel(days: number): string {
  if (days === 1) return "Siku 1";
  if (days % 30 === 0) return days === 30 ? "Mwezi 1" : `Miezi ${days / 30}`;
  if (days % 7 === 0) return days === 7 ? "Wiki 1" : `Wiki ${days / 7}`;
  return `Siku ${days}`;
}

const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
export function formatDate(d: string | Date): string {
  const date = new Date(d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
export function formatDateTime(d: string | Date): string {
  const date = new Date(d);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(date)}, ${hh}:${mm}`;
}

export function minutesLabel(m: number | null | undefined): string {
  if (!m) return "";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}s ${r}d` : `${r} dak`;
}

/** NEW badge: released within the last 14 days. */
export function isNew(publishAt: string, now: number = Date.now()): boolean {
  const t = new Date(publishAt).getTime();
  return t <= now && now - t < 14 * 86_400_000;
}
