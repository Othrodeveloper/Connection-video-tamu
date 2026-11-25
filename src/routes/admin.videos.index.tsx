import type React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Layers, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminTitle, Panel } from "@/components/admin/admin-ui";
import { VideoFormDialog } from "@/components/admin/video-form";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage, qk, type Video } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/videos/")({
  head: () => ({
    meta: [
      { title: "Video — Admin TRANDING VIDEO" },
      { name: "description", content: "Ongeza, hariri, chapisha na futa video." },
      { property: "og:title", content: "Video — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Ongeza, hariri, chapisha na futa video." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminVideos,
});

function AdminVideos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Video | null>(null);
  const [open, setOpen] = useState(false);
  const videos = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, category:categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Video[];
    },
  });

  const list = (videos.data ?? []).filter((v) => v.title.toLowerCase().includes(q.toLowerCase()));

  async function togglePublish(v: Video) {
    const { error } = await supabase
      .from("videos")
      .update({ is_published: !v.is_published })
      .eq("id", v.id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-videos"] });
    qc.invalidateQueries({ queryKey: qk.catalog });
  }
  async function remove(v: Video) {
    if (!confirm(`Futa "${v.title}"? Hatua hii haiwezi kurudishwa.`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Video imefutwa");
    qc.invalidateQueries({ queryKey: ["admin-videos"] });
    qc.invalidateQueries({ queryKey: qk.catalog });
  }

  return (
    <div>
      <AdminTitle
        sub={`${videos.data?.length ?? 0} video`}
        action={
          <Button
            variant="hero"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Ongeza Video
          </Button>
        }
      >
        Video
      </AdminTitle>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta video…"
          className="pl-9"
        />
      </div>
      {videos.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="Hakuna video" body="Bonyeza 'Ongeza Video' kuanza." />
      ) : (
        <div className="space-y-2">
          {list.map((v) => (
            <Panel key={v.id} className="flex items-center gap-3 p-3">
              {v.thumbnail_url ? (
                <img
                  src={v.thumbnail_url}
                  alt=""
                  className="h-16 w-11 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="h-16 w-11 shrink-0 rounded bg-surface-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {v.kind === "series" ? "Tamthilia" : "Filamu"} · {v.category?.name ?? "—"} ·{" "}
                  {formatDate(v.publish_at)} · imechezwa mara {v.views.toLocaleString()}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!v.is_published ? (
                    <Badge c="bg-muted text-muted-foreground">Rasimu</Badge>
                  ) : (
                    <Badge c="bg-success/15 text-success">Imechapishwa</Badge>
                  )}
                  {v.is_featured ? <Badge c="bg-primary/15 text-primary">Featured</Badge> : null}
                  {v.is_coming_soon ? <Badge c="bg-gold/15 text-gold">Coming Soon</Badge> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                <Button size="icon" variant="ghost" asChild aria-label="Faili, misimu na vipindi">
                  <Link to="/admin/videos/$videoId" params={{ videoId: v.id }}>
                    <Layers />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(v);
                    setOpen(true);
                  }}
                  aria-label="Hariri"
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => togglePublish(v)}
                  aria-label={v.is_published ? "Ficha" : "Chapisha"}
                >
                  {v.is_published ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove(v)}
                  aria-label="Futa"
                >
                  <Trash2 />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <VideoFormDialog
        open={open}
        onOpenChange={setOpen}
        video={editing}
        onSaved={(id) => {
          if (!editing) navigate({ to: "/admin/videos/$videoId", params: { videoId: id } });
        }}
      />
      <p className="mt-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3 text-gold" /> Bonyeza aikoni ya tabaka kuweka faili za video,
        subtitles, misimu na vipindi.
      </p>
    </div>
  );
}

function Badge({ children, c }: { children: React.ReactNode; c: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c}`}>{children}</span>;
}
