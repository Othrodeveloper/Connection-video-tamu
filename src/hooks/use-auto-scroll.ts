import { useEffect, useRef, useState, type RefObject } from "react";

/** Moves a horizontal row forward by one item every `ms`, and back to the start at the end. Pauses while touched. */
export function useAutoScroll<T extends HTMLElement>(
  ms = 2000,
  enabled = true,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let paused = false;
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    const id = window.setInterval(() => {
      if (paused || document.hidden) return;
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
      const step = first.offsetWidth + gap;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, ms);
    return () => {
      window.clearInterval(id);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [ms, enabled]);
  return ref;
}

/** Rotates a list one step to the left every `ms` (first item goes to the end). */
export function useRotating<T>(items: T[], ms = 3000) {
  const [shift, setShift] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setShift((s) => s + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [items.length, ms]);
  const n = items.length || 1;
  const k = shift % n;
  return { list: [...items.slice(k), ...items.slice(0, k)], tick: shift };
}
