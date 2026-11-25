import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const readPaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("payment_config_status").maybeSingle();
    if (error) throw new Error("Imeshindikana kusoma mipangilio");
    return {
      configured: !!data?.key_configured && !!data?.secret_configured,
      keyConfigured: data?.key_configured ?? false,
      secretConfigured: data?.secret_configured ?? false,
      enabled: data?.enabled ?? false,
    };
  });

export const savePaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        apiKey: z.string().trim().max(2048),
        apiSecret: z.string().trim().max(2048),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "admins",
    });
    if (!allowed) throw new Error("Huna ruhusa");
    const { data: status, error: statusError } = await context.supabase
      .rpc("payment_config_status")
      .maybeSingle();
    if (statusError) throw new Error("Imeshindikana kusoma mipangilio");
    if (
      !(data.apiKey || status?.key_configured) ||
      !(data.apiSecret || status?.secret_configured)
    ) {
      throw new Error("Weka API key na API secret zote mbili");
    }
    // The authenticated client is intentional here: the full-admin RLS policy permits
    // this update without requiring service-role environment variables in the browser flow.
    const { error } = await context.supabase
      .from("payment_config")
      .update({
        enabled: data.enabled,
        base_url: "https://api.sonicpesa.com/api/v1",
        ...(data.apiKey ? { api_key: data.apiKey } : {}),
        ...(data.apiSecret ? { api_secret: data.apiSecret } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error("Imeshindikana kuhifadhi mipangilio");
    return { ok: true };
  });
