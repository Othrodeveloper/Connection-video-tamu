import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { l: string; c: string }> = {
    pending: { l: "Inasubiri", c: "bg-gold/15 text-gold" },
    paid: { l: "Imelipwa", c: "bg-success/15 text-success" },
    joined: { l: "Amejiunga", c: "bg-success/15 text-success" },
    failed: { l: "Imeshindikana", c: "bg-destructive/15 text-destructive" },
  };
  const s = map[status] ?? { l: status, c: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", s.c)}>
      {s.l}
    </span>
  );
}
