import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageTitle } from "@/components/app/app-shell";
import { VideoCard } from "@/components/app/video-card";
import { EmptyState, ErrorState } from "@/components/app/states";
import { useCatalog, useSubscription, useWatchlistIds } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_shell/orodha")({
  head: () => ({
    meta: [
      { title: "Orodha Yangu — TRANDING VIDEO" },
      { name: "description", content: "Video ulizohifadhi kutazama baadaye." },
      { property: "og:title", content: "Orodha Yangu — TRANDING VIDEO" },
      { property: "og:description", content: "Video ulizohifadhi kutazama baadaye." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyListPage,
});

function MyListPage() {
  const list = useWatchlistIds();
  const catalog = useCatalog();
  const sub = useSubscription();
  const byId = new Map((catalog.data ?? []).map((v) => [v.id, v]));
  const videos = (list.data ?? []).map((id) => byId.get(id)).filter((v) => !!v);

  return (
    <PageContainer>
      <PageTitle sub="Video ulizohifadhi kutazama baadaye">Orodha Yangu</PageTitle>
      {list.isError || catalog.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading || catalog.isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer aspect-[2/3] rounded-lg" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="Orodha yako iko tupu"
          body="Bonyeza 'Orodha Yangu' kwenye video yoyote kuihifadhi hapa."
          action={
            <Button variant="hero" asChild>
              <Link to="/home">Gundua Video</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
          {videos.map((v) => (
            <VideoCard
              key={v!.id}
              video={v!}
              locked={!sub.active}
              className="w-auto max-w-none sm:w-auto lg:w-auto"
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
