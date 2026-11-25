import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accountDeletionAllowed } from "@/lib/experience-rules";

export const deleteRegisteredAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), confirmation: z.literal("FUTA AKAUNTI") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed, error: permissionError } = await context.supabase.rpc("can_manage", {
      _uid: context.userId,
      _section: "admins",
    });
    if (
      permissionError ||
      !accountDeletionAllowed(!!allowed, data.userId === context.userId, false)
    )
      throw new Error("Huna ruhusa ya kufuta akaunti hii.");
    const { data: targetSections, error: targetError } = await context.supabase.rpc("can_manage", {
      _uid: data.userId,
      _section: "admins",
    });
    if (targetError || targetSections) throw new Error("Akaunti ya admin haiwezi kufutwa hapa.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff_permissions")
      .select("user_id")
      .eq("user_id", data.userId)
      .limit(1);
    if (
      staffError ||
      !accountDeletionAllowed(!!allowed, data.userId === context.userId, !!staff?.length)
    )
      throw new Error("Akaunti ya msimamizi haiwezi kufutwa hapa.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error && error.status !== 404) throw new Error("Akaunti haijafutwa. Jaribu tena.");
    const { error: cleanupError } = await supabaseAdmin.rpc("purge_deleted_account_details", {
      _uid: data.userId,
    });
    if (cleanupError)
      throw new Error(
        "Akaunti imeondolewa; baadhi ya taarifa bado zinahitaji kufutwa. Jaribu tena.",
      );
    return { ok: true };
  });
