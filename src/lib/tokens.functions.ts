import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generatePinCode,
  normalizePinCode,
  validateAccessTokenForRedemption,
  type AccessTokenRecord,
} from "@/lib/access-token";
import { groupPaymentPrice } from "@/lib/experience-rules";

export interface EnrichedAccessToken extends AccessTokenRecord {
  user_name: string;
  user_phone: string;
}

const PIN_CHANNEL = "ACCESS_PIN";
const PIN_READY = "PIN_READY";
const PIN_CLAIMING = "PIN_CLAIMING";
const PIN_USED = "PIN_USED";

interface PaymentPinRow {
  id: string;
  user_id: string;
  package_id: string | null;
  group_id: string | null;
  package_name: string;
  duration_days: number;
  amount: number;
  phone: string;
  status: string;
  reference: string | null;
  channel: string | null;
  provider_status: string | null;
  provider_message: string | null;
  created_at: string;
  confirmed_at: string | null;
}

function mapPaymentToToken(row: PaymentPinRow): AccessTokenRecord {
  const used =
    row.status === "paid" || row.provider_status === PIN_USED || Boolean(row.confirmed_at);
  return {
    id: row.id,
    code: row.reference ?? "",
    user_id: row.user_id,
    package_id: row.package_id,
    group_id: row.group_id,
    package_name: row.package_name,
    duration_days: Number(row.duration_days ?? 0),
    amount: Number(row.amount ?? 0),
    created_by: row.provider_message ?? null,
    created_at: row.created_at,
    used_at: used ? (row.confirmed_at ?? row.created_at) : null,
  };
}

async function adminRaw(): Promise<SupabaseClient> {
  if (process.env["SUPABASE_URL"] && !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    throw new Error(
      "Weka SUPABASE_SERVICE_ROLE_KEY kwenye mipangilio ya seva (Vercel Env) ili Access PIN ifanye kazi.",
    );
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

/** Admin: tengeneza Access PIN / vocha inayofungwa kwa akaunti maalum ya mtumiaji na kifurushi/group lake. */
export const generateAccessToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid("Chagua mtumiaji sahihi"),
        packageId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
      })
      .refine((v) => Boolean(v.packageId) !== Boolean(v.groupId), "Chagua kifurushi au group")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "payments",
    });
    if (!allowed) return { ok: false as const, error: "Huna ruhusa ya kutengeneza tokeni" };

    let db: SupabaseClient;
    try {
      db = await adminRaw();
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Seva haijawekwa tayari",
      };
    }

    const { data: targetUser } = await db
      .from("profiles")
      .select("id, full_name, phone, is_blocked")
      .eq("id", data.userId)
      .maybeSingle();

    if (!targetUser) {
      return { ok: false as const, error: "Akaunti ya mtumiaji haikupatikana" };
    }

    let targetName = "";
    let durationDays = 0;
    let amount = 0;

    if (data.groupId) {
      const { data: grp } = await db
        .from("groups")
        .select("id, name, is_paid, price, is_active")
        .eq("id", data.groupId)
        .maybeSingle();
      if (!grp || !grp["is_paid"] || Number(grp["price"] ?? 0) <= 0) {
        return { ok: false as const, error: "Group hili halina malipo" };
      }
      targetName = String(grp["name"] ?? "Group");
      amount = groupPaymentPrice({
        is_paid: Boolean(grp["is_paid"]),
        price: Number(grp["price"] ?? 0),
      });
      durationDays = 0;
    } else if (data.packageId) {
      const { data: pkg } = await db
        .from("packages")
        .select("id, name, duration_days, price")
        .eq("id", data.packageId)
        .maybeSingle();
      if (!pkg) {
        return { ok: false as const, error: "Kifurushi hakikupatikana" };
      }
      targetName = String(pkg["name"] ?? "Kifurushi");
      durationDays = Number(pkg["duration_days"] ?? 1);
      amount = Number(pkg["price"] ?? 0);
    }

    let code = generatePinCode();
    for (let i = 0; i < 4; i++) {
      const { data: existing } = await db
        .from("payments")
        .select("id")
        .eq("reference", code)
        .maybeSingle();
      if (!existing) break;
      code = generatePinCode();
    }

    const row = {
      id: crypto.randomUUID(),
      user_id: data.userId,
      package_id: data.packageId ?? null,
      group_id: data.groupId ?? null,
      package_name: targetName,
      duration_days: durationDays,
      amount,
      phone: String(targetUser["phone"] ?? ""),
      reference: code,
      status: "pending",
      channel: PIN_CHANNEL,
      provider_status: PIN_READY,
      provider_message: context.userId,
      created_at: new Date().toISOString(),
      confirmed_at: null,
    };

    const { data: inserted, error } = await db.from("payments").insert(row).select("*").single();
    if (error || !inserted) {
      return { ok: false as const, error: error?.message ?? "Imeshindikana kuhifadhi tokeni" };
    }

    const token: EnrichedAccessToken = {
      ...mapPaymentToToken(inserted as PaymentPinRow),
      user_name: String(targetUser["full_name"] ?? "Mtumiaji"),
      user_phone: String(targetUser["phone"] ?? ""),
    };

    return { ok: true as const, token };
  });

