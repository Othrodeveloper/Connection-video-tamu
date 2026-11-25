import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadField } from "@/components/admin/admin-ui";
import { uploadMedia } from "@/lib/media";
import { errorMessage } from "@/lib/queries";

export function useGroupSlides() {
  return useQuery({
    queryKey: ["group-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_slides")
        .select("*")
        .order("sort")
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function GroupIntroduction() {
  const slides = useGroupSlides();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (finished || !slides.data?.length) return;
    const timer = setTimeout(() => {
      if (index >= (slides.data?.length ?? 0) - 1) setFinished(true);
      else setIndex(index + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [index, finished, slides.data]);
  const slide = slides.data?.[index];
  if (finished || !slide) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-label="Picha za magroup"
      aria-modal="true"
    >
      <img src={slide.image_url} alt={slide.title} className="min-h-0 flex-1 object-contain" />
      <div className="space-y-3 px-5 py-5 text-center">
        <h2 className="text-xl font-bold">{slide.title}</h2>
        <p className="text-sm text-muted-foreground">
          {index + 1} / {slides.data?.length}
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Picha iliyopita"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button variant="blue" onClick={() => setFinished(true)}>
            Fungua Magroup
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Picha inayofuata"
            onClick={() =>
              index + 1 < (slides.data?.length ?? 0) ? setIndex(index + 1) : setFinished(true)
            }
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminGroupSlides() {
  const slides = useGroupSlides();
  const qc = useQueryClient();
  const [image, setImage] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!image) return;
    setBusy(true);
    const { error } = await supabase.from("group_slides").insert({
      image_url: image,
      title: title.trim(),
      sort: (slides.data?.at(-1)?.sort ?? -1) + 1,
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setImage("");
    setTitle("");
    await qc.invalidateQueries({ queryKey: ["group-slides"] });
    toast.success("Picha imehifadhiwa");
  }
  return (
    <section className="mb-6 space-y-4 border-b border-border pb-6">
      <h2 className="text-lg font-bold">Picha za kufungua magroup</h2>
      <div className="flex gap-3 overflow-x-auto">
        {slides.data?.map((slide) => (
          <div key={slide.id} className="w-40 shrink-0 space-y-2">
            <img
              src={slide.image_url}
              alt={slide.title}
              className="aspect-video w-full rounded-lg object-cover"
            />
            <Input
              aria-label="Jina la picha"
              defaultValue={slide.title}
              onBlur={async (e) => {
                const { error } = await supabase
                  .from("group_slides")
                  .update({ title: e.target.value })
                  .eq("id", slide.id);
                if (error) toast.error(errorMessage(error));
                else qc.invalidateQueries({ queryKey: ["group-slides"] });
              }}
            />
            <Input
              aria-label="Mpangilio wa picha"
              type="number"
              defaultValue={slide.sort}
              onBlur={async (e) => {
                const { error } = await supabase
                  .from("group_slides")
                  .update({ sort: Number(e.target.value) || 0 })
                  .eq("id", slide.id);
                if (error) toast.error(errorMessage(error));
                else qc.invalidateQueries({ queryKey: ["group-slides"] });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Futa picha ya magroup"
              onClick={async () => {
                if (!confirm("Futa picha hii?")) return;
                const { error } = await supabase.from("group_slides").delete().eq("id", slide.id);
                if (error) toast.error(errorMessage(error));
                else qc.invalidateQueries({ queryKey: ["group-slides"] });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadField
          label="Picha mpya ya magroup"
          preview="image"
          accept="image/*"
          value={image}
          onChange={setImage}
          upload={(f) => uploadMedia(f, "groups")}
        />
        <div className="space-y-3">
          <Input
            aria-label="Jina la picha mpya"
            placeholder="Jina la picha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button variant="blue" disabled={!image || busy} onClick={add}>
            {busy ? <Save /> : <Plus />} Hifadhi Picha
          </Button>
        </div>
      </div>
    </section>
  );
}
