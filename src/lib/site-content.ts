import { useSettings } from "@/lib/queries";

/** Pictures, cards and footer the admin controls from Mipangilio → Ukurasa wa Mwanzo. */
export interface Poster {
  image: string;
  title: string;
}
export interface Feature {
  title: string;
  body: string;
  image?: string;
}
export interface SiteContent {
  hero_image: string;
  auth_image: string;
  posters: Poster[];
  features: Feature[];
  /** "" hides the copyright line. */
  copyright: string;
  whatsapp_channel: string;
  channel_name: string;
  channel_image: string;
  manual_payment_number: string;
  manual_payment_name: string;
}

export const DEFAULT_CONTENT: SiteContent = {
  hero_image: "/images/banner-familia.jpg",
  auth_image: "/images/banner-kivuli.jpg",
  posters: [
    { image: "/images/poster-kivuli.jpg", title: "Kivuli" },
    { image: "/images/poster-familia.jpg", title: "Familia" },
    { image: "/images/poster-mfalme.jpg", title: "Mfalme" },
    { image: "/images/poster-zanzibar.jpg", title: "Zanzibar" },
    { image: "/images/poster-moto.jpg", title: "Moto" },
    { image: "/images/poster-dhahabu.jpg", title: "Dhahabu" },
    { image: "/images/poster-kilimanjaro.jpg", title: "Kilimanjaro" },
    { image: "/images/poster-vicheko.jpg", title: "Vicheko" },
  ],
  features: [
    {
      title: "Simu Kwanza",
      body: "Imetengenezwa kwa ajili ya simu, na inafanya kazi vizuri pia kwenye kompyuta na tablet.",
    },
    {
      title: "Ubora wa Sinema",
      body: "Picha safi, maandishi ya tafsiri, misimu na vipindi. Unaendelea pale ulipoishia.",
    },
    {
      title: "Lipia kwa M-Pesa",
      body: "Chagua kifurushi cha siku, wiki au mwezi, kisha video zote zinafunguka.",
    },
  ],
  copyright: "© {mwaka} TRANDING VIDEO. Haki zote zimehifadhiwa.",
  whatsapp_channel: "",
  channel_name: "TRANDING VIDEO CONNECTION",
  channel_image: "",
  manual_payment_number: "0754 000 000",
  manual_payment_name: "TRANDING VIDEO",
};

function str(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

/** Admin-saved content merged over the defaults. */
export function readContent(raw: unknown): SiteContent {
  const c =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const posters = Array.isArray(c["posters"])
    ? (c["posters"] as unknown[]).flatMap((p) => {
        const o = p as Record<string, unknown> | null;
        return o && typeof o["image"] === "string"
          ? [{ image: o["image"] as string, title: str(o["title"], "") }]
          : [];
      })
    : DEFAULT_CONTENT.posters;
  const features = Array.isArray(c["features"])
    ? (c["features"] as unknown[]).flatMap((f) => {
        const o = f as Record<string, unknown> | null;
        if (!o) return [];
        const out: Feature = { title: str(o["title"], ""), body: str(o["body"], "") };
        if (typeof o["image"] === "string" && o["image"]) out.image = o["image"];
        return [out];
      })
    : DEFAULT_CONTENT.features;
  return {
    hero_image: str(c["hero_image"], "") || DEFAULT_CONTENT.hero_image,
    auth_image: str(c["auth_image"], "") || DEFAULT_CONTENT.auth_image,
    posters,
    features,
    copyright: str(c["copyright"], DEFAULT_CONTENT.copyright),
    whatsapp_channel: str(c["whatsapp_channel"], ""),
    channel_name: str(c["channel_name"], DEFAULT_CONTENT.channel_name),
    channel_image: str(c["channel_image"], ""),
    manual_payment_number: str(c["manual_payment_number"], DEFAULT_CONTENT.manual_payment_number),
    manual_payment_name: str(c["manual_payment_name"], DEFAULT_CONTENT.manual_payment_name),
  };
}

/** Copyright line with {mwaka} replaced by the current year. */
export function copyrightLine(text: string) {
  return text.replace(/\{mwaka\}/gi, String(new Date().getFullYear()));
}

export function useContent() {
  const { data } = useSettings();
  return readContent(data?.content);
}
