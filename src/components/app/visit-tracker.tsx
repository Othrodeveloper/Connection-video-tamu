import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const VISITOR_KEY = "tv_visitor_id";
const SEEN_KEY = "tv_seen_paths";
/** The same page is counted again only after this long, so refreshing doesn't inflate numbers. */
const REPEAT_MS = 30 * 60_000;

function visitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** Counts every page someone opens (signed in or not) for the admin's visitors dashboard. */
export function VisitTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { userId, ready } = useAuth();

  useEffect(() => {
    if (!ready || pathname.startsWith("/admin")) return;
    try {
      const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}") as Record<string, number>;
      if (seen[pathname] && Date.now() - seen[pathname] < REPEAT_MS) return;
      seen[pathname] = Date.now();
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      void supabase
        .from("site_visits")
        .insert({ visitor_id: visitorId(), user_id: userId, path: pathname.slice(0, 300) })
        .then(() => {});
    } catch {
      /* storage blocked — skip counting */
    }
  }, [pathname, userId, ready]);

  return null;
}
