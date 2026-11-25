import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/local-supabase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["SUPABASE_URL"] && process.env["SUPABASE_PUBLISHABLE_KEY"]) {
          return new Response("Not Found", { status: 404 });
        }
        const { handleLocalSupabasePost } =
          await import("@/integrations/supabase/local-store.server");
        return handleLocalSupabasePost(request);
      },
    },
  },
});
