import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { HeroBanner, HeroSkeleton } from "@/components/app/hero";
import { VideoRow } from "@/components/app/video-card";
import { ErrorState, RowSkeleton } from "@/components/app/states";
import { usePaywall } from "@/components/app/paywall";
import { useText } from "@/lib/site-text";
import {
  useCatalog,
  useCategories,
  useProgress,
  useSettings,
  useSubscription,
  type Video,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_shell/home")({
  head: () => ({
    meta: [
      { title: "Home — TRANDING VIDEO" },
      {
        name: "description",
        content: "Filamu na tamthilia mpya, zinazotazamwa zaidi na zilizopendwa zaidi.",
      },
      { property: "og:title", content: "Home — TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Filamu na tamthilia mpya, zinazotazamwa zaidi na zilizopendwa zaidi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const catalog = useCatalog();
  const categories = useCategories();
  const progress = useProgress();
  const sub = useSubscription();
  const settings = useSettings();
  const paywall = usePaywall();
  const locked = !sub.active;
  const t = useText();

  // Show the payment window after N seconds on the home page for users without a package.
  useEffect(() => {
    if (sub.isLoading || sub.active) return;
    const seconds = settings.data?.paywall_delay_seconds ?? 15;
    const t = setTimeout(() => paywall.open(), seconds * 1000);
    return () => clearTimeout(t);
  }, [sub.isLoading, sub.active, settings.data?.paywall_delay_seconds, paywall]);

  const rows = useMemo(() => {
    const all = catalog.data ?? [];
    const now = Date.now();
    let released = all.filter((v) => new Date(v.publish_at).getTime() <= now);
    if (released.length === 0 && all.length > 0) {
      released = all;
    }
    if (released.length === 0) {
      // Fallback sample catalog for brand new databases so users never see an empty screen
      const sampleNow = new Date().toISOString();
      released = [
        {
          id: "22222222-0000-0000-0000-000000000001",
          title: "Kivuli cha Usiku",
          description:
            "Askari wa zamani anarudi Dar es Salaam usiku mmoja kulipiza kisasi dhidi ya genge lililoangamiza familia yake. Kila kivuli kina siri.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000001",
          kind: "movie",
          thumbnail_url: "/images/poster-kivuli.jpg",
          banner_url: "/images/banner-kivuli.jpg",
          trailer_url: "https://media.w3.org/2010/05/sintel/trailer.mp4",
          duration_minutes: 112,
          is_featured: true,
          is_coming_soon: false,
          is_published: true,
          publish_at: sampleNow,
          views: 4210,
          likes_count: 380,
          rating_avg: 4.8,
          rating_count: 42,
          created_at: sampleNow,
          updated_at: sampleNow,
          category: { name: "Action" },
        },
        {
          id: "22222222-0000-0000-0000-000000000009",
          title: "Familia ya Dar",
          description:
            "Tamthilia ya familia tajiri ya Masaki inayokumbwa na siri, wivu na vita vya urithi.",
          year: 2026,
          category_id: "11111111-0000-0000-0000-000000000007",
          kind: "series",
          thumbnail_url: "/images/poster-familia.jpg",
          banner_url: "/images/banner-familia.jpg",
          trailer_url: "https://vjs.zencdn.net/v/oceans.mp4",
          duration_minutes: null,
          is_featured: true,
          is_coming_soon: false,
          is_published: true,
          publish_at: sampleNow,
          views: 6100,
          likes_count: 710,
          rating_avg: 4.9,
          rating_count: 74,
          created_at: sampleNow,
          updated_at: sampleNow,
          category: { name: "Tamthilia" },
        },
        {
          id: "22222222-0000-0000-0000-000000000002",
          title: "Mfalme wa Pwani",
          description:
            "Mvuvi kijana anagundua kwamba ni mrithi wa ufalme wa kale wa pwani, na lazima achague kati ya mapenzi na wajibu.",
          year: 2025,
          category_id: "11111111-0000-0000-0000-000000000002",
          kind: "movie",
          thumbnail_url: "/images/poster-mfalme.jpg",
          banner_url: null,
          trailer_url: "https://media.w3.org/2010/05/bunny/trailer.mp4",
          duration_minutes: 128,
          is_featured: false,
          is_coming_soon: false,
          is_published: true,
          publish_at: sampleNow,
          views: 3120,
          likes_count: 512,
          rating_avg: 4.7,
          rating_count: 31,
          created_at: sampleNow,
          updated_at: sampleNow,
          category: { name: "Drama" },
        },
      ];
    }
    const comingSoon = all.filter(
      (v) => v.is_coming_soon && new Date(v.publish_at).getTime() > now,
    );
    const byId = new Map(all.map((v) => [v.id, v]));
    const seen = new Set<string>();
    const continueList: Video[] = [];
    const progressMap = new Map<string, number>();
    for (const p of progress.data ?? []) {
      if (seen.has(p.video_id)) continue;
      const v = byId.get(p.video_id);
      if (!v) continue;
      seen.add(p.video_id);
      continueList.push(v);
      if (p.duration_seconds > 0) progressMap.set(v.id, p.position_seconds / p.duration_seconds);
    }
    const featured = released.filter((v) => v.is_featured);
    const newestFirst = (a: Video, b: Video) => +new Date(b.publish_at) - +new Date(a.publish_at);
    const cats = categories.data ?? [];
    const known = new Set(cats.map((c) => c.id));
    const perCategory = cats
      .map((c) => ({
        name: c.name,
        videos: released.filter((v) => v.category_id === c.id).sort(newestFirst),
      }))
      .filter((c) => c.videos.length > 0);
    const other = released
      .filter((v) => !v.category_id || !known.has(v.category_id))
      .sort(newestFirst);
    if (other.length) perCategory.push({ name: "Nyinginezo", videos: other });
    if (perCategory.length === 0 && released.length > 0) {
      perCategory.push({ name: "Filamu na Tamthilia", videos: released.sort(newestFirst) });
    }
    return {
      featured: featured.length ? featured : released.slice(0, 1),
      continueList,
      progressMap,
      comingSoon,
      perCategory,
    };
  }, [catalog.data, categories.data, progress.data]);

  if (catalog.isError) {
    return (
      <div className="px-4 pt-24">
        <ErrorState message={(catalog.error as Error)?.message} onRetry={() => catalog.refetch()} />
      </div>
    );
  }

  return (
    <div>
      {catalog.isLoading ? <HeroSkeleton /> : <HeroBanner videos={rows.featured} locked={locked} />}
      <div className="relative z-10 -mt-6 space-y-8 sm:-mt-10">
        {catalog.isLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : (
          <>
            <VideoRow
              title={t("home.continue")}
              videos={rows.continueList}
              progressMap={rows.progressMap}
              locked={locked}
            />
            {rows.perCategory.map((c) => (
              <VideoRow key={c.name} title={c.name} videos={c.videos} locked={locked} />
            ))}
            <VideoRow title={t("home.soon")} videos={rows.comingSoon} />
          </>
        )}
      </div>
    </div>
  );
}
