import { Link } from "@tanstack/react-router";
import { useSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const DEFAULT_LOGO = "/images/logo.png";

export function useLogo() {
  const { data } = useSettings();
  return { logo: data?.logo_url || DEFAULT_LOGO, name: data?.site_name || "TRANDING VIDEO" };
}

/** The site's logo picture on its own (admin can replace it in Mipangilio). */
export function LogoMark({ className }: { className?: string }) {
  const { logo, name } = useLogo();
  return (
    <img
      src={logo}
      alt={name}
      className={cn(
        "h-16 w-16 rounded-2xl object-cover shadow-glow ring-1 ring-gold/40",
        className,
      )}
    />
  );
}

/** Logo with blue circles turning around it (login, landing, payment). */
export function LogoRings({
  className,
  size = "h-20 w-20",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <div className={cn("relative inline-flex items-center justify-center p-3", className)}>
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border-2 border-dashed border-blue/70 animate-spin-slow"
      />
      <span
        aria-hidden
        className="absolute -inset-2 rounded-full border border-blue-glow/40 animate-spin-reverse"
      />
      <span aria-hidden className="absolute inset-1 rounded-full bg-blue/15 blur-md" />
      <LogoMark className={cn("relative shadow-blue ring-2 ring-blue/60", size)} />
    </div>
  );
}

export function Brand({
  className,
  to = "/",
}: {
  className?: string;
  to?: "/" | "/home" | "/admin";
}) {
  const { logo, name } = useLogo();
  const [first, ...rest] = name.split(" ");
  return (
    <Link to={to} className={cn("flex items-center gap-2", className)} aria-label={name}>
      <img src={logo} alt="" className="h-8 w-8 rounded-md object-cover sm:h-9 sm:w-9" />
      <span className="font-display text-2xl leading-none text-primary sm:text-3xl">
        {first}
        {rest.length ? <span className="text-gold"> {rest.join(" ")}</span> : null}
      </span>
    </Link>
  );
}
