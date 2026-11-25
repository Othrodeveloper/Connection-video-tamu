import { Copy, MessageSquare, Share2 } from "lucide-react";
import {
  FaFacebookF,
  FaTelegram as FaTelegramPlane,
  FaWhatsapp,
  FaXTwitter,
} from "react-icons/fa6";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Share an invite link through the phone's share menu or straight to WhatsApp, Facebook, Telegram, SMS or X. */
export function ShareInvite({
  link,
  siteName,
  code,
}: {
  link: string;
  siteName: string;
  code: string;
}) {
  const text = `Karibu ${siteName}! Tazama filamu na tamthilia mpya kwenye simu yako. Jisajili kwa link hii (namba ya mwaliko: ${code}):`;
  const msg = `${text} ${link}`;
  const enc = encodeURIComponent;
  const targets = [
    {
      l: "WhatsApp",
      href: `https://wa.me/?text=${enc(msg)}`,
      Icon: FaWhatsapp,
      tone: "bg-brand-whatsapp",
    },
    {
      l: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(text)}`,
      Icon: FaFacebookF,
      tone: "bg-brand-facebook",
    },
    {
      l: "Telegram",
      href: `https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`,
      Icon: FaTelegramPlane,
      tone: "bg-brand-telegram",
    },
    { l: "SMS", href: `sms:?body=${enc(msg)}`, Icon: MessageSquare, tone: "bg-gradient-green" },
    {
      l: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`,
      Icon: FaXTwitter,
      tone: "bg-brand-tiktok ring-1 ring-foreground/20",
    },
  ];

  async function shareMenu() {
    if (navigator.share) {
      try {
        await navigator.share({ title: siteName, text, url: link });
      } catch {
        /* user closed the share menu */
      }
      return;
    }
    await copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Link imenakiliwa — ibandike popote");
    } catch {
      toast.error("Imeshindikana kunakili. Shikilia link kuinakili.");
    }
  }

  if (!link) return null;
  return (
    <div className="space-y-3">
      <Button variant="blue" size="lg" className="w-full" onClick={shareMenu}>
        <Share2 /> Shiriki kwa Marafiki
      </Button>
      <div className="flex flex-wrap justify-center gap-3">
        {targets.map((t) => (
          <a
            key={t.l}
            href={t.href}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 text-[11px] font-semibold text-muted-foreground"
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-foreground shadow-card transition-transform hover:scale-110",
                t.tone,
              )}
            >
              <t.Icon className="h-5 w-5" />
            </span>
            {t.l}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          className="flex flex-col items-center gap-1 text-[11px] font-semibold text-muted-foreground"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-orange text-foreground shadow-card transition-transform hover:scale-110">
            <Copy className="h-5 w-5" />
          </span>
          Nakili
        </button>
      </div>
      <p className="break-all rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted-foreground">
        {link}
      </p>
    </div>
  );
}
