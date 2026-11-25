import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Captions,
  Heart,
  Lock,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  SkipForward,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/states";
import { usePaywall } from "@/components/app/paywall";
import { RatingAndReferralCard } from "@/components/app/rating-and-referral";
import { useAuth } from "@/hooks/use-auth";
import { qk, useCatalog, useLikedIds, useSubscription, type Video } from "@/lib/queries";
import { TRIAL_SECONDS, trialExpired } from "@/lib/experience-rules";
import { getTrialSource } from "@/lib/sonicpesa.functions";
import { resolveVideoUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useCountdown } from "@/components/app/countdown";

export const Route = createFileRoute("/_authenticated/tazama/$videoId")({
  validateSearch: z.object({ ep: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Tazama — TRANDING VIDEO" },
      { name: "description", content: "Kicheza video cha TRANDING VIDEO." },
      { property: "og:title", content: "Tazama — TRANDING VIDEO" },
      { property: "og:description", content: "Kicheza video cha TRANDING VIDEO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerPage,
});

function fmt(t: number) {
  if (!isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function PlayerPage() {
  const { videoId } = Route.useParams();
  const { ep } = Route.useSearch();
  return <PlayerContent key={`${videoId}-${ep ?? "movie"}`} />;
}

function PlayerContent() {
  const { videoId } = Route.useParams();
  const { ep } = Route.useSearch();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const paywall = usePaywall();
  const sub = useSubscription();
  useCountdown(sub.expiresAt);
  const trialSeconds = TRIAL_SECONDS;
  const fetchTrial = useServerFn(getTrialSource);
  const catalog = useCatalog();
  const liked = useLikedIds();

  const cachedVideo = catalog.data?.find((v) => v.id === videoId);
  const directVideo = useQuery({
    queryKey: ["video-single", videoId],
    enabled: !catalog.isLoading && !cachedVideo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, category:categories(name)")
        .eq("id", videoId)
        .maybeSingle();
      if (error) throw error;
      return (data as Video | null) ?? null;
    },
  });
  const video = cachedVideo ?? directVideo.data ?? undefined;

  const episodes = useQuery({
    queryKey: ["episodes-flat", videoId],
    enabled: video?.kind === "series",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*, season:seasons(number)")
        .eq("video_id", videoId);
      if (error) throw error;
      return (data ?? []).sort(
        (a, b) => (a.season?.number ?? 0) - (b.season?.number ?? 0) || a.number - b.number,
      );
    },
  });

  const episodeId = video?.kind === "series" ? (ep ?? episodes.data?.[0]?.id) : undefined;
  const episode = episodes.data?.find((e) => e.id === episodeId);
  const nextEpisode = useMemo(() => {
    if (!episodes.data || !episodeId) return null;
    const i = episodes.data.findIndex((e) => e.id === episodeId);
    return i >= 0 ? (episodes.data[i + 1] ?? null) : null;
  }, [episodes.data, episodeId]);

  const files = useQuery({
    queryKey: ["files", videoId, episodeId ?? null],
    enabled: sub.active && !!video && (video.kind === "movie" || !!episodeId),
    queryFn: async () => {
      let q = supabase.from("video_files").select("*").eq("video_id", videoId);
      q = episodeId ? q.eq("episode_id", episodeId) : q.is("episode_id", null);
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Without a package: a short-lived link to the first file, played for trialSeconds only.
  const trial = useQuery({
    queryKey: ["trial-src", videoId, episodeId ?? null],
    enabled: !sub.isLoading && !sub.active && !!video && (video.kind === "movie" || !!episodeId),
    staleTime: 60_000,
    queryFn: () => fetchTrial({ data: { videoId, episodeId: episodeId ?? null } }),
  });

  const isTrial = !sub.active;
  const [trialOver, setTrialOver] = useState(false);
  const [showInteractPanel, setShowInteractPanel] = useState(false);
  const prevSubActive = useRef(sub.active);

  // Immediately lock and pause video the moment an active subscription expires
  useEffect(() => {
    if (sub.active) {
      setTrialOver(false);
    } else if (prevSubActive.current && !sub.isLoading) {
      videoRef.current?.pause();
      setTrialOver(true);
      paywall.open({ videoId, ...(episodeId ? { episodeId } : {}) });
    }
    prevSubActive.current = sub.active;
  }, [sub.active, sub.isLoading, paywall, videoId, episodeId]);

  const savedProgress = useQuery({
    queryKey: ["progress-one", userId, videoId, episodeId ?? null],
    enabled: !!userId && !!video && (video.kind === "movie" || !!episodeId),
    queryFn: async () => {
      let q = supabase
        .from("watch_progress")
        .select("*")
        .eq("user_id", userId!)
        .eq("video_id", videoId);
      q = episodeId ? q.eq("episode_id", episodeId) : q.is("episode_id", null);
      const { data } = await q.maybeSingle();
      return data;
    },
  });

  const [fileIdx, setFileIdx] = useState(0);
  useEffect(() => setFileIdx(0), [episodeId]);
  const file = files.data?.[fileIdx];

  const [src, setSrc] = useState<string | null>(null);
  const [subSrc, setSubSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTrial) return;
    setSubSrc(null);
    setLoadError(null);
    setSrc(trial.data?.url ?? null);
  }, [isTrial, trial.data?.url]);

  useEffect(() => {
    if (isTrial) return;
    let alive = true;
    if (videoRef.current && videoRef.current.currentTime > 1)
      resumeAt.current = videoRef.current.currentTime;
    setSrc(null);
    setLoadError(null);
    if (!file) return;
    resolveVideoUrl(file.url)
      .then((u) => alive && setSrc(u))
      .catch((e) => alive && setLoadError(e?.message ?? "Video haipatikani"));
    setSubSrc(null);
    if (file.subtitle_url) {
      fetch(file.subtitle_url)
        .then((r) => r.text())
        .then((t) => alive && setSubSrc(URL.createObjectURL(new Blob([t], { type: "text/vtt" }))))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [isTrial, file?.id, file?.url, file?.subtitle_url]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [subsOn, setSubsOn] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRowId = useRef<string | null>(null);
  const resumeAt = useRef<number | null>(null);
  const viewed = useRef(false);
  const saving = useRef(false);

  useEffect(() => {
    progressRowId.current = savedProgress.data?.id ?? null;
    const pos = savedProgress.data?.position_seconds ?? 0;
    const dur = savedProgress.data?.duration_seconds ?? 0;
    resumeAt.current = pos > 5 && (!dur || pos < dur - 10) ? pos : null;
  }, [savedProgress.data]);

  const saveProgress = useCallback(async () => {
    const el = videoRef.current;
    if (
      !el ||
      !userId ||
      !el.duration ||
      !isFinite(el.duration) ||
      saving.current ||
      savedProgress.isLoading
    )
      return;
    saving.current = true;
    try {
      const payload = {
        user_id: userId,
        video_id: videoId,
        episode_id: episodeId ?? null,
        position_seconds: Math.floor(el.currentTime),
        duration_seconds: Math.floor(el.duration),
        updated_at: new Date().toISOString(),
      };
      if (progressRowId.current) {
        await supabase.from("watch_progress").update(payload).eq("id", progressRowId.current);
      } else {
        const { data } = await supabase
          .from("watch_progress")
          .insert(payload)
          .select("id")
          .single();
        if (data) progressRowId.current = data.id;
      }
      await qc.invalidateQueries({ queryKey: qk.progress(userId) });
    } finally {
      saving.current = false;
    }
  }, [userId, videoId, episodeId, savedProgress.isLoading, qc]);

  useEffect(() => {
    const id = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) saveProgress();
    }, 10_000);
    return () => {
      clearInterval(id);
      saveProgress().then(() => qc.invalidateQueries({ queryKey: qk.progress(userId) }));
    };
  }, [saveProgress, qc, userId]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    for (const t of Array.from(el.textTracks)) t.mode = subsOn ? "showing" : "hidden";
  }, [subsOn, subSrc, src]);

  function poke() {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 3000);
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (isTrial && trialOver) {
      paywall.open({ videoId, ...(episodeId ? { episodeId } : {}) });
      return;
    }
    if (el.paused) el.play().catch(() => {});
    else el.pause();
    poke();
  }
  function seekBy(d: number) {
    const el = videoRef.current;
    if (!el) return;
    const max = isTrial ? Math.min(trialSeconds - 0.5, el.duration || 0) : el.duration || 0;
    el.currentTime = Math.max(0, Math.min(max, el.currentTime + d));
    poke();
  }
  function toggleMute() {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }
  async function toggleFullscreen() {
    const wrap = wrapRef.current as
      (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const el = videoRef.current as
      (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) return document.exitFullscreen();
    if (wrap?.requestFullscreen) {
      await wrap.requestFullscreen().catch(() => el?.webkitEnterFullscreen?.());
      try {
        await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.(
          "landscape",
        );
      } catch {
        /* orientation lock is optional */
      }
    } else el?.webkitEnterFullscreen?.();
  }
  function changeQuality(i: number) {
    const el = videoRef.current;
    if (el) resumeAt.current = el.currentTime;
    setFileIdx(i);
    setShowQuality(false);
  }
  function goNext() {
    if (!nextEpisode) return;
    saveProgress();
    navigate({ to: "/tazama/$videoId", params: { videoId }, search: { ep: nextEpisode.id } });
  }

  const backLink = (
    <Link
      to="/video/$videoId"
      params={{ videoId }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-scrim backdrop-blur hover:bg-foreground/20"
      aria-label="Rudi"
    >
      <ArrowLeft className="h-5 w-5" />
    </Link>
  );

  if (catalog.isLoading || directVideo.isLoading || sub.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (!video || trial.isError || files.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="absolute left-4 top-4">{backLink}</div>
        <h1 className="text-xl font-bold">{!video ? "Video haipatikani" : "Video haikufunguka"}</h1>
        <Button
          variant="blue"
          onClick={() => {
            trial.refetch();
            files.refetch();
            catalog.refetch();
            directVideo.refetch();
          }}
        >
          Jaribu Tena
        </Button>
      </div>
    );
  }

  if (!sub.active && trial.isSuccess && !trial.data.url) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="absolute left-4 top-4">{backLink}</div>
        <div className="w-full max-w-md space-y-4">
          <Lock className="mx-auto h-12 w-12 text-gold" />
          <h1 className="font-display text-4xl">Video Imefungwa</h1>
          <p className="text-sm text-muted-foreground">
            Lipia kifurushi kufungua filamu na tamthilia zote. Video zitafunguka mara moja baada ya
            kuweka Access PIN.
          </p>
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => paywall.open({ videoId, ...(episodeId ? { episodeId } : {}) })}
          >
            Lipia Hapa Kutazama
          </Button>
          <RatingAndReferralCard
            videoId={video.id}
            likesCount={video.likes_count}
            compact
            className="text-left"
          />
        </div>
      </div>
    );
  }

  const title = video
    ? episode
      ? `${video.title} · S${episode.season?.number ?? 1} E${episode.number}`
      : video.title
    : "";
  const noFiles = files.isSuccess && files.data.length === 0;
  const isLiked = liked.data?.has(video.id) ?? false;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative h-dvh w-full select-none overflow-hidden bg-background",
        !controlsVisible && "cursor-none",
      )}
      onMouseMove={poke}
      onTouchStart={poke}
    >
      {src ? (
        <video
          key={src}
          ref={videoRef}
          src={src}
          playsInline
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full object-contain"
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            setDuration(el.duration);
            if (resumeAt.current && (!isTrial || resumeAt.current < trialSeconds)) {
              el.currentTime = resumeAt.current;
              resumeAt.current = null;
            }
            el.volume = volume;
            el.muted = muted;
            setBuffering(false);
          }}
          onLoadedData={() => setBuffering(false)}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setTime(el.currentTime);
            if (isTrial && trialExpired(el.currentTime) && !trialOver) {
              el.pause();
              setTrialOver(true);
            }
          }}
          onSeeking={(e) => {
            if (isTrial && e.currentTarget.currentTime > trialSeconds)
              e.currentTarget.currentTime = Math.max(0, trialSeconds - 0.5);
          }}
          onPlay={() => {
            setPlaying(true);
            setBuffering(false);
            poke();
            if (!viewed.current) {
              viewed.current = true;
              supabase.rpc("record_view", { _video_id: videoId }).then(() => {});
            }
          }}
          onPause={() => {
            setPlaying(false);
            setBuffering(false);
            setControlsVisible(true);
            saveProgress();
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onEnded={() => {
            saveProgress();
            if (nextEpisode) goNext();
          }}
          onError={() => {
            if (!isTrial && files.data && fileIdx + 1 < files.data.length) {
              setFileIdx((idx) => idx + 1);
              return;
            }
            setBuffering(false);
            setLoadError("Video imeshindwa kucheza sasa. Jaribu kubofya Jaribu Tena.");
          }}
        >
          {subSrc ? (
            <track
              kind="subtitles"
              src={subSrc}
              srcLang="sw"
              label={file?.subtitle_label ?? "Kiswahili"}
              default
            />
          ) : null}
        </video>
      ) : null}

      {(buffering || !src) && !loadError && !noFiles && !(isTrial && trialOver) ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner className="h-12 w-12" />
        </div>
      ) : null}

      {loadError || noFiles ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center backdrop-blur-sm">
          <p className="text-lg font-semibold">
            {noFiles ? "Video hii bado haijapakiwa" : "Hitilafu ya kucheza"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {loadError ?? "Admin ataiweka hivi karibuni."}
          </p>
          {loadError ? (
            <Button
              variant="blue"
              onClick={() => {
                setLoadError(null);
                setBuffering(true);
                files.refetch();
                trial.refetch();
              }}
            >
              Jaribu Tena
            </Button>
          ) : null}
        </div>
      ) : null}

      {isTrial && src && !trialOver ? (
        <div className="pointer-events-none absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 rounded-full border border-blue/50 bg-scrim px-3 py-1.5 text-xs font-bold text-blue-glow shadow-blue backdrop-blur">
          Majaribio · sekunde {Math.max(0, Math.ceil(trialSeconds - time))} zimebaki
        </div>
      ) : null}

      {isTrial && trialOver ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-scrim px-4 py-14 backdrop-blur-md">
          <div className="fixed left-4 top-4 z-40">{backLink}</div>
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-orange/40 bg-popover p-5 text-center shadow-card">
            <Lock className="mx-auto h-9 w-9 text-gold" />
            <h2 className="font-display text-3xl leading-none">Muda wa Majaribio Umekwisha</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Lipia kifurushi uendelee kutazama bila kikomo, au alika rafiki upate dakika 20 / siku
              ya bure!
            </p>
            <Button
              variant="orange"
              size="lg"
              className="w-full font-extrabold"
              onClick={() => paywall.open({ videoId, ...(episodeId ? { episodeId } : {}) })}
            >
              LIPIA KUTAZAMA
            </Button>
            <RatingAndReferralCard
              videoId={videoId}
              likesCount={video.likes_count}
              compact
              className="text-left"
            />
          </div>
        </div>
      ) : null}

      {showInteractPanel && !(isTrial && trialOver) ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-scrim px-4 backdrop-blur-sm"
          onClick={() => setShowInteractPanel(false)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <RatingAndReferralCard
              videoId={videoId}
              likesCount={video.likes_count}
              className="shadow-card"
            />
            <Button
              variant="glass"
              className="mt-2 w-full"
              onClick={() => setShowInteractPanel(false)}
            >
              Funga & Endelea Kutazama
            </Button>
          </div>
        </div>
      ) : null}

      {/* Controls overlay */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col justify-between transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="pointer-events-auto flex items-center justify-between gap-3 bg-gradient-to-b from-background/90 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-3">
            {backLink}
            <p className="truncate font-semibold">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowInteractPanel(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-scrim px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-foreground/15"
            aria-label="Kadiria au Like video"
          >
            <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-primary text-primary")} />
            <Star className="h-3.5 w-3.5 text-gold" />
            <span className="hidden sm:inline">Kadiria &amp; Alika</span>
          </button>
        </div>

        {src ? (
          <div className="pointer-events-auto flex items-center justify-center gap-8 sm:gap-14">
            <button
              onClick={() => seekBy(-10)}
              className="rounded-full p-3 hover:bg-foreground/10"
              aria-label="Rudi nyuma sekunde 10"
            >
              <RotateCcw className="h-8 w-8" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-18 w-18 items-center justify-center rounded-full bg-primary shadow-glow"
              aria-label={playing ? "Simamisha" : "Cheza"}
            >
              {playing ? (
                <Pause className="h-9 w-9 fill-current" />
              ) : (
                <Play className="ml-1 h-9 w-9 fill-current" />
              )}
            </button>
            <button
              onClick={() => seekBy(10)}
              className="rounded-full p-3 hover:bg-foreground/10"
              aria-label="Songa mbele sekunde 10"
            >
              <RotateCw className="h-8 w-8" />
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="pointer-events-auto space-y-2 bg-gradient-to-t from-background/95 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span>{fmt(time)}</span>
            <input
              type="range"
              min={0}
              max={isTrial ? Math.min(trialSeconds, duration || trialSeconds) : duration || 0}
              step={0.5}
              value={time}
              onChange={(e) => {
                const el = videoRef.current;
                const v = isTrial
                  ? Math.min(Number(e.target.value), trialSeconds - 0.5)
                  : Number(e.target.value);
                if (el) el.currentTime = v;
                setTime(v);
                poke();
              }}
              className="h-1.5 flex-1 cursor-pointer accent-primary"
              aria-label="Mstari wa muda"
            />
            <span>{fmt(duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              className="rounded p-2 hover:bg-foreground/10"
              aria-label={playing ? "Simamisha" : "Cheza"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="rounded p-2 hover:bg-foreground/10"
              aria-label={muted ? "Washa sauti" : "Zima sauti"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                const el = videoRef.current;
                if (el) {
                  el.volume = v;
                  el.muted = v === 0;
                  setMuted(v === 0);
                }
              }}
              className="hidden w-24 accent-primary sm:block"
              aria-label="Sauti"
            />
            <div className="ml-auto flex items-center gap-1">
              {nextEpisode ? (
                <Button variant="glass" size="sm" onClick={goNext}>
                  <SkipForward /> Kipindi Kinachofuata
                </Button>
              ) : null}
              {subSrc ? (
                <button
                  onClick={() => setSubsOn((s) => !s)}
                  className={cn(
                    "rounded p-2 hover:bg-foreground/10",
                    subsOn ? "text-gold" : "text-muted-foreground",
                  )}
                  aria-label={subsOn ? "Zima subtitles" : "Washa subtitles"}
                  aria-pressed={subsOn}
                >
                  <Captions className="h-5 w-5" />
                </button>
              ) : null}
              {files.data && files.data.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setShowQuality((s) => !s)}
                    className="flex items-center gap-1 rounded p-2 text-xs font-semibold hover:bg-foreground/10"
                    aria-label="Ubora wa video"
                  >
                    <Settings2 className="h-5 w-5" /> {file?.quality}
                  </button>
                  {showQuality ? (
                    <div className="absolute bottom-11 right-0 min-w-32 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-card">
                      <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Ubora
                      </p>
                      {files.data.map((f, i) => (
                        <button
                          key={f.id}
                          onClick={() => changeQuality(i)}
                          className={cn(
                            "block w-full px-3 py-2 text-left text-sm hover:bg-accent",
                            i === fileIdx && "font-bold text-primary",
                          )}
                        >
                          {f.quality}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                onClick={toggleFullscreen}
                className="rounded p-2 hover:bg-foreground/10"
                aria-label="Skrini nzima"
              >
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
