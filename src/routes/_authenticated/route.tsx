import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PaywallProvider } from "@/components/app/paywall";
import { BlockedGate } from "@/components/app/blocked-gate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => (
    <BlockedGate>
      <PaywallProvider>
        <Outlet />
      </PaywallProvider>
    </BlockedGate>
  ),
});
