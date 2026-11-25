import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, FileVideo, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AdminTitle, FieldRow, Panel, UploadField } from "@/components/admin/admin-ui";
import { VideoFormDialog } from "@/components/admin/video-form";
import { EmptyState, Spinner } from "@/components/app/states";
import { errorMessage, type Episode, type Video } from "@/lib/queries";
import { STORAGE_PREFIX, uploadMedia, uploadProtectedVideo } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/videos/$videoId")({
  head: () => ({
    meta: [
      { title: "Simamia Video — Admin TRANDING VIDEO" },
      { name: "description", content: "Faili za video, subtitles, misimu na vipindi." },
      { property: "og:title", content: "Simamia Video — Admin TRANDING VIDEO" },
      { property: "og:description", content: "Faili za video, subtitles, misimu na vipindi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManageVideo,
});

function ManageVideo() {
  const { videoId } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const video = useQuery({
    queryKey: ["admin-video", videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, category:categories(name)")
        .eq("id", videoId)
        .single();
      if (error) throw error;
      return data as Video;
    },
  });

  if (video.isLoading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  if (!video.data) return <EmptyState title="Video haipatikani" />;
  const v = video.data;

  return (
    <div>
      <Link
        to="/admin/videos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Video zote
      </Link>
      <AdminTitle
        sub={`${v.kind === "series" ? "Tamthilia" : "Filamu"} · ${v.category?.name ?? "Bila kategoria"}`}
        action={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Hariri Taarifa
          </Button>
        }
      >
        {v.title}
      </AdminTitle>

      {v.kind === "movie" ? (
        <Panel className="p-5">
          <h2 className="mb-1 font-bold">Faili za Video</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Ongeza ubora tofauti (mf. 480p, 720p, 1080p). Mtazamaji atachagua ubora kwenye kicheza
            video.
          </p>
          <FilesEditor videoId={v.id} episodeId={null} />
        </Panel>
      ) : (
        <SeasonsEditor videoId={v.id} />
      )}

      <VideoFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) qc.invalidateQueries({ queryKey: ["admin-video", videoId] });
        }}
        video={v}
      />
    </div>
  );
}

function FilesEditor({ videoId, episodeId }: { videoId: string; episodeId: string | null }) {
  const qc = useQueryClient();
  const key = ["admin-files", videoId, episodeId];
  const files = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("video_files").select("*").eq("video_id", videoId);
      q = episodeId ? q.eq("episode_id", episodeId) : q.is("episode_id", null);
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState("720p");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!url.trim()) {
      toast.error("Pakia faili au weka link ya video");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("video_files").insert({
      video_id: videoId,
      episode_id: episodeId,
      url: url.trim(),
      quality: quality.trim() || "Auto",
      subtitle_url: subtitle.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setUrl("");
    setSubtitle("");
    toast.success("Faili limeongezwa");
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["files", videoId] });
    qc.invalidateQueries({ queryKey: ["seasons", videoId] });
    qc.invalidateQueries({ queryKey: ["episodes-flat", videoId] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("video_files").delete().eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["files", videoId] });
    qc.invalidateQueries({ queryKey: ["seasons", videoId] });
    qc.invalidateQueries({ queryKey: ["episodes-flat", videoId] });
  }

  return (
    <div className="space-y-4">
      {files.isLoading ? (
        <Spinner />
      ) : (files.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Hakuna faili bado — watazamaji wataona "Video haijapakiwa".
        </p>
      ) : (
        <ul className="space-y-2">
          {(files.data ?? []).map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg bg-surface-2 p-2.5 text-sm"
            >
              <FileVideo className="h-4 w-4 shrink-0 text-primary" />
              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">
                {f.quality}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {f.url.startsWith(STORAGE_PREFIX) ? "Faili lililopakiwa (limelindwa)" : f.url}
                {f.subtitle_url ? " · na subtitles" : ""}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => remove(f.id)}
                aria-label="Futa faili"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_120px]">
        <UploadField
          label="Video kamili MP4 (inaonekana kwa waliolipia tu)"
          accept="video/mp4,video/*"
          hint="Bonyeza kitufe cha kupakia, chagua faili la MP4 kutoka kwenye simu/kompyuta, subiri ifike 100%, kisha bonyeza Ongeza Faili."
          value={url}
          onChange={setUrl}
          upload={uploadProtectedVideo}
        />
        <FieldRow label="Ubora">
          <Input value={quality} onChange={(e) => setQuality(e.target.value)} placeholder="720p" />
        </FieldRow>
        <div className="sm:col-span-2">
          <UploadField
            label="Subtitles (.vtt, si lazima)"
            accept=".vtt,text/vtt"
            value={subtitle}
            onChange={setSubtitle}
            upload={(f) => uploadMedia(f, "subtitles")}
          />
        </div>
        <Button variant="hero" className="sm:col-span-2" onClick={add} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Plus />} Ongeza Faili
        </Button>
      </div>
    </div>
  );
}

