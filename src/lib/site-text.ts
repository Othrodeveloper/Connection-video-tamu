import { useSettings } from "@/lib/queries";

/** Every piece of site wording the admin can rename. Key → [section, label, default]. */
export const TEXT_FIELDS = {
  "landing.badge": ["Ukurasa wa Mwanzo", "Kibandiko juu ya kichwa", "Burudani ya VIP"],
  "landing.title": ["Ukurasa wa Mwanzo", "Kichwa kikubwa", "Tazama Filamu na Tamthilia"],
  "landing.subtitle": [
    "Ukurasa wa Mwanzo",
    "Maelezo chini ya kichwa",
    "Filamu mpya na tamthilia unazozipenda kila wiki, kwenye simu yako. Jisajili kwa namba ya simu na uanze kutazama.",
  ],
  "landing.cta": ["Ukurasa wa Mwanzo", "Kitufe cha kujisajili", "Jisajili Uanze Kutazama"],
  "landing.login": ["Ukurasa wa Mwanzo", "Kitufe cha kuingia", "Nina Akaunti"],
  "landing.posters": ["Ukurasa wa Mwanzo", "Kichwa juu ya picha", "Zinazopatikana Sasa"],
  "landing.features": ["Ukurasa wa Mwanzo", "Kichwa juu ya kadi", "Kwa Nini Utuchague"],

  "auth.login.title": ["Kuingia", "Kichwa cha kuingia", "Karibu Tena"],
  "auth.login.sub": ["Kuingia", "Maelezo ya kuingia", "Ingia kwa namba yako ya simu"],
  "auth.register.title": ["Kuingia", "Kichwa cha kujisajili", "Fungua Akaunti"],
  "auth.register.sub": ["Kuingia", "Maelezo ya kujisajili", "Jisajili kwa sekunde chache tu"],

  "nav.home": ["Menyu", "Home", "Home"],
  "nav.search": ["Menyu", "Tafuta", "Tafuta"],
  "nav.list": ["Menyu", "Orodha Yangu", "Orodha Yangu"],
  "nav.groups": ["Menyu", "Magroup", "Magroup"],
  "nav.profile": ["Menyu", "Profile", "Profile"],

  "home.continue": ["Safu za Home", "Endelea kutazama", "Endelea Kutazama"],
  "home.new": ["Safu za Home", "Video mpya", "Mpya"],
  "home.popular": ["Safu za Home", "Zinazotazamwa zaidi", "Zinazotazamwa Zaidi"],
  "home.loved": ["Safu za Home", "Zilizopendwa zaidi", "Zilizopendwa Zaidi"],
  "home.series": ["Safu za Home", "Tamthilia", "Tamthilia"],
  "home.soon": ["Safu za Home", "Zinakuja", "Zinakuja Hivi Karibuni"],

  "paywall.title": ["Malipo", "Kichwa cha dirisha la malipo", "Lipia Hapa Kutazama"],
  "paywall.subtitle": [
    "Malipo",
    "Maelezo ya dirisha la malipo",
    "Fungua filamu na tamthilia zote bila kikomo",
  ],
  "paywall.button": ["Malipo", "Kitufe cha kulipia", "Lipia"],
  "paywall.done": [
    "Malipo",
    "Ujumbe wa malipo kukamilika",
    "Video zote zimefunguka. Asante, Enjoy!",
  ],

  "groups.title": ["Magroup", "Kichwa cha ukurasa", "Magroup"],
  "groups.sub": ["Magroup", "Maelezo ya ukurasa", "Jumuika na watu wanaopenda unachopenda"],

  "support.title": ["Wasiliana Nasi", "Kichwa cha sehemu ya mawasiliano", "Wasiliana Nasi"],
} as const satisfies Record<string, readonly [string, string, string]>;

export type TextKey = keyof typeof TEXT_FIELDS;

export function textOverrides(texts: unknown): Record<string, string> {
  if (!texts || typeof texts !== "object" || Array.isArray(texts)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(texts as Record<string, unknown>))
    if (typeof v === "string" && v.trim()) out[k] = v;
  return out;
}

/** Admin-saved wording when present, otherwise the built-in default. */
export function resolveText(texts: unknown, key: TextKey): string {
  return textOverrides(texts)[key] ?? TEXT_FIELDS[key][2];
}

export function useText() {
  const { data } = useSettings();
  return (key: TextKey) => resolveText(data?.texts, key);
}
