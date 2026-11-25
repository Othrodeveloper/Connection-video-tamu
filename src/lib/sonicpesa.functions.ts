import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { groupPaymentPrice } from "@/lib/experience-rules";
import {
  sonicAuthRejected,
  sonicErrorMessage,
  sonicOrderId,
  sonicPaymentStatus,
  sonicPesaRequest,
  SONICPESA_BASE_URL,
  type SonicPesaConfig,
} from "@/lib/sonicpesa";

/** SonicPesa answers we treat as final failures. */
const FAILED = new Set(["CANCELLED", "USERCANCELLED", "REJECTED", "FAILED"]);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadConfig(): Promise<SonicPesaConfig> {
  const db = await admin();
  const { data } = await db
    .from("payment_config")
    .select("api_key, api_secret, base_url, enabled")
    .eq("id", 1)
    .maybeSingle();
  return {
    api_key: data?.api_key ?? "",
    api_secret: data?.api_secret ?? "",
    base_url: data?.base_url || SONICPESA_BASE_URL,
    enabled: data?.enabled ?? false,
  };
}

async function callGateway(
  cfg: SonicPesaConfig,
  path: "/payment/create_order" | "/payment/order_status",
  body: unknown,
) {
  const request = sonicPesaRequest(cfg, path, body);
  const res = await fetch(request.url, request.init);
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON error page */
  }
  return { status: res.status, ok: res.ok, json };
}

function gatewayError(status: number, json: Record<string, unknown>) {
  console.error("[sonicpesa] HTTP", status);
  return sonicErrorMessage(status, json);
}

