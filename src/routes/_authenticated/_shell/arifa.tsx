import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Clock, Film, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageTitle } from "@/components/app/app-shell";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useAuth } from "@/hooks/use-auth";
import { qk, useNotifications, useProfile, useSubscription } from "@/lib/queries";
import { formatDateTime, timeLeft } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/arifa")({
  head: () => ({
    meta: [
      { title: "Arifa — TRANDING VIDEO" },
      { name: "description", content: "Arifa za video mpya, vipindi vipya na kifurushi chako." },
      { property: "og:title", content: "Arifa — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Arifa za video mpya, vipindi vipya na kifurushi chako.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const notes = useNotifications();
  const profile = useProfile();
  const sub = useSubscription();

  useEffect(() => {
    if (!userId || !profile.data) return;
    // Mark everything as seen when the page opens.
    supabase
      .from("profiles")
      .update({ notifications_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .then(() => qc.invalidateQueries({ queryKey: qk.profile(userId) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, !!profile.data]);

  const p = profile.data;
  const list = (notes.data ?? []).filter((n) => {
    if (!p) return true;
    if (n.kind === "new_video" && !p.notify_new_videos) return false;
    if (n.kind === "new_episode" && !p.notify_new_episodes) return false;
    return true;
  });
  const expiry =
    p?.notify_expiry && sub.expiresAt && timeLeft(sub.expiresAt).totalMs < 2 * 86_400_000
      ? timeLeft(sub.expiresAt)
      : null;

  return (
    <PageContainer className="max-w-3xl">
      <PageTitle sub="Zima au washa aina za arifa kwenye Profile">Arifa</PageTitle>
      {expiry ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div>
            <p className="font-semibold text-gold">Kifurushi chako kinakaribia kuisha</p>
            <p className="text-sm text-muted-foreground">
              Zimebaki siku {expiry.days}, saa {expiry.hours} na dakika {expiry.minutes}. Lipia
              mapema usikose burudani.
            </p>
          </div>
        </div>
      ) : null}
      {notes.isError ? (
        <ErrorState onRetry={() => notes.refetch()} />
      ) : notes.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-18 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Hakuna arifa bado"
          body="Tutakujulisha video mpya zikiwekwa."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const Icon = n.kind === "new_episode" ? Tv : n.kind === "new_video" ? Film : Bell;
            const body = (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.video_id ? (
                  <Link to="/video/$videoId" params={{ videoId: n.video_id }}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
