import { ContactIcons } from "@/components/app/support-links";
import { copyrightLine, useContent } from "@/lib/site-content";
import { useText } from "@/lib/site-text";
import { cn } from "@/lib/utils";

/** Contact icons + copyright line; both are set by the admin. */
export function SiteFooter({ className }: { className?: string }) {
  const content = useContent();
  const t = useText();
  return (
    <footer className={cn("border-t border-border px-4 py-8 text-center", className)}>
      <p className="mb-4 text-sm font-bold">{t("support.title")}</p>
      <ContactIcons />
      {content.copyright.trim() ? (
        <p className="mt-5 text-xs text-muted-foreground">{copyrightLine(content.copyright)}</p>
      ) : null}
    </footer>
  );
}
