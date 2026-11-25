export interface AccessTokenRecord {
  id: string;
  code: string;
  user_id: string;
  package_id: string | null;
  group_id: string | null;
  package_name: string;
  duration_days: number;
  amount: number;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
}

const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate an unambiguous voucher code like TV-7K9M-3P2X. */
export function generatePinCode(randomByte?: (index: number) => number): string {
  const part = (len: number, offset: number) => {
    let s = "";
    for (let i = 0; i < len; i++) {
      const n = randomByte ? randomByte(offset + i) : Math.floor(Math.random() * PIN_CHARS.length);
      s += PIN_CHARS[Math.abs(n) % PIN_CHARS.length];
    }
    return s;
  };
  return `TV-${part(4, 0)}-${part(4, 4)}`;
}

export function normalizePinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export type TokenCheckResult = { ok: true } | { ok: false; error: string };

/**
 * Pure validation for Access PIN redemption:
 * enforces existence, single-use, strict user account ownership, and package/group match.
 */
export function validateAccessTokenForRedemption(
  token: AccessTokenRecord | null | undefined,
  ctx: {
    userId: string;
    packageId?: string;
    groupId?: string;
  },
): TokenCheckResult {
  if (!token) {
    return {
      ok: false,
      error: "Tokeni / Access PIN hii si sahihi. Hakikisha umeandika sawa na uliyopewa na admin.",
    };
  }
  if (token.used_at) {
    return {
      ok: false,
      error: "Tokeni hii imeshatumika tayari.",
    };
  }
  if (token.user_id !== ctx.userId) {
    return {
      ok: false,
      error:
        "Tokeni hii imetengenezwa kwa akaunti nyingine na haiwezi kutumika kwenye akaunti yako.",
    };
  }
  if (ctx.groupId) {
    if (token.group_id !== ctx.groupId) {
      return {
        ok: false,
        error: `Tokeni hii ni ya "${token.package_name}", si group hili.`,
      };
    }
  } else if (ctx.packageId) {
    if (token.group_id || token.package_id !== ctx.packageId) {
      return {
        ok: false,
        error: `Tokeni hii ni ya "${token.package_name}", si kifurushi ulichochagua.`,
      };
    }
  }
  return { ok: true };
}
