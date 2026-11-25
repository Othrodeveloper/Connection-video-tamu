import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { timeLeft } from "@/lib/format";
import { cn } from "@/lib/utils";
import { countdownTone } from "@/lib/experience-rules";

export function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  const qc = useQueryClient();
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const left = expiresAt ? timeLeft(expiresAt, now) : null;
  useEffect(() => {
    // When the package runs out, refresh access so content locks automatically.
    if (expiresAt && left && left.totalMs === 0)
      qc.invalidateQueries({ queryKey: ["subscription"] });
  }, [expiresAt, left?.totalMs, qc]);
  return left;
}

export function CountdownBlocks({
  expiresAt,
  className,
}: {
  expiresAt: string;
  className?: string;
}) {
  const left = useCountdown(expiresAt);
  if (!left) return null;
  const items = [
    { v: left.days, l: "Siku" },
    { v: left.hours, l: "Saa" },
    { v: left.minutes, l: "Dakika" },
    { v: left.seconds, l: "Sekunde" },
  ];
  const urgent = countdownTone(left.totalMs) === "urgent";
  return (
    <div className={cn("grid grid-cols-4 gap-2 tabular-nums", className)}>
      {items.map((it) => (
        <div
          key={it.l}
          className={cn(
            "min-w-0 rounded-lg border bg-background px-2 py-2 text-center shadow-card",
            urgent ? "border-destructive/70" : "border-success/70",
          )}
        >
          <div
            className={cn(
              "font-display text-3xl font-bold leading-none",
              urgent ? "text-destructive" : "text-success",
            )}
          >
            {String(it.v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {it.l}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CountdownChip({ expiresAt }: { expiresAt: string }) {
  const left = useCountdown(expiresAt);
  if (!left) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-bold tabular-nums shadow-card",
        countdownTone(left.totalMs) === "urgent"
          ? "border-destructive/70 text-destructive"
          : "border-success/70 text-success",
      )}
    >
      VIP · {left.days} siku · {String(left.hours).padStart(2, "0")}:
      {String(left.minutes).padStart(2, "0")}:{String(left.seconds).padStart(2, "0")}
    </span>
  );
}
