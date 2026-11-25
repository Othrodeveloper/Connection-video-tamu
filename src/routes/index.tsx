import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CreditCard, Crown, Play, Smartphone, Sparkles, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand, LogoRings } from "@/components/app/brand";
import { useAutoScroll, useRotating } from "@/hooks/use-auto-scroll";
import { SiteFooter } from "@/components/app/site-footer";
import { useText } from "@/lib/site-text";
import { useContent } from "@/lib/site-content";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRANDING VIDEO — Tazama Filamu na Tamthilia" },
      {
        name: "description",
        content:
          "Tazama filamu mpya na tamthilia kwenye simu yako. Jisajili kwa namba ya simu na ulipie kwa M-Pesa.",
      },
      { property: "og:title", content: "TRANDING VIDEO — Tazama Filamu na Tamthilia" },
      {
        property: "og:description",
        content: "Filamu mpya na tamthilia kila wiki, kwenye simu yako. Lipia kwa M-Pesa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURE_ICONS = [Smartphone, Tv, CreditCard, Sparkles];
const CARD_TONES = [
  "bg-gradient-blue",
  "bg-gradient-primary",
  "bg-gradient-green",
  "bg-gradient-purple",
  "bg-gradient-orange",
];

function Landing() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const t = useText();
  const content = useContent();
  const posterRow = useAutoScroll<HTMLDivElement>(2000, content.posters.length > 1);
  const cards = useRotating(
    content.features.map((f, i) => ({ ...f, i })),
    3000,
  );
  useEffect(() => {
    if (ready && session) navigate({ to: "/home", replace: true });
  }, [ready, session, navigate]);

  return (
    <div className="min-h-dvh">
      <section className="relative min-h-[92dvh] overflow-hidden">
        <img
          src={content.hero_image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-side" />
        <div className="absolute inset-0 bg-hero-bottom" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Brand />
          <Button variant="blue" size="sm" asChild>
            <Link to="/auth" search={{ mode: "login" }}>
              Ingia
            </Link>
          </Button>
        </header>
        <div className="relative mx-auto flex min-h-[78dvh] max-w-7xl flex-col justify-end px-4 pb-14 sm:px-8">
          <div className="max-w-2xl animate-fade-up">
            <LogoRings className="mb-5" />
            {t("landing.badge") ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
                <Crown className="h-3.5 w-3.5" /> {t("landing.badge")}
              </span>
            ) : null}
            <h1 className="mt-4 font-display text-6xl leading-[0.9] sm:text-8xl">
              {t("landing.title")}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              {t("landing.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth" search={{ mode: "register" }}>
                  <Play className="fill-current" /> {t("landing.cta")}
                </Link>
              </Button>
              <Button variant="blue" size="lg" asChild>
                <Link to="/auth" search={{ mode: "login" }}>
                  {t("landing.login")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {content.posters.length ? (
        <section className="py-10">
          <h2 className="mb-4 px-4 text-xl font-bold sm:px-8">{t("landing.posters")}</h2>
          <div
            ref={posterRow}
            className="scrollbar-none flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-8"
          >
            {content.posters.map((p, i) => (
              <figure
                key={`${p.image}-${i}`}
                className="w-[38vw] max-w-[200px] shrink-0 snap-start"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-lg object-cover shadow-card ring-1 ring-border"
                />
                {p.title ? (
                  <figcaption className="mt-2 truncate px-0.5 text-sm font-semibold">
                    {p.title}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {content.features.length ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
          <h2 className="mb-4 text-xl font-bold">{t("landing.features")}</h2>
          <div className="overflow-hidden">
            <div key={cards.tick} className="flex gap-4 animate-slide-left">
              {cards.list.map((f, pos) => {
                const Icon = FEATURE_ICONS[f.i % FEATURE_ICONS.length]!;
                const tone = CARD_TONES[f.i % CARD_TONES.length]!;
                return (
                  <div
                    key={f.i}
                    className={`w-[78%] shrink-0 overflow-hidden rounded-2xl border bg-surface transition-all sm:w-[calc((100%-2rem)/3)] ${pos === 0 ? "border-blue/50 shadow-blue" : "border-border"}`}
                  >
                    {f.image ? (
                      <img
                        src={f.image}
                        alt={f.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    ) : null}
                    <div className="p-5">
                      {!f.image ? (
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground ${tone}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                      ) : null}
                      <p className={f.image ? "font-bold" : "mt-3 font-bold"}>{f.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </div>
  );
}
