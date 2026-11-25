import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Heart, Lock, Play, Plus, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { VideoRow } from "@/components/app/video-card";
import { StarRating } from "@/components/app/star-rating";
import { RatingAndReferralCard } from "@/components/app/rating-and-referral";
import { EmptyState, FullPageSpinner } from "@/components/app/states";
import { useAuth } from "@/hooks/use-auth";
import {
  errorMessage,
  qk,
  useCatalog,
  useLikedIds,
  useSubscription,
  useWatchlistIds,
} from "@/lib/queries";
import { formatDate, minutesLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/video/$videoId")({
  head: () => ({
    meta: [
      { title: "Maelezo ya Video — TRANDING VIDEO" },
      { name: "description", content: "Maelezo kamili, trailer, misimu na vipindi." },
      { property: "og:title", content: "Maelezo ya Video — TRANDING VIDEO" },
      { property: "og:description", content: "Maelezo kamili, trailer, misimu na vipindi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoDetailPage,
});

function VideoDetailPage() {
  const { videoId } = Route.useParams();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const sub = useSubscription();
  const watchlist = useWatchlistIds();
  const liked = useLikedIds();
  const [showTrailer, setShowTrailer] = useState(false);

  const video = catalog.data?.find((v) => v.id === videoId);
  const isComingSoon =
    !!video && video.is_coming_soon && new Date(video.publish_at).getTime() > Date.now();

  const seasons = useQuery({
    queryKey: ["seasons", videoId],
    enabled: video?.kind === "series",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*, episodes(*)")
        .eq("video_id", videoId)
        .order("number");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        episodes: [...s.episodes].sort((a, b) => a.number - b.number),
      }));
    },
  });
  const [seasonIdx, setSeasonIdx] = useState(0);

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

  const similar = useMemo(
    () =>
      (catalog.data ?? [])
        .filter(
          (v) =>
            v.id !== videoId && (v.category_id === video?.category_id || v.kind === video?.kind),
        )
        .slice(0, 12),
    [catalog.data, video, videoId],
  );

  if (catalog.isLoading) return <FullPageSpinner />;
  if (!video)
    return (
      <div className="px-4 pt-24">
        <EmptyState title="Video haipatikani" body="Huenda imeondolewa au bado haijachapishwa." />
      </div>
    );

  const inList = watchlist.data?.includes(video.id) ?? false;
  const isLiked = liked.data?.has(video.id) ?? false;

  async function toggleList() {
    if (!userId) return;
    const { error } = inList
      ? await supabase.from("watchlist").delete().eq("user_id", userId).eq("video_id", videoId)
      : await supabase.from("watchlist").insert({ user_id: userId, video_id: videoId });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(inList ? "Imeondolewa kwenye Orodha Yangu" : "Imeongezwa kwenye Orodha Yangu");
    qc.invalidateQueries({ queryKey: qk.watchlist(userId) });
  }

  async function toggleLike() {
    if (!userId) return;
    const { error } = isLiked
      ? await supabase.from("likes").delete().eq("user_id", userId).eq("video_id", videoId)
      : await supabase.from("likes").insert({ user_id: userId, video_id: videoId });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: qk.likes(userId) });
    qc.invalidateQueries({ queryKey: qk.catalog });
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
    qc.invalidateQueries({ queryKey: ["my-rating", userId, videoId] });
    qc.invalidateQueries({ queryKey: qk.catalog });
  }

  function play(episodeId?: string) {
    // Without a package the player runs a short trial, then opens the payment window.
    navigate({
      to: "/tazama/$videoId",
      params: { videoId },
      search: episodeId ? { ep: episodeId } : {},
    });
  }

  const image = video.banner_url ?? video.thumbnail_url;
  const currentSeason = seasons.data?.[seasonIdx];

  return (
    <div>
      <section className="relative h-[62vh] min-h-[420px] w-full overflow-hidden">
        {showTrailer && video.trailer_url ? (
          <video
            src={video.trailer_url}
            autoPlay
            controls
            playsInline
            className="absolute inset-0 h-full w-full bg-background object-contain"
          />
        ) : (
          <>
            {image ? (
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-hero-side" />
            <div className="absolute inset-0 bg-hero-bottom" />
            {video.trailer_url ? (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-scrim px-5 py-3 text-sm font-semibold backdrop-blur transition-transform hover:scale-105"
              >
                <Play className="h-4 w-4 fill-current text-primary" /> Tazama Trailer
              </button>
            ) : null}
          </>
        )}
      </section>

      <div className="relative z-10 mx-auto -mt-28 max-w-7xl px-4 sm:px-8">
        <div className="flex gap-5">
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="hidden aspect-[2/3] w-44 shrink-0 rounded-xl object-cover shadow-card ring-1 ring-border sm:block"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-5xl leading-[0.9] sm:text-7xl">{video.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
              {video.year ? <span>{video.year}</span> : null}
              {video.category ? (
                <span className="rounded border border-border px-1.5 py-0.5">
                  {video.category.name}
                </span>
              ) : null}
              <span>{video.kind === "series" ? "Tamthilia" : "Filamu"}</span>
              {video.duration_minutes ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {minutesLabel(video.duration_minutes)}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(video.publish_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {video.views.toLocaleString()}
              </span>
            </div>
            {video.rating_count > 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <StarRating value={Number(video.rating_avg)} size="sm" />
                <span className="text-xs text-gold">
                  {Number(video.rating_avg).toFixed(1)} ({video.rating_count})
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isComingSoon ? (
            <Button variant="gold" size="lg" disabled>
              Inakuja {formatDate(video.publish_at)}
            </Button>
          ) : (
            <Button variant="hero" size="lg" className="flex-1 sm:flex-none" onClick={() => play()}>
              {sub.active ? <Play className="fill-current" /> : <Lock />}
              {sub.active ? "Tazama Sasa" : "Lipia Kutazama"}
            </Button>
          )}
          <Button variant="glass" size="lg" onClick={toggleList} aria-pressed={inList}>
            {inList ? <Check /> : <Plus />} Orodha Yangu
          </Button>
          <Button
            variant="glass"
            size="lg"
            onClick={toggleLike}
            aria-pressed={isLiked}
            aria-label={isLiked ? "Ondoa like" : "Like"}
          >
            <Heart className={cn(isLiked && "fill-primary text-primary")} /> {video.likes_count}
          </Button>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {video.description}
        </p>

        <RatingAndReferralCard videoId={video.id} likesCount={video.likes_count} className="mt-5" />

        {video.kind === "series" ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Vipindi</h2>
              {seasons.data && seasons.data.length > 1 ? (
                <select
                  value={seasonIdx}
                  onChange={(e) => setSeasonIdx(Number(e.target.value))}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-semibold"
                  aria-label="Chagua msimu"
                >
                  {seasons.data.map((s, i) => (
                    <option key={s.id} value={i}>
                      {s.title ?? `Msimu wa ${s.number}`}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {seasons.isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shimmer h-20 rounded-lg" />
                ))}
              </div>
            ) : !currentSeason?.episodes.length ? (
              <EmptyState title="Bado hakuna vipindi" body="Vipindi vitaongezwa hivi karibuni." />
            ) : (
              <ul className="space-y-2">
                {currentSeason.episodes.map((ep) => (
                  <li key={ep.id}>
                    <button
                      onClick={() => play(ep.id)}
                      className="flex w-full items-center gap-4 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50"
                    >
                      <span className="font-display text-3xl text-muted-foreground">
                        {ep.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{ep.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {ep.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {minutesLabel(ep.duration_minutes)}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        {sub.active ? (
                          <Play className="h-4 w-4 fill-current" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <div className="mt-10">
        <VideoRow title="Video Zinazofanana" videos={similar} locked={!sub.active} />
      </div>
      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-8">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← Rudi Home
        </Link>
      </div>
    </div>
  );
}
