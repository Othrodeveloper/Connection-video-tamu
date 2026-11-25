import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift, Heart, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/app/star-rating";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, qk, useLikedIds, useProfile, useSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface RatingAndReferralProps {
  videoId: string;
  likesCount?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Interactive Like + Star Rating ("Toa ukadiriaji wako") paired with
 * the user's personal Promo Code & Referral Link inside one clean block.
 */
export function RatingAndReferralCard({
  videoId,
  likesCount,
  compact,
  className,
}: RatingAndReferralProps) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const profile = useProfile();
  const settings = useSettings();
  const liked = useLikedIds();

  const myRating = useQuery({
    queryKey: ["my-rating", userId, videoId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ratings")
        .select("stars")
        .eq("user_id", userId!)
        .eq("video_id", videoId)
        .maybeSingle();
      return data?.stars ?? 0;
    },
  });

  const isLiked = liked.data?.has(videoId) ?? false;
  const code = profile.data?.referral_code ?? "";
  const inviteLink =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/auth?ref=${encodeURIComponent(code)}`
      : "";
  const rewardDays = Math.max(1, Number(settings.data?.referral_reward_days ?? 1));
  const siteName = settings.data?.site_name || "TRANDING VIDEO";

  async function toggleLike() {
    if (!userId) return;
    const { error } = isLiked
      ? await supabase.from("likes").delete().eq("user_id", userId).eq("video_id", videoId)
      : await supabase.from("likes").insert({ user_id: userId, video_id: videoId });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    await qc.invalidateQueries({ queryKey: qk.likes(userId) });
    await qc.invalidateQueries({ queryKey: qk.catalog });
  }

  async function rate(stars: number) {
    if (!userId) return;
    const { error } = await supabase
      .from("ratings")
      .upsert({ user_id: userId, video_id: videoId, stars });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(`Asante! Umetoa nyota ${stars}`);
    await qc.invalidateQueries({ queryKey: ["my-rating", userId, videoId] });
    await qc.invalidateQueries({ queryKey: qk.catalog });
  }

  async function copyReferral() {
    if (!inviteLink) return;
    const text = `Jiunge na ${siteName} kwa Promo Code yangu *${code}* upate dakika 20 BURE kutazama filamu! ${inviteLink}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link na Promo Code zimenakiliwa");
    } catch {
      toast.error("Imeshindikana kunakili");
    }
  }

  async function shareReferral() {
    if (!inviteLink) return;
    const text = `Jiunge na ${siteName} kwa Promo Code *${code}* upate dakika 20 BURE kutazama!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: siteName, text, url: inviteLink });
        return;
      } catch {
        /* fallback to copy */
      }
    }
    await copyReferral();
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        compact && "p-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">Toa ukadiriaji wako</p>
          <div className="mt-1.5">
            <StarRating value={myRating.data ?? 0} onChange={rate} size={compact ? "sm" : "md"} />
          </div>
        </div>
        <Button
          type="button"
          variant={isLiked ? "soft" : "glass"}
          size="sm"
          onClick={toggleLike}
          aria-pressed={isLiked}
          className={cn(
            "h-10 gap-1.5 px-3.5",
            isLiked && "border border-primary/40 bg-primary/15 text-primary",
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-primary text-primary")} />
          <span>{isLiked ? "Umependa" : "Like"}</span>
          {typeof likesCount === "number" ? (
            <span className="tabular-nums opacity-80">({likesCount})</span>
          ) : null}
        </Button>
      </div>

      {code ? (
        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <div className="flex items-start gap-2">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gold flex items-center gap-1">
                <span>Alika Rafiki · Pata Siku {rewardDays} Bure</span>
                <Sparkles className="h-3 w-3" />
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Mpe rafiki link au Promo Code{" "}
                <strong className="font-mono text-foreground">{code}</strong>: akijiunga anapata{" "}
                <strong className="text-success">dakika 20 bure</strong>, na akinunua kifurushi
                unapata <strong className="text-gold">siku {rewardDays} bure</strong> moja kwa moja!
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-dashed border-gold/50 bg-background/70 px-2.5 py-1.5 font-mono text-xs font-extrabold tracking-widest text-gold">
              {code}
            </span>
            <Button
              type="button"
              size="sm"
              variant="blue"
              className="h-8 text-xs"
              onClick={copyReferral}
            >
              <Copy className="h-3.5 w-3.5" /> Nakili Link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="green"
              className="h-8 text-xs"
              onClick={shareReferral}
            >
              <Share2 className="h-3.5 w-3.5" /> Shiriki
            </Button>
          </div>
          {inviteLink ? (
            <p className="mt-2 truncate rounded bg-background/50 px-2 py-1 text-[10.5px] text-muted-foreground">
              {inviteLink}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
