import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Takwimu" },
  { id: "videos", label: "Video na kategoria" },
  { id: "groups", label: "Magroup" },
  { id: "packages", label: "Vifurushi" },
  { id: "payments", label: "Malipo" },
  { id: "users", label: "Watumiaji" },
  { id: "notifications", label: "Arifa" },
  { id: "settings", label: "Mipangilio" },
] as const;
export function useAdminAccess() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["admin-access", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_admin_sections");
      if (error) throw error;
      return data === null ? [...ADMIN_SECTIONS.map((section) => section.id), "admins"] : data;
    },
    staleTime: 30_000,
  });
}
export function hasSection(sections: string[] | undefined, section: string) {
  return !!sections?.includes(section);
}
