import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaPhoneAlt,
  FaTelegramPlane,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTitle, FieldRow, Panel, UploadField } from "@/components/admin/admin-ui";
import { Spinner } from "@/components/app/states";
import { errorMessage, qk, useSettings, type SiteSettings } from "@/lib/queries";
import { uploadMedia } from "@/lib/media";
import { TEXT_FIELDS, textOverrides, type TextKey } from "@/lib/site-text";
import { DEFAULT_CONTENT, copyrightLine, readContent, type SiteContent } from "@/lib/site-content";
import { TRIAL_SECONDS, whatsappChannel } from "@/lib/experience-rules";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Mipangilio — Admin TRANDING VIDEO" },
      {
        name: "description",
        content: "Badilisha jina, logo, picha, maneno, mawasiliano na copyright ya tovuti.",
      },
      { property: "og:title", content: "Mipangilio — Admin TRANDING VIDEO" },
      {
        property: "og:description",
        content: "Badilisha jina, logo, picha, maneno, mawasiliano na copyright ya tovuti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const uploadImage = (f: File) => uploadMedia(f, "site");

function SettingsPage() {
  const settings = useSettings();
  if (settings.isLoading || !settings.data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }
  return <SettingsForm initial={settings.data} />;
}

type Support = Pick<
  SiteSettings,
  | "support_whatsapp"
  | "support_phone"
  | "support_email"
  | "support_instagram"
  | "support_facebook"
  | "support_tiktok"
  | "support_telegram"
  | "support_hours"
  | "support_message"
>;

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [general, setGeneral] = useState({
    site_name: initial.site_name,
    logo_url: initial.logo_url ?? "",
    intro_video_url: initial.intro_video_url ?? "",
    paywall_delay_seconds: String(initial.paywall_delay_seconds),
    referral_reward_days: String(initial.referral_reward_days),
    payment_instructions: initial.payment_instructions ?? "",
    trial_seconds: String(initial.trial_seconds),
    welcome_minutes: String(initial.welcome_minutes),
  });
  const [support, setSupport] = useState<Support>({
    support_whatsapp: initial.support_whatsapp ?? "",
    support_phone: initial.support_phone ?? "",
    support_email: initial.support_email ?? "",
    support_instagram: initial.support_instagram ?? "",
    support_facebook: initial.support_facebook ?? "",
    support_tiktok: initial.support_tiktok ?? "",
    support_telegram: initial.support_telegram ?? "",
    support_hours: initial.support_hours ?? "",
    support_message: initial.support_message ?? "",
  });
  const [texts, setTexts] = useState<Record<string, string>>(() => textOverrides(initial.texts));
  const [content, setContent] = useState<SiteContent>(() => readContent(initial.content));

  async function save() {
    if (!general.site_name.trim()) {
      toast.error("Weka jina la tovuti");
      return;
    }
    if (content.whatsapp_channel && !whatsappChannel(content.whatsapp_channel)) {
      toast.error("Weka link sahihi ya WhatsApp channel");
      return;
    }
    setBusy(true);
    const cleanTexts = Object.fromEntries(Object.entries(texts).filter(([, v]) => v.trim()));
    const nul = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: general.site_name.trim(),
        logo_url: nul(general.logo_url),
        intro_video_url: nul(general.intro_video_url),
        paywall_delay_seconds: Math.max(0, Number(general.paywall_delay_seconds) || 0),
        referral_reward_days: Math.max(0, Number(general.referral_reward_days) || 0),
        payment_instructions: nul(general.payment_instructions),
        trial_seconds: TRIAL_SECONDS,
        welcome_minutes: 0,
        support_whatsapp: nul(support.support_whatsapp),
        support_phone: nul(support.support_phone),
        support_email: nul(support.support_email),
        support_instagram: nul(support.support_instagram),
        support_facebook: nul(support.support_facebook),
        support_tiktok: nul(support.support_tiktok),
        support_telegram: nul(support.support_telegram),
        support_hours: nul(support.support_hours),
        support_message: nul(support.support_message),
        texts: cleanTexts,
        content: content as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Mabadiliko yamehifadhiwa. Yanaonekana kwenye tovuti sasa hivi.");
    qc.invalidateQueries({ queryKey: qk.settings });
  }

  const saveBtn = (
    <Button variant="hero" onClick={save} disabled={busy}>
      {busy ? <Spinner className="h-4 w-4 text-primary-foreground" /> : <Save />} Hifadhi Yote
    </Button>
  );

  return (
    <div className="max-w-4xl pb-24">
      <AdminTitle
        sub="Kila kitu unachobadilisha hapa kinaonekana kwa wateja ukibonyeza Hifadhi"
        action={saveBtn}
      >
        Mipangilio
      </AdminTitle>

      <Tabs defaultValue="landing">
        <TabsList className="scrollbar-none mb-4 h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="landing">Ukurasa wa Mwanzo</TabsTrigger>
          <TabsTrigger value="general">Jina na Logo</TabsTrigger>
          <TabsTrigger value="contact">Wasiliana Nasi</TabsTrigger>
          <TabsTrigger value="texts">Maneno Yote</TabsTrigger>
        </TabsList>

        <TabsContent value="landing" className="space-y-4">
          <Section
            title="Picha kubwa za nyuma"
            sub="Picha inayoonekana nyuma ya kichwa kwenye ukurasa wa mwanzo, na nyuma ya fomu ya kuingia."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePick
                label="Ukurasa wa mwanzo"
                value={content.hero_image}
                onChange={(v) => setContent({ ...content, hero_image: v })}
                wide
              />
              <ImagePick
                label="Ukurasa wa kuingia"
                value={content.auth_image}
                onChange={(v) => setContent({ ...content, auth_image: v })}
                wide
              />
            </div>
          </Section>

          <Section title="Kichwa na maelezo">
            <TextInputs
              keys={[
                "landing.badge",
                "landing.title",
                "landing.subtitle",
                "landing.cta",
                "landing.login",
              ]}
              texts={texts}
              setTexts={setTexts}
            />
          </Section>

          <Section
            title="Picha za filamu (chini ya kichwa)"
            sub="Kila picha ina jina lake chini. Ongeza, badilisha, panga au futa."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setContent({
                    ...content,
                    posters: [...content.posters, { image: "", title: "" }],
                  })
                }
              >
                <Plus /> Ongeza Picha
              </Button>
            }
          >
            <TextInputs keys={["landing.posters"]} texts={texts} setTexts={setTexts} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {content.posters.map((p, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-border bg-background/50 p-2"
                >
                  <ImagePick
                    value={p.image}
                    onChange={(v) =>
                      setContent({
                        ...content,
                        posters: content.posters.map((x, j) => (j === i ? { ...x, image: v } : x)),
                      })
                    }
                  />
                  <Input
                    value={p.title}
                    placeholder="Jina la filamu"
                    onChange={(e) =>
                      setContent({
                        ...content,
                        posters: content.posters.map((x, j) =>
                          j === i ? { ...x, title: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <ItemTools
                    i={i}
                    list={content.posters}
                    onChange={(posters) => setContent({ ...content, posters })}
                  />
                </div>
              ))}
            </div>
            {!content.posters.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Hakuna picha. Sehemu hii imefichwa kwa wateja.
              </p>
            ) : null}
          </Section>

          <Section
            title="Kadi za maelezo"
            sub="Mfano: Simu Kwanza, Ubora wa Sinema, Lipia kwa M-Pesa. Picha si lazima."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setContent({
                    ...content,
                    features: [...content.features, { title: "", body: "" }],
                  })
                }
              >
                <Plus /> Ongeza Kadi
              </Button>
            }
          >
            <TextInputs keys={["landing.features"]} texts={texts} setTexts={setTexts} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {content.features.map((f, i) => {
                const set = (patch: Partial<typeof f>) =>
                  setContent({
                    ...content,
                    features: content.features.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                  });
                return (
                  <div
                    key={i}
                    className="space-y-2 rounded-xl border border-border bg-background/50 p-3"
                  >
                    <ImagePick
                      label="Picha (si lazima)"
                      value={f.image ?? ""}
                      onChange={(v) => set({ image: v })}
                      wide
                    />
                    <FieldRow label="Jina la kadi">
                      <Input value={f.title} onChange={(e) => set({ title: e.target.value })} />
                    </FieldRow>
                    <FieldRow label="Maelezo">
                      <Textarea
                        rows={3}
                        value={f.body}
                        onChange={(e) => set({ body: e.target.value })}
                      />
                    </FieldRow>
                    <ItemTools
                      i={i}
                      list={content.features}
                      onChange={(features) => setContent({ ...content, features })}
                    />
                  </div>
                );
              })}
            </div>
          </Section>

          <Section
            title="Copyright (chini kabisa ya tovuti)"
            sub="Andika {mwaka} ili mwaka uwekwe wenyewe. Ukifuta yote, mstari huu hautaonekana."
          >
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-0 flex-1"
                value={content.copyright}
                onChange={(e) => setContent({ ...content, copyright: e.target.value })}
                placeholder="Mf. © {mwaka} TRANDING VIDEO"
              />
              <Button
                variant="ghost"
                onClick={() => setContent({ ...content, copyright: DEFAULT_CONTENT.copyright })}
              >
                <RotateCcw /> Ya awali
              </Button>
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setContent({ ...content, copyright: "" })}
              >
                <Trash2 /> Futa
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Itaonekana hivi:{" "}
              {content.copyright.trim() ? (
                <strong className="text-foreground">{copyrightLine(content.copyright)}</strong>
              ) : (
                <em>(imefichwa)</em>
              )}
            </p>
          </Section>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Section
            title="Jina na logo"
            sub="Logo inaonekana kila mahali: mwanzo, kuingia, home, malipo na admin."
          >
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className="w-28">
                <ImagePick
                  value={general.logo_url}
                  onChange={(v) => setGeneral({ ...general, logo_url: v })}
                  square
                />
              </div>
              <FieldRow label="Jina la tovuti">
                <Input
                  value={general.site_name}
                  onChange={(e) => setGeneral({ ...general, site_name: e.target.value })}
                />
              </FieldRow>
            </div>
          </Section>
          <Section title="Video ya utangulizi" sub="Inaonekana mara moja baada ya mtu kujisajili.">
            <UploadField
              label="Video (MP4)"
              value={general.intro_video_url}
              onChange={(v) => setGeneral({ ...general, intro_video_url: v })}
              upload={(f) => uploadMedia(f, "intro")}
              accept="video/mp4,video/*"
            />
          </Section>
          <Section title="Malipo na zawadi">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Sekunde za majaribio">
                <Input value={TRIAL_SECONDS} readOnly />
              </FieldRow>
              <FieldRow label="Dakika za bure kwa mtumiaji mpya">
                <Input value={0} readOnly />
              </FieldRow>
              <FieldRow label="Dirisha la malipo litokee baada ya sekunde ngapi?">
                <Input
                  inputMode="numeric"
                  value={general.paywall_delay_seconds}
                  onChange={(e) =>
                    setGeneral({
                      ...general,
                      paywall_delay_seconds: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </FieldRow>
              <FieldRow label="Siku za bure kwa anayemwalika rafiki">
                <Input
                  inputMode="numeric"
                  value={general.referral_reward_days}
                  onChange={(e) =>
                    setGeneral({
                      ...general,
                      referral_reward_days: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </FieldRow>
            </div>
            <div className="mt-4">
              <FieldRow label="Maelekezo ya kulipa (yanaonekana kwenye dirisha la malipo)">
                <Textarea
                  rows={3}
                  value={general.payment_instructions}
                  onChange={(e) => setGeneral({ ...general, payment_instructions: e.target.value })}
                  placeholder="Mf. Utapokea ujumbe kwenye simu yako. Weka namba yako ya siri kwenye simu kuthibitisha."
                />
              </FieldRow>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Section
            title="WhatsApp Channel Invitation"
            sub="Sanduku la Follow lina picha, jina na link. Ukiacha link wazi, itatumia link ya WhatsApp ya Support hapa chini."
          >
            <div className="mb-4 grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-start">
              <div className="w-28">
                <ImagePick
                  label="Picha (DP) ya channel"
                  value={content.channel_image}
                  onChange={(v) => setContent({ ...content, channel_image: v })}
                  square
                />
              </div>
              <div className="space-y-3">
                <FieldRow label="Jina la channel">
                  <Input
                    value={content.channel_name}
                    onChange={(e) => setContent({ ...content, channel_name: e.target.value })}
                    placeholder="TRANDING VIDEO CONNECTION"
                  />
                </FieldRow>
                <FieldRow
                  label="Link ya WhatsApp channel"
                  hint="Mf. https://whatsapp.com/channel/..."
                >
                  <Input
                    value={content.whatsapp_channel}
                    onChange={(e) => setContent({ ...content, whatsapp_channel: e.target.value })}
                    placeholder="Tumia link ya Support au weka hapa"
                  />
                </FieldRow>
              </div>
            </div>
          </Section>
          <Section
            title="Vitufe vya Wasiliana Nasi"
            sub="Weka link au namba. Kitufe kinaonekana kwa wateja ukijaza sehemu yake tu; ukiacha wazi, kitufe kinafichwa."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactField
                icon={<FaWhatsapp />}
                tone="bg-brand-whatsapp"
                label="WhatsApp"
                hint="Namba (mf. 255713822753) au link ya wa.me"
                value={support.support_whatsapp ?? ""}
                onChange={(v) => setSupport({ ...support, support_whatsapp: v })}
              />
              <ContactField
                icon={<FaPhoneAlt />}
                tone="bg-success"
                label="Namba ya kupiga"
                hint="Mf. 0713 822 753"
                value={support.support_phone ?? ""}
                onChange={(v) => setSupport({ ...support, support_phone: v })}
              />
              <ContactField
                icon={<MdEmail />}
                tone="bg-brand-email"
                label="Email"
                hint="Mf. msaada@mfano.com"
                value={support.support_email ?? ""}
                onChange={(v) => setSupport({ ...support, support_email: v })}
              />
              <ContactField
                icon={<FaInstagram />}
                tone="bg-brand-instagram"
                label="Instagram"
                hint="Link au jina la akaunti"
                value={support.support_instagram ?? ""}
                onChange={(v) => setSupport({ ...support, support_instagram: v })}
              />
              <ContactField
                icon={<FaFacebookF />}
                tone="bg-brand-facebook"
                label="Facebook"
                hint="Link ya ukurasa"
                value={support.support_facebook ?? ""}
                onChange={(v) => setSupport({ ...support, support_facebook: v })}
              />
              <ContactField
                icon={<FaTiktok />}
                tone="bg-brand-tiktok ring-1 ring-foreground/20"
                label="TikTok"
                hint="Link au @jina"
                value={support.support_tiktok ?? ""}
                onChange={(v) => setSupport({ ...support, support_tiktok: v })}
              />
              <ContactField
                icon={<FaTelegramPlane />}
                tone="bg-brand-telegram"
                label="Telegram"
                hint="Link au jina"
                value={support.support_telegram ?? ""}
                onChange={(v) => setSupport({ ...support, support_telegram: v })}
              />
            </div>
          </Section>
          <Section title="Maelezo ya ziada">
            <div className="grid gap-4">
              <TextInputs keys={["support.title"]} texts={texts} setTexts={setTexts} />
              <FieldRow label="Ujumbe kwa wateja">
                <Textarea
                  rows={2}
                  value={support.support_message ?? ""}
                  onChange={(e) => setSupport({ ...support, support_message: e.target.value })}
                  placeholder="Mf. Tuko tayari kukusaidia muda wowote."
                />
              </FieldRow>
              <FieldRow label="Muda wa kazi">
                <Input
                  value={support.support_hours ?? ""}
                  onChange={(e) => setSupport({ ...support, support_hours: e.target.value })}
                  placeholder="Mf. Jumatatu – Jumamosi, saa 2 asubuhi – saa 4 usiku"
                />
              </FieldRow>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="texts" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Badilisha jina lolote linaloonekana kwenye tovuti. Ukiacha wazi, jina la awali
            linatumika.
          </p>
          {groupTextKeys().map(([section, keys]) => (
            <Section key={section} title={section}>
              <TextInputs keys={keys} texts={texts} setTexts={setTexts} />
            </Section>
          ))}
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-4xl justify-end">{saveBtn}</div>
      </div>
    </div>
  );
}

function groupTextKeys(): [string, TextKey[]][] {
  const map = new Map<string, TextKey[]>();
  for (const [k, [section]] of Object.entries(TEXT_FIELDS) as [
    TextKey,
    readonly [string, string, string],
  ][]) {
    if (!map.has(section)) map.set(section, []);
    map.get(section)!.push(k);
  }
  return [...map.entries()];
}

function Section({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{title}</h2>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Panel>
  );
}

function TextInputs({
  keys,
  texts,
  setTexts,
}: {
  keys: TextKey[];
  texts: Record<string, string>;
  setTexts: (t: Record<string, string>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {keys.map((k) => {
        const [, label, def] = TEXT_FIELDS[k];
        const long = def.length > 60;
        return (
          <div key={k} className={long ? "sm:col-span-2" : ""}>
            <FieldRow label={label}>
              {long ? (
                <Textarea
                  rows={2}
                  value={texts[k] ?? ""}
                  placeholder={def}
                  onChange={(e) => setTexts({ ...texts, [k]: e.target.value })}
                />
              ) : (
                <Input
                  value={texts[k] ?? ""}
                  placeholder={def}
                  onChange={(e) => setTexts({ ...texts, [k]: e.target.value })}
                />
              )}
            </FieldRow>
          </div>
        );
      })}
    </div>
  );
}

function ContactField({
  icon,
  tone,
  label,
  hint,
  value,
  onChange,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground ${tone}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <FieldRow label={label} hint={hint}>
          <div className="flex gap-1">
            <Input value={value} onChange={(e) => onChange(e.target.value)} />
            {value ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange("")}
                aria-label={`Futa ${label}`}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </FieldRow>
      </div>
    </div>
  );
}

/** Picture preview that uploads on tap; works for posters, backgrounds and the logo. */
function ImagePick({
  label,
  value,
  onChange,
  wide,
  square,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  square?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const aspect = square ? "aspect-square" : wide ? "aspect-video" : "aspect-[2/3]";
  return (
    <div className="space-y-1.5">
      {label ? <p className="text-xs font-semibold text-muted-foreground">{label}</p> : null}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`group relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-surface-2 ${aspect}`}
        aria-label={value ? "Badilisha picha" : "Pakia picha"}
      >
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : null}
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs font-semibold ${value ? "bg-scrim opacity-0 transition-opacity group-hover:opacity-100" : "text-muted-foreground"}`}
        >
          {busy ? <Spinner className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
          {busy ? "Inapakia…" : value ? "Badilisha" : "Pakia picha"}
        </span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            onChange(await uploadImage(f));
            toast.success("Picha imepakiwa. Bonyeza Hifadhi Yote.");
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function ItemTools<T>({ i, list, onChange }: { i: number; list: T[]; onChange: (l: T[]) => void }) {
  const move = (d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="flex justify-between">
      <div className="flex">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={i === 0}
          onClick={() => move(-1)}
          aria-label="Peleka mbele"
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={i === list.length - 1}
          onClick={() => move(1)}
          aria-label="Peleka nyuma"
        >
          <ArrowDown />
        </Button>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="text-destructive"
        onClick={() => onChange(list.filter((_, j) => j !== i))}
        aria-label="Futa"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