/** Admin: orodha ya tokeni / Access PIN zote zilizotengenezwa. */
export const listAccessTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "payments",
    });
    if (!allowed) throw new Error("Huna ruhusa");

    const { data: rows, error } = await context.supabase
      .from("payments")
      .select("*")
      .eq("channel", PIN_CHANNEL)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);
    const pinRows = (rows ?? []) as unknown as PaymentPinRow[];
    if (!pinRows.length) return [] as EnrichedAccessToken[];

    const userIds = [...new Set(pinRows.map((t) => t.user_id))];
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);
    const byId = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string; phone: string | null }>).map(
        (p) => [p.id, p],
      ),
    );

    return pinRows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        ...mapPaymentToToken(r),
        user_name: p?.full_name ?? "Mtumiaji",
        user_phone: p?.phone ?? r.phone ?? "",
      };
    });
  });

/** Admin: futa tokeni / Access PIN. */
export const deleteAccessToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tokenId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "payments",
    });
    if (!allowed) return { ok: false as const, error: "Huna ruhusa" };

    const { error } = await context.supabase
      .from("payments")
      .delete()
      .eq("id", data.tokenId)
      .eq("channel", PIN_CHANNEL);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Mtumiaji: weka Access PIN aliyopewa na admin kufungua kifurushi/group cha akaunti yake. */
export const redeemAccessToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().trim().min(4, "Weka Access PIN uliyopewa na admin").max(40),
        packageId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
      })
      .refine((v) => Boolean(v.packageId) !== Boolean(v.groupId), "Chagua kifurushi au group")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_blocked, phone")
      .eq("id", userId)
      .maybeSingle();

    if (prof?.is_blocked) {
      return { ok: false as const, error: "Akaunti yako imezuiwa. Wasiliana nasi." };
    }

    let db: SupabaseClient;
    try {
      db = await adminRaw();
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Huduma haipatikani sasa.",
      };
    }

    const normalizedCode = normalizePinCode(data.code);

    const { data: row, error: fetchErr } = await db
      .from("payments")
      .select("*")
      .eq("channel", PIN_CHANNEL)
      .eq("reference", normalizedCode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      return { ok: false as const, error: "Imeshindikana kuhakiki tokeni sasa. Jaribu tena." };
    }

    const pinRow = row as PaymentPinRow | null;
    const token = pinRow ? mapPaymentToToken(pinRow) : null;
    const check = validateAccessTokenForRedemption(token, {
      userId,
      ...(data.packageId ? { packageId: data.packageId } : {}),
      ...(data.groupId ? { groupId: data.groupId } : {}),
    });

    if (!check.ok || !token || !pinRow) {
      return { ok: false as const, error: check.ok ? "Tokeni si sahihi" : check.error };
    }

    if (pinRow.status !== "pending") {
      return { ok: false as const, error: "Tokeni hii imeshatumika au haipo tena." };
    }

    const { data: claimed, error: claimErr } = await db
      .from("payments")
      .update({ provider_status: PIN_CLAIMING })
      .eq("id", pinRow.id)
      .eq("status", "pending")
      .eq("channel", PIN_CHANNEL)
      .eq("provider_status", PIN_READY)
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      return { ok: false as const, error: "Tokeni hii imeshatumika tayari." };
    }

    const { error: finErr } = await db.rpc("finalize_payment", { _payment_id: pinRow.id });
    if (finErr) {
      await db
        .from("payments")
        .update({ provider_status: PIN_READY })
        .eq("id", pinRow.id)
        .eq("status", "pending");
      return {
        ok: false as const,
        error: "Imeshindikana kufungua kifurushi kwa PIN hii. Jaribu tena.",
      };
    }

    await db.from("payments").update({ provider_status: PIN_USED }).eq("id", pinRow.id);

    return {
      ok: true as const,
      packageName: token.package_name,
      kind: token.group_id ? ("group" as const) : ("package" as const),
    };
  });