function SeasonsEditor({ videoId }: { videoId: string }) {
  const qc = useQueryClient();
  const key = ["admin-seasons", videoId];
  const seasons = useQuery({
    queryKey: key,
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
  const [openEp, setOpenEp] = useState<string | null>(null);
  const [epDialog, setEpDialog] = useState<{
    seasonId: string;
    episode: Episode | null;
    nextNumber: number;
  } | null>(null);

  async function addSeason() {
    const n = (seasons.data?.at(-1)?.number ?? 0) + 1;
    const { error } = await supabase
      .from("seasons")
      .insert({ video_id: videoId, number: n, title: `Msimu wa ${n}` });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["files", videoId] });
    qc.invalidateQueries({ queryKey: ["seasons", videoId] });
    qc.invalidateQueries({ queryKey: ["episodes-flat", videoId] });
  }
  async function removeSeason(id: string) {
    if (!confirm("Futa msimu huu na vipindi vyake vyote?")) return;
    const { error } = await supabase.from("seasons").delete().eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["files", videoId] });
    qc.invalidateQueries({ queryKey: ["seasons", videoId] });
    qc.invalidateQueries({ queryKey: ["episodes-flat", videoId] });
  }
  async function removeEpisode(id: string) {
    if (!confirm("Futa kipindi hiki?")) return;
    const { error } = await supabase.from("episodes").delete().eq("id", id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["files", videoId] });
    qc.invalidateQueries({ queryKey: ["seasons", videoId] });
    qc.invalidateQueries({ queryKey: ["episodes-flat", videoId] });
  }

  if (seasons.isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      {(seasons.data ?? []).map((s) => (
        <Panel key={s.id} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{s.title ?? `Msimu wa ${s.number}`}</h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setEpDialog({
                    seasonId: s.id,
                    episode: null,
                    nextNumber: (s.episodes.at(-1)?.number ?? 0) + 1,
                  })
                }
              >
                <Plus /> Kipindi
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => removeSeason(s.id)}
                aria-label="Futa msimu"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {s.episodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hakuna vipindi bado.</p>
          ) : (
            <ul className="space-y-2">
              {s.episodes.map((ep) => (
                <li key={ep.id} className="rounded-lg bg-surface-2">
                  <div className="flex items-center gap-2 p-2.5">
                    <span className="w-8 text-center font-display text-2xl text-muted-foreground">
                      {ep.number}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ep.title}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        setEpDialog({ seasonId: s.id, episode: ep, nextNumber: ep.number })
                      }
                      aria-label="Hariri kipindi"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeEpisode(ep.id)}
                      aria-label="Futa kipindi"
                    >
                      <Trash2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="blue"
                      onClick={() => setOpenEp(openEp === ep.id ? null : ep.id)}
                      aria-label={`Pakia video ya kipindi ${ep.number}`}
                    >
                      <FileVideo /> MP4
                      <ChevronDown
                        className={cn("transition-transform", openEp === ep.id && "rotate-180")}
                      />
                    </Button>
                  </div>
                  {openEp === ep.id ? (
                    <div className="border-t border-border p-3">
                      <FilesEditor videoId={videoId} episodeId={ep.id} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
      <Button variant="outline" onClick={addSeason}>
        <Plus /> Ongeza Msimu
      </Button>
      <EpisodeDialog
        videoId={videoId}
        state={epDialog}
        onSaved={(id) => setOpenEp(id)}
        onClose={() => {
          setEpDialog(null);
          qc.invalidateQueries({ queryKey: key });
        }}
      />
    </div>
  );
}

function EpisodeDialog({
  videoId,
  state,
  onClose,
  onSaved,
}: {
  videoId: string;
  state: { seasonId: string; episode: Episode | null; nextNumber: number } | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const k = state ? `${state.seasonId}-${state.episode?.id ?? "new"}` : null;
  if (k !== lastKey) {
    setLastKey(k);
    setNumber(String(state?.episode?.number ?? state?.nextNumber ?? 1));
    setTitle(state?.episode?.title ?? "");
    setDescription(state?.episode?.description ?? "");
    setDuration(state?.episode?.duration_minutes ? String(state.episode.duration_minutes) : "");
  }

  async function save() {
    if (!state) return;
    if (!title.trim()) {
      toast.error("Weka jina la kipindi");
      return;
    }
    setBusy(true);
    const row = {
      season_id: state.seasonId,
      video_id: videoId,
      number: Number(number) || 1,
      title: title.trim(),
      description: description.trim(),
      duration_minutes: duration ? Number(duration) : null,
    };
    const { data: saved, error } = state.episode
      ? await supabase.from("episodes").update(row).eq("id", state.episode.id).select("id").single()
      : await supabase.from("episodes").insert(row).select("id").single();
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Kipindi kimehifadhiwa");
    if (saved) onSaved(saved.id);
    onClose();
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle className="font-display text-3xl">
          {state?.episode ? "Hariri Kipindi" : "Kipindi Kipya"}
        </DialogTitle>
        <div className="grid grid-cols-[90px_1fr] gap-3">
          <FieldRow label="Namba">
            <Input
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
          <FieldRow label="Jina">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Maelezo">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </FieldRow>
        <FieldRow label="Muda (dakika)">
          <Input
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
          />
        </FieldRow>
        <p className="text-xs text-muted-foreground">
          Baada ya kuhifadhi, fungua kipindi kuongeza faili za video na subtitles.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Ghairi
          </Button>
          <Button variant="hero" onClick={save} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : null} Hifadhi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
