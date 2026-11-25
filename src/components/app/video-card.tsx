import { Link } from "@tanstack/react-router";
import { Lock, Star } from "lucide-react";
import type { Video } from "@/lib/queries";
import { isNew } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VideoCard({
  video,
  locked,
  progress,
  className,
}: {
  video: Video;
  locked?: boolean | undefined;
  progress?: number | undefined;
  className?: string | undefined;
}) {
  const comingSoon = video.is_coming_soon && new Date(video.publish_at).getTime() > Date.now();
  return (
    <Link
      to="/video/$videoId"
      params={{ videoId: video.id }}
      className={cn(
        "group relative block w-[34vw] max-w-[180px] shrink-0 snap-start sm:w-[160px] lg:w-[180px]",
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface shadow-card ring-1 ring-border transition-transform duration-300 group-hover:-translate-y-1 group-hover:ring-primary/60">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-display text-xl text-muted-foreground">
            {video.title}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-card-bottom" />
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {comingSoon ? (
            <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-gold-foreground">
              Inakuja
            </span>
          ) : isNew(video.publish_at) ? (
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-primary-foreground">
              New
            </span>
          ) : null}
        </div>
        {locked && !comingSoon ? (
          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-scrim text-gold">
            <Lock className="h-3 w-3" />
          </span>
        ) : null}
        {video.rating_count > 0 ? (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-[11px] font-bold text-gold">
            <Star className="h-3 w-3 fill-gold" />
            {Number(video.rating_avg).toFixed(1)}
          </span>
        ) : null}
        {progress !== undefined ? (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground/20">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(3, progress * 100))}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-semibold">{video.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[video.year, video.kind === "series" ? "Tamthilia" : video.category?.name]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}

export function VideoRow({
  title,
  videos,
  locked,
  progressMap,
}: {
  title: string;
  videos: Video[];
  locked?: boolean | undefined;
  progressMap?: Map<string, number> | undefined;
}) {
  if (!videos.length) return null;
  return (
    <section className="animate-fade-up">
      <h2 className="mb-3 px-4 text-lg font-bold sm:px-8 sm:text-xl">{title}</h2>
      <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-8 sm:px-8">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} locked={locked} progress={progressMap?.get(v.id)} />
        ))}
      </div>
    </section>
  );
}
