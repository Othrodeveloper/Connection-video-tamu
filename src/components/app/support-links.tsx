import type { ComponentType } from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaPhoneAlt,
  FaTelegramPlane,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { Clock } from "lucide-react";
import { useSettings, type SiteSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

function digits(v: string) {
  return v.replace(/\D/g, "");
}

/** Admin can paste a full link or just a username/number; turn either into a working link. */
function social(v: string, base: string) {
  const t = v.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}\//i.test(t)) return `https://${t}`;
  return base + t.replace(/^@/, "");
}

export interface ContactItem {
  key: string;
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  tone: string;
}

export function contactItems(s: SiteSettings | null | undefined): ContactItem[] {
  if (!s) return [];
  const out: ContactItem[] = [];
  const wa = s.support_whatsapp?.trim();
  if (wa)
    out.push({
      key: "wa",
      href: /^https?:/i.test(wa) ? wa : `https://wa.me/${digits(wa)}`,
      label: "WhatsApp",
      Icon: FaWhatsapp,
      tone: "bg-brand-whatsapp",
    });
  if (s.support_phone?.trim())
    out.push({
      key: "tel",
      href: `tel:${s.support_phone.replace(/[^\d+]/g, "")}`,
      label: "Piga Simu",
      Icon: FaPhoneAlt,
      tone: "bg-success",
    });
  if (s.support_email?.trim())
    out.push({
      key: "mail",
      href: `mailto:${s.support_email.trim()}`,
      label: "Email",
      Icon: MdEmail,
      tone: "bg-brand-email",
    });
  if (s.support_instagram?.trim())
    out.push({
      key: "ig",
      href: social(s.support_instagram, "https://instagram.com/"),
      label: "Instagram",
      Icon: FaInstagram,
      tone: "bg-brand-instagram",
    });
  if (s.support_facebook?.trim())
    out.push({
      key: "fb",
      href: social(s.support_facebook, "https://facebook.com/"),
      label: "Facebook",
      Icon: FaFacebookF,
      tone: "bg-brand-facebook",
    });
  if (s.support_tiktok?.trim())
    out.push({
      key: "tt",
      href: social(s.support_tiktok, "https://tiktok.com/@"),
      label: "TikTok",
      Icon: FaTiktok,
      tone: "bg-brand-tiktok ring-1 ring-foreground/20",
    });
  if (s.support_telegram?.trim())
    out.push({
      key: "tg",
      href: social(s.support_telegram, "https://t.me/"),
      label: "Telegram",
      Icon: FaTelegramPlane,
      tone: "bg-brand-telegram",
    });
  return out;
}

/** Round icon buttons only (used in footers). */
export function ContactIcons({ className = "" }: { className?: string }) {
  const { data } = useSettings();
  const items = contactItems(data);
  if (!items.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-3", className)}>
      {items.map((i) => (
        <a
          key={i.key}
          href={i.href}
          target="_blank"
          rel="noreferrer"
          aria-label={i.label}
          title={i.label}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-foreground shadow-card transition-transform hover:scale-110",
            i.tone,
          )}
        >
          <i.Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

/** "Wasiliana Nasi" block: message, big labelled buttons, opening hours. */
export function SupportLinks({ className = "" }: { className?: string }) {
  const { data: s } = useSettings();
  if (!s) return null;
  const items = contactItems(s);
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {s.support_message ? <p className="text-muted-foreground">{s.support_message}</p> : null}
      {items.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((i) => (
            <a
              key={i.key}
              href={i.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 p-2.5 font-semibold transition-colors hover:border-primary/50"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground",
                  i.tone,
                )}
              >
                <i.Icon className="h-4 w-4" />
              </span>
              {i.label}
            </a>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Mawasiliano bado hayajawekwa.</p>
      )}
      {s.support_hours ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" /> {s.support_hours}
        </p>
      ) : null}
    </div>
  );
}
