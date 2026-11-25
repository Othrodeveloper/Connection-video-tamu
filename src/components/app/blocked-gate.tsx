import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/app/brand";
import { SupportLinks } from "@/components/app/support-links";
import { useIsAdmin, useProfile } from "@/lib/queries";

/** A blocked account sees only this screen (with contact buttons) instead of the site. */
export function BlockedGate({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const admin = useIsAdmin();
  const qc = useQueryClient();
  if (!profile.data?.is_blocked || admin.data) return <>{children}</>;
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-surface p-6 text-center shadow-card">
        <LogoMark className="mx-auto h-16 w-16" />
        <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <Ban className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-display text-4xl">Akaunti Imezuiwa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akaunti yako imesimamishwa kwa muda. Kama unaona ni makosa, wasiliana nasi kupitia njia
          zilizo hapa chini.
        </p>
        <div className="mt-5 text-left">
          <SupportLinks />
        </div>
        <Button
          variant="outline"
          className="mt-5 w-full"
          onClick={async () => {
            await qc.cancelQueries();
            qc.clear();
            await supabase.auth.signOut();
          }}
        >
          <LogOut /> Toka
        </Button>
      </div>
    </div>
  );
}
