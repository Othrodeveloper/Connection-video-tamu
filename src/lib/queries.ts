import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";

export type Video = Tables<"videos"> & { category: { name: string } | null };
export type Episode = Tables<"episodes">;
export type Season = Tables<"seasons">;
export type Package = Tables<"packages">;
export type Group = Tables<"groups">;
export type SiteSettings = Tables<"site_settings">;

export const qk = {
  settings: ["settings"] as const,
  catalog: ["catalog"] as const,
  categories: ["categories"] as const,
  packages: ["packages"] as const,
  profile: (uid: string | null) => ["profile", uid] as const,
  subscription: (uid: string | null) => ["subscription", uid] as const,
  isAdmin: (uid: string | null) => ["isAdmin", uid] as const,
  watchlist: (uid: string | null) => ["watchlist", uid] as const,
  likes: (uid: string | null) => ["likes", uid] as const,
  progress: (uid: string | null) => ["progress", uid] as const,
  groups: ["groups"] as const,
  memberships: (uid: string | null) => ["memberships", uid] as const,
  notifications: ["notifications"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: qk.catalog,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, category:categories(name)")
        .order("publish_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Video[];
    },
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePackages() {
  return useQuery({
    queryKey: qk.packages,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("sort");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.profile(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsAdmin() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.isAdmin(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId!, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });
}

/** Latest active access window. `active` also covers admins (they can always watch). */
export function useSubscription() {
  const { userId } = useAuth();
  const admin = useIsAdmin();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const q = useQuery({
    queryKey: qk.subscription(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("expires_at, package_id, source")
        .eq("user_id", userId!)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
  const expiresAt = q.data?.expires_at ?? null;
  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return;
    const t = setTimeout(() => setNowMs(Date.now()), Math.min(diff + 50, 86_400_000));
    return () => clearTimeout(t);
  }, [expiresAt, nowMs]);
  const subActive = !!expiresAt && new Date(expiresAt).getTime() > nowMs;
  return {
    ...q,
    isLoading: q.isLoading || admin.isLoading,
    expiresAt: subActive ? expiresAt : null,
    active: subActive || !!admin.data,
    isAdmin: !!admin.data,
  };
}

export function useWatchlistIds() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.watchlist(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("video_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.video_id);
    },
  });
}

export function useLikedIds() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.likes(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("likes")
        .select("video_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.video_id));
    },
  });
}

export function useProgress() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.progress(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_progress")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGroups() {
  return useQuery({
    queryKey: qk.groups,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("is_active", true)
        .order("sort");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMemberships() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.memberships(userId),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_memberships")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotifications() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: qk.notifications,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 120_000,
  });
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return "Hitilafu imetokea. Jaribu tena.";
}
