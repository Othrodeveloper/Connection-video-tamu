import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { qk, useProfile, useSettings } from "@/lib/queries";
import { useContent } from "@/lib/site-content";
import { channelDue, preferredWhatsappChannel } from "@/lib/experience-rules";

export function ChannelInvite() {
  const { userId } = useAuth();
  const profile = useProfile();
  const qc = useQueryClient();
  const content = useContent();
  const settings = useSettings();
  const href = preferredWhatsappChannel(
    content.whatsapp_channel,
    settings.data?.support_whatsapp ?? "",
  );
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const followedAt = profile.data?.channel_followed_at
    ? Date.parse(profile.data.channel_followed_at)
    : null;
  const dismissedAt = profile.data?.channel_invite_dismissed_at
    ? Date.parse(profile.data.channel_invite_dismissed_at)
    : null;
  const due = channelDue(dismissedAt, followedAt, now);
  const hidden =
    path.startsWith("/admin") || path.startsWith("/tazama") || path === "/auth" || path === "/";

  async function saveInvitationState(field: "channel_followed_at" | "channel_invite_dismissed_at") {
    if (!userId || saving) return false;
    setSaving(true);
    const timestamp = new Date().toISOString();
    const patch =
      field === "channel_followed_at"
        ? { channel_followed_at: timestamp }
        : { channel_invite_dismissed_at: timestamp };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Imeshindikana kuhifadhi. Jaribu tena.");
      return false;
    }
    setNow(Date.now());
    await qc.invalidateQueries({ queryKey: qk.profile(userId) });
    return true;
  }

  async function dismiss() {
    await saveInvitationState("channel_invite_dismissed_at");
  }

  async function follow() {
    await saveInvitationState("channel_followed_at");
  }

  return (
    <Dialog
      open={!!href && !!userId && !!profile.data && due && !hidden}
      onOpenChange={(open) => {
        if (!open) void dismiss();
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] overflow-hidden border-success/30 p-0 text-center sm:max-w-xs">
        <div className="bg-gradient-green px-5 pb-4 pt-5">
          <div className="relative mx-auto h-20 w-20">
            <img
              src={content.channel_image || "/favicon.png"}
              alt={content.channel_name}
              className="h-20 w-20 rounded-full border-2 border-primary-foreground/60 bg-background object-cover"
            />
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand-whatsapp text-primary-foreground">
              <FaWhatsapp className="h-5 w-5" />
            </span>
          </div>
          <DialogTitle className="mt-3 font-display text-3xl leading-none text-primary-foreground">
            FOLLOW CHANNEL HAPA YA CONNECTION
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm font-bold text-primary-foreground/90">
            {content.channel_name}
          </DialogDescription>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pata habari za filamu na vipindi vipya. Ukibofya Follow, sanduku hili halitakurudia
            tena.
          </p>
          {href ? (
            <Button asChild variant="green" className="w-full" disabled={saving}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void follow();
                }}
              >
                <FaWhatsapp /> Follow WhatsApp Channel
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={saving}
            onClick={() => {
              void dismiss();
            }}
          >
            <ArrowLeft /> Rudi · Nikumbushe baada ya dakika 10
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
