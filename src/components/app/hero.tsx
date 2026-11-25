import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Info, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Video } from "@/lib/queries";
import { minutesLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HeroBanner({ videos, locked }: { videos: Video[]; locked: boolean }) {
  const [index, setIndex] = useState(0);
  const video = videos[index];
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setPlaying(false);
    setBlocked(false);
    const el = ref.current;
    if (!el || !video?.trailer_url) return;
    el.muted = true;
    setMuted(true);
    const t = setTimeout(() => {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setBlocked(true));
    }, 800);
    return () => clearTimeout(t);
  }, [video?.id, video?.trailer_url]);

  if (!video) return null;

  function togglePlay() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => {
        setPlaying(true);
        setBlocked(false);
      });
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }

  function watchNow() {
    // Locked videos still open the player: it plays a short trial, then shows the payment window.
    navigate({ to: "/tazama/$videoId", params: { videoId: video!.id } });
  }

  const image = video.banner_url ?? video.thumbnail_url;

  return (
    <section
      className="relative h-[78vh] min-h-[480px] w-full overflow-hidden sm:h-[85vh]"
      aria-label="Video iliyoangaziwa"
    >
      {image ? (
        <img
          src={image}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            playing ? "opacity-0" : "opacity-100",
          )}
        />
      ) : null}
      {video.trailer_url ? (
        <video
          key={video.id}
          ref={ref}
          src={video.trailer_url}
          poster={image ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            playing ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
      <div className="absolute inset-0 bg-hero-side" />
      <div className="absolute inset-0 bg-hero-bottom" />

      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 sm:px-8 sm:pb-16">
        <div key={video.id} className="max-w-xl animate-fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded bg-primary px-2 py-0.5 uppercase tracking-wider">
              {video.kind === "series" ? "Tamthilia" : "Filamu"}
            </span>
            {video.year ? <span className="text-muted-foreground">{video.year}</span> : null}
            {video.category ? (
              <span className="text-muted-foreground">· {video.category.name}</span>
            ) : null}
            {video.duration_minutes ? (
              <span className="text-muted-foreground">
                · {minutesLabel(video.duration_minutes)}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-6xl leading-[0.9] sm:text-8xl">{video.title}</h1>
          <p className="mt-3 line-clamp-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            {video.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="hero" size="lg" onClick={watchNow}>
              <Play className="fill-current" /> Tazama Sasa
            </Button>
            <Button variant="glass" size="lg" asChild>
              <Link to="/video/$videoId" params={{ videoId: video.id }}>
                <Info /> Maelezo Zaidi
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {videos.length > 1
              ? videos.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Onyesha ${v.title}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-8 bg-primary" : "w-3 bg-foreground/40",
                    )}
                  />
                ))
              : null}
          </div>
          {video.trailer_url ? (
            <div className="flex gap-2">
              <Button
                variant="glass"
                size="icon"
                className="rounded-full"
                onClick={togglePlay}
                aria-label={playing ? "Simamisha trailer" : "Cheza trailer"}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="glass"
                size="icon"
                className="rounded-full"
                onClick={toggleMute}
                aria-label={muted ? "Washa sauti" : "Zima sauti"}
              >
                {muted ? <VolumeX /> : <Volume2 />}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {blocked ? (
        <button
          onClick={togglePlay}
          className="absolute left-1/2 top-[38%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-glow"
          aria-label="Cheza trailer"
        >
          <Play className="h-7 w-7 fill-current" />
        </button>
      ) : null}
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[78vh] min-h-[480px] w-full sm:h-[85vh]">
      <div className="shimmer absolute inset-0" />
      <div className="absolute bottom-10 left-4 right-4 space-y-3 sm:left-8">
        <div className="h-16 w-2/3 max-w-md rounded bg-surface-2" />
        <div className="h-4 w-full max-w-lg rounded bg-surface-2" />
        <div className="h-12 w-60 rounded bg-surface-2" />
      </div>
    </div>
  );
}