/** Step 4 of the payment window: create the order and send the USSD push to the buyer's phone. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        packageId: z.string().uuid().optional(),
        groupId: z.string().uuid().optional(),
        phone: z.string().regex(/^255[67]\d{8}$/, "Namba ya simu si sahihi"),
        name: z.string().trim().min(2, "Weka jina la malipo").max(80),
      })
      .refine((v) => Boolean(v.packageId) !== Boolean(v.groupId), "Chagua kifurushi au group")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.is_blocked)
      return { ok: false as const, error: "Akaunti yako imezuiwa. Wasiliana nasi." };

    const { data: selectedGroup } = data.groupId
      ? await supabase
          .from("groups")
          .select("*")
          .eq("id", data.groupId)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    const { data: selectedPackage } = data.packageId
      ? await supabase
          .from("packages")
          .select("*")
          .eq("id", data.packageId)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    if (data.groupId && (!selectedGroup || !selectedGroup.is_paid || selectedGroup.price <= 0))
      return { ok: false as const, error: "Group hili halipatikani kwa malipo." };
    const pkg = selectedGroup
      ? {
          id: selectedGroup.id,
          name: selectedGroup.name,
          price: groupPaymentPrice(selectedGroup),
          duration_days: 0,
        }
      : selectedPackage;
    if (!pkg)
      return { ok: false as const, error: "Kifurushi hiki hakipatikani tena. Chagua kingine." };

    let cfg: SonicPesaConfig;
    try {
      cfg = await loadConfig();
    } catch (error) {
      console.error(
        "[sonicpesa] configuration unavailable",
        error instanceof Error ? error.name : "unknown",
      );
      return {
        ok: false as const,
        error:
          "Muunganisho wa malipo haupatikani sasa. Admin afungue Unganisha Malipo kisha ujaribu tena.",
      };
    }
    if (!cfg.enabled || (!cfg.api_key && !cfg.api_secret)) {
      const { data: paymentId, error } = selectedGroup
        ? await (
            await admin()
          )
            .from("payments")
            .insert({
              user_id: userId,
              group_id: selectedGroup.id,
              package_name: pkg.name,
              duration_days: 0,
              amount: pkg.price,
              phone: data.phone,
              reference: "GR" + crypto.randomUUID().slice(0, 8),
            })
            .select("id")
            .single()
            .then(({ data: row, error }) => ({ data: row?.id, error }))
        : await supabase.rpc("create_payment", { _package_id: pkg.id, _phone: data.phone });
      if (error || !paymentId)
        return { ok: false as const, error: "Imeshindikana kutuma ombi la malipo." };
      return {
        ok: true as const,
        paymentId,
        amount: pkg.price,
        packageName: pkg.name,
        manual: true,
      };
    }
    if (!cfg.api_key || !cfg.api_secret) {
      return {
        ok: false as const,
        error: "Muunganisho wa malipo haujakamilika. Wasiliana na admin.",
      };
    }

    const db = await admin();
    const reference = "TV" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const { data: row, error: insErr } = await db
      .from("payments")
      .insert({
        user_id: userId,
        package_id: selectedGroup ? null : pkg.id,
        group_id: selectedGroup?.id ?? null,
        package_name: pkg.name,
        duration_days: pkg.duration_days,
        amount: pkg.price,
        phone: data.phone,
        reference,
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr || !row) {
      console.error("[sonicpesa] insert", insErr);
      return { ok: false as const, error: "Imeshindikana kuanzisha malipo. Jaribu tena." };
    }

    const email =
      typeof claims["email"] === "string" && claims["email"]
        ? (claims["email"] as string)
        : `${data.phone}@simu.trandingvideo.app`;
    let res: Awaited<ReturnType<typeof callGateway>>;
    try {
      res = await callGateway(cfg, "/payment/create_order", {
        buyer_email: email,
        buyer_name: data.name,
        buyer_phone: data.phone,
        amount: pkg.price,
        currency: "TZS",
      });
    } catch (error) {
      console.error("[sonicpesa] network", error instanceof Error ? error.name : "unknown");
      await db
        .from("payments")
        .update({ status: "failed", provider_status: "NETWORK" })
        .eq("id", row.id);
      return {
        ok: false as const,
        error: "Hatukuweza kufikia mfumo wa malipo. Angalia mtandao kisha ujaribu tena.",
      };
    }
    const orderId = sonicOrderId(res.json);
    if (!res.ok || String(res.json["status"] ?? "").toLowerCase() !== "success" || !orderId) {
      await db
        .from("payments")
        .update({ status: "failed", provider_status: `HTTP_${res.status}` })
        .eq("id", row.id);
      return { ok: false as const, error: gatewayError(res.ok ? 400 : res.status, res.json) };
    }
    const { error: orderError } = await db
      .from("payments")
      .update({ order_id: orderId, provider_status: sonicPaymentStatus(res.json) })
      .eq("id", row.id);
    if (orderError) {
      console.error("[sonicpesa] order reference save failed", orderError.code);
      return {
        ok: false as const,
        error: "USSD imetumwa, lakini oda haijahifadhiwa vizuri. Usilipe tena; wasiliana na admin.",
      };
    }
    return {
      ok: true as const,
      paymentId: row.id,
      amount: pkg.price,
      packageName: pkg.name,
      manual: false,
    };
  });

/** Polled by the payment window (and the admin) until SonicPesa says SUCCESS or a final failure. */
export const checkPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!p) return { status: "missing" as const };
    if (p.user_id !== context.userId) {
      const { data: allowed } = await context.supabase.rpc("can_manage", {
        _uid: context.userId,
        _section: "payments",
      });
      if (!allowed) return { status: "missing" as const };
    }
    if (p.status === "paid") return { status: "paid" as const };
    if (p.status === "failed")
      return { status: "failed" as const, providerStatus: p.provider_status };
    if (!p.order_id) return { status: "pending" as const };

    const db = await admin();
    let cfg: SonicPesaConfig;
    try {
      cfg = await loadConfig();
    } catch {
      return { status: "pending" as const };
    }
    if (!cfg.api_key || !cfg.api_secret) return { status: "pending" as const };
    let res: Awaited<ReturnType<typeof callGateway>>;
    try {
      res = await callGateway(cfg, "/payment/order_status", { order_id: p.order_id });
    } catch {
      return { status: "pending" as const };
    }
    if (!res.ok) {
      gatewayError(res.status, res.json);
      if (res.status === 401 || res.status === 403) {
        await db
          .from("payments")
          .update({ status: "failed", provider_status: "AUTH" })
          .eq("id", p.id);
        return { status: "failed" as const, providerStatus: "AUTH" };
      }
      return { status: "pending" as const };
    }
    const d = (res.json["data"] ?? {}) as Record<string, unknown>;
    const ps = sonicPaymentStatus(res.json);
    if (ps === "SUCCESS") {
      await db
        .from("payments")
        .update({
          provider_status: ps,
          channel: d["channel"] ? String(d["channel"]) : null,
          transid: d["transid"] ? String(d["transid"]) : null,
        })
        .eq("id", p.id);
      const { error: finalizeError } = await db.rpc("finalize_payment", { _payment_id: p.id });
      if (finalizeError) return { status: "pending" as const };
      const { data: confirmed } = await db
        .from("payments")
        .select("status")
        .eq("id", p.id)
        .maybeSingle();
      return { status: confirmed?.status === "paid" ? ("paid" as const) : ("pending" as const) };
    }
    if (FAILED.has(ps)) {
      await db
        .from("payments")
        .update({ status: "failed", provider_status: ps, confirmed_at: new Date().toISOString() })
        .eq("id", p.id);
      return { status: "failed" as const, providerStatus: ps };
    }
    if (ps !== p.provider_status)
      await db.from("payments").update({ provider_status: ps }).eq("id", p.id);
    return { status: "pending" as const, providerStatus: ps };
  });

