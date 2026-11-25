/** Normalise a Tanzanian mobile number to 2557XXXXXXXX / 2556XXXXXXXX, or null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local: string;
  if (digits.startsWith("255")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;
  if (!/^[67]\d{8}$/.test(local)) return null;
  return `255${local}`;
}

/** Accounts sign in with phone + password; auth needs an email, so derive a fixed one per phone. */
export function phoneToEmail(phone: string): string {
  return `${phone}@simu.trandingvideo.app`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const p = phone.replace(/\D/g, "");
  if (p.length !== 12) return phone;
  return `+${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 9)} ${p.slice(9)}`;
}
