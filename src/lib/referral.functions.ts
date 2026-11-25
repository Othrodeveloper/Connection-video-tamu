import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REFERRAL_SIGNUP_MINUTES } from "@/lib/experience-rules";

async function adminDb(): Promise<SupabaseClient | null> {
  if (process.env["SUPABASE_URL"] && !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    return null;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

/**
 * Links a newly registered user to their referrer (if not already linked by trigger)
 * and grants the 20-minute free welcome watch bonus automatically.
 */
export const claimReferralWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().trim().min(2).max(24),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    const db = await adminDb();
    if (!db) {
      return { ok: false as const, grantedMinutes: 0 };
    }

    const { data: referrer } = await db
      .from("profiles")
      .select("id, referral_code")
      .eq("referral_code", code)
      .neq("id", context.userId)
      .maybeSingle();

    if (!referrer?.id) {
      return { ok: false as const, grantedMinutes: 0 };
    }

    const { data: existingRef } = await db
      .from("referrals")
      .select("id")
      .eq("referred_id", context.userId)
      .maybeSingle();

    if (!existingRef) {
      await db.from("referrals").insert({
        referrer_id: String(referrer.id),
        referred_id: context.userId,
        rewarded: false,
      });
    }

    const { data: existingWelcome } = await db
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("source", "welcome")
      .limit(1)
      .maybeSingle();

    if (!existingWelcome) {
      const now = Date.now();
      await db.from("subscriptions").insert({
        user_id: context.userId,
        package_id: null,
        source: "welcome",
        starts_at: new Date(now).toISOString(),
        expires_at: new Date(now + REFERRAL_SIGNUP_MINUTES * 60_000).toISOString(),
      });
      return { ok: true as const, grantedMinutes: REFERRAL_SIGNUP_MINUTES };
    }

    return { ok: true as const, grantedMinutes: 0 };
  });