/** Admin "Jaribu API key": a status lookup on a dummy order tells us whether the key is accepted. */
export const testPaymentKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "admins",
    });
    if (!allowed) return { ok: false, message: "Huna ruhusa" };
    try {
      const cfg = await loadConfig();
      if (!cfg.api_key || !cfg.api_secret)
        return { ok: false, message: "Weka API key na API secret zote mbili kisha uhifadhi." };
      const res = await callGateway(cfg, "/payment/order_status", {
        order_id: "sp_test_connection",
      });
      if (sonicAuthRejected(res.status, res.json))
        return {
          ok: false,
          message: sonicErrorMessage(
            res.status === 400 || res.status === 404 ? 401 : res.status,
            res.json,
          ),
        };
      if (res.status >= 500)
        return { ok: false, message: "SonicPesa ina hitilafu kwa sasa. Jaribu baadaye." };
      if (res.status !== 400 && res.status !== 404 && res.json["status"] !== "success")
        return { ok: false, message: "SonicPesa haijathibitisha muunganisho. Jaribu tena." };
      return {
        ok: true,
        message: "SonicPesa imepokea ombi la kupima. Malipo halisi bado hayajajaribiwa.",
      };
    } catch {
      return {
        ok: false,
        message:
          "Muunganisho wa malipo haupatikani. Hakikisha funguo zimehifadhiwa kisha ujaribu tena.",
      };
    }
  });

/** Short-lived link to the first file of a video so users without a package can watch the trial seconds. */
export const getTrialSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ videoId: z.string().uuid(), episodeId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("is_blocked")
      .eq("id", context.userId)
      .maybeSingle();
    if (prof?.is_blocked) return { url: null };
    const { data: visible } = await context.supabase
      .from("videos")
      .select("id")
      .eq("id", data.videoId)
      .eq("is_published", true)
      .lte("publish_at", new Date().toISOString())
      .maybeSingle();
    if (!visible) return { url: null };
    if (data.episodeId) {
      const { data: episode } = await context.supabase
        .from("episodes")
        .select("id")
        .eq("id", data.episodeId)
        .eq("video_id", data.videoId)
        .maybeSingle();
      if (!episode) return { url: null };
    }
    const prefix = "storage:videos/";
    let rawUrl: string | null = null;
    const useUserRpc = Boolean(
      process.env["SUPABASE_URL"] && !process.env["SUPABASE_SERVICE_ROLE_KEY"],
    );
    const signer = useUserRpc ? context.supabase : await admin();
    if (useUserRpc) {
      const { data: rpcUrl } = await context.supabase.rpc("trial_file", {
        _video_id: data.videoId,
        _episode_id: data.episodeId as unknown as string,
      });
      rawUrl = typeof rpcUrl === "string" ? rpcUrl : null;
    } else {
      let q = signer.from("video_files").select("url").eq("video_id", data.videoId);
      q = data.episodeId ? q.eq("episode_id", data.episodeId) : q.is("episode_id", null);
      const { data: f } = await q.order("created_at").limit(1).maybeSingle();
      rawUrl = f?.url ?? null;
    }
    if (!rawUrl) return { url: null };
    if (!rawUrl.startsWith(prefix)) return { url: rawUrl };
    const { data: signed } = await signer.storage
      .from("videos")
      .createSignedUrl(rawUrl.slice(prefix.length), 120);
    let url = signed?.signedUrl ?? null;
    // The browser must reach the same public address the rest of the site uses.
    const pub = process.env["VITE_SUPABASE_URL"];
    if (url && pub)
      url = new URL(
        url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "/"),
        pub.replace(/\/+$/, "") + "/",
      ).toString();
    return { url };
  });
