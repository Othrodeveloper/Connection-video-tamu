import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldRow, Toggle, UploadField, selectCls } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/app/states";
import { errorMessage, qk, useCategories, type Video } from "@/lib/queries";
import { uploadMedia } from "@/lib/media";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const empty = {
  title: "",
  description: "",
  year: String(new Date().getFullYear()),
  category_id: "",
  newCategory: "",
  kind: "movie" as "movie" | "series",
  thumbnail_url: "",
  banner_url: "",
  trailer_url: "",
  duration_minutes: "",
  is_featured: false,
  is_coming_soon: false,
  is_published: true,
  publish_at: "",
};

export function VideoFormDialog({
  open,
  onOpenChange,
  video,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  video: Video | null;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const categories = useCategories();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      video
        ? {
            title: video.title,
            description: video.description,
            year: video.year ? String(video.year) : "",
            category_id: video.category_id ?? "",
            newCategory: "",
            kind: video.kind as "movie" | "series",
            thumbnail_url: video.thumbnail_url ?? "",
            banner_url: video.banner_url ?? "",
            trailer_url: video.trailer_url ?? "",
            duration_minutes: video.duration_minutes ? String(video.duration_minutes) : "",
            is_featured: video.is_featured,
            is_coming_soon: video.is_coming_soon,
            is_published: video.is_published,
            publish_at: toLocalInput(video.publish_at),
          }
        : { ...empty, publish_at: toLocalInput(new Date().toISOString()) },
    );
  }, [open, video]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!f.title.trim()) {
      toast.error("Weka jina la video");
      return;
    }
    setBusy(true);
    try {
      let categoryId = f.category_id || null;
      if (f.newCategory.trim()) {
        const name = f.newCategory.trim();
        const existing = categories.data?.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (existing) categoryId = existing.id;
        else {
          const { data, error } = await supabase
            .from("categories")
            .insert({ name, sort: (categories.data?.length ?? 0) + 1 })
            .select("id")
            .single();
          if (error) throw error;
          categoryId = data.id;
          qc.invalidateQueries({ queryKey: qk.categories });
        }
      }
      const row = {
        title: f.title.trim(),
        description: f.description.trim(),
        year: f.year ? Number(f.year) : null,
        category_id: categoryId,
        kind: f.kind,
        thumbnail_url: f.thumbnail_url || null,
        banner_url: f.banner_url || null,
        trailer_url: f.trailer_url || null,
        duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
        is_featured: f.is_featured,
        is_coming_soon: f.is_coming_soon,
        is_published: f.is_published,
        publish_at: f.publish_at ? new Date(f.publish_at).toISOString() : new Date().toISOString(),
      };
      const res = video
        ? await supabase.from("videos").update(row).eq("id", video.id).select("id").single()
        : await supabase.from("videos").insert(row).select("id").single();
      if (res.error) throw res.error;
      toast.success(video ? "Video imehifadhiwa" : "Video imeongezwa");
      qc.invalidateQueries({ queryKey: qk.catalog });
      qc.invalidateQueries({ queryKey: ["admin-videos"] });
      onOpenChange(false);
      onSaved?.(res.data.id);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="font-display text-3xl">
          {video ? "Hariri Video" : "Ongeza Video"}
        </DialogTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldRow label="Jina" htmlFor="v-title">
              <Input id="v-title" value={f.title} onChange={(e) => set("title", e.target.value)} />
            </FieldRow>
          </div>
          <div className="sm:col-span-2">
            <FieldRow label="Maelezo" htmlFor="v-desc">
              <Textarea
                id="v-desc"
                rows={3}
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FieldRow>
          </div>
          <FieldRow label="Aina">
            <select
              className={selectCls}
              value={f.kind}
              onChange={(e) => set("kind", e.target.value as "movie" | "series")}
            >
              <option value="movie">Filamu</option>
              <option value="series">Tamthilia (misimu na vipindi)</option>
            </select>
          </FieldRow>
          <FieldRow label="Mwaka">
            <Input
              inputMode="numeric"
              value={f.year}
              onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
          <FieldRow label="Kategoria — chagua">
            <select
              className={selectCls}
              value={f.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">— Hakuna —</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="…au andika kategoria mpya">
            <Input
              value={f.newCategory}
              onChange={(e) => set("newCategory", e.target.value)}
              placeholder="Mf. Kihindi"
            />
          </FieldRow>
          <FieldRow label="Muda (dakika)">
            <Input
              inputMode="numeric"
              value={f.duration_minutes}
              onChange={(e) => set("duration_minutes", e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
          <FieldRow label="Tarehe ya kuchapisha">
            <Input
              type="datetime-local"
              value={f.publish_at}
              onChange={(e) => set("publish_at", e.target.value)}
            />
          </FieldRow>
          <UploadField
            label="Picha ya kadi (wima 2:3)"
            preview="image"
            accept="image/*"
            value={f.thumbnail_url}
            onChange={(v) => set("thumbnail_url", v)}
            upload={(file) => uploadMedia(file, "posters")}
          />
          <UploadField
            label="Bango kubwa (16:9)"
            preview="image"
            accept="image/*"
            value={f.banner_url}
            onChange={(v) => set("banner_url", v)}
            upload={(file) => uploadMedia(file, "banners")}
          />
          <div className="sm:col-span-2">
            <UploadField
              label="Trailer (MP4)"
              accept="video/*"
              value={f.trailer_url}
              onChange={(v) => set("trailer_url", v)}
              upload={(file) => uploadMedia(file, "trailers")}
              hint="Trailer inaonekana kwa wote na inacheza bila sauti kwenye bango."
            />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:col-span-2">
            <Toggle
              label="Imechapishwa"
              checked={f.is_published}
              onChange={(v) => set("is_published", v)}
            />
            <Toggle
              label="Bango kuu (Featured)"
              checked={f.is_featured}
              onChange={(v) => set("is_featured", v)}
            />
            <Toggle
              label="Coming Soon"
              checked={f.is_coming_soon}
              onChange={(v) => set("is_coming_soon", v)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
