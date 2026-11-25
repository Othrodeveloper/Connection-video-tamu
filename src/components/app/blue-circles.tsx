import { cn } from "@/lib/utils";

/** Soft blue circles floating behind a page (login and payment screens). */
export function BlueCircles({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <span className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-blue/30 blur-3xl animate-float" />
      <span className="absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-blue-glow/25 blur-3xl animate-float [animation-delay:-3s]" />
      <span className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-blue/25 blur-3xl animate-float [animation-delay:-5s]" />
      <span className="absolute right-8 top-16 h-24 w-24 rounded-full border-2 border-blue/50" />
      <span className="absolute bottom-24 left-6 h-16 w-16 rounded-full border-2 border-blue-glow/50" />
      <span className="absolute bottom-10 right-1/4 h-10 w-10 rounded-full bg-blue/40" />
    </div>
  );
}
