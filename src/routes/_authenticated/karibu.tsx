import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/app/brand";
import { Spinner } from "@/components/app/states";
import { useSettings } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/karibu")({
  head: () => ({
    meta: [
      { title: "Karibu — TRANDING VIDEO" },
      { name: "description", content: "Video fupi ya utangulizi ya TRANDING VIDEO." },
      { property: "og:title", content: "Karibu — TRANDING VIDEO" },
      { property: "og:description", content: "Video fupi ya utangulizi ya TRANDING VIDEO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntroPage,
});

function IntroPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const ref = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [muted, setMuted] = useState(false);
  const url = settings.data?.intro_video_url;

  const goHome = () => navigate({ to: "/home", replace: true });

  useEffect(() => {
    if (settings.isSuccess && !url) goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.isSuccess, url]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !url) return;
    el.play().catch(() => {
      // Browsers often block sound on autoplay; retry muted, then ask for a tap.
      el.muted = true;
      setMuted(true);
      el.play().catch(() => setNeedsTap(true));
    });
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <video
        ref={ref}
        src={url}
        playsInline
        autoPlay
        onEnded={goHome}
        onPause={(e) => {
          if (!e.currentTarget.ended && !needsTap) goHome();
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-hero-bottom" />
      <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))]">
        <Brand to="/home" />
      </div>
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex gap-2">
        <Button
          variant="glass"
          size="icon"
          className="rounded-full"
          aria-label={muted ? "Washa sauti" : "Zima sauti"}
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            el.muted = !el.muted;
            setMuted(el.muted);
          }}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        <Button variant="glass" onClick={goHome}>
          Ruka <SkipForward />
        </Button>
      </div>
      {needsTap ? (
        <button
          onClick={() => {
            setNeedsTap(false);
            ref.current?.play();
          }}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-glow"
          aria-label="Cheza utangulizi"
        >
          <Play className="ml-1 h-9 w-9 fill-current" />
        </button>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p className="font-display text-4xl sm:text-6xl">Karibu Kwenye Burudani</p>
        <p className="mt-1 text-sm text-muted-foreground">Filamu na tamthilia bora zinakusubiri</p>
      </div>
    </div>
  );
}
