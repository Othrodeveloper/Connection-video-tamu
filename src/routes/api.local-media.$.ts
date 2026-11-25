import { createFileRoute } from "@tanstack/react-router";

async function serveMedia(request: Request, splat: string): Promise<Response> {
  if (process.env["SUPABASE_URL"] && process.env["SUPABASE_PUBLISHABLE_KEY"]) {
    return new Response("Not Found", { status: 404 });
  }
  const { handleLocalMediaServe } = await import("@/integrations/supabase/local-store.server");
  const fallback = new URL(request.url).pathname.replace(/^\/api\/local-media\/?/, "");
  return handleLocalMediaServe(request, splat || fallback);
}

export const Route = createFileRoute("/api/local-media/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => serveMedia(request, params._splat ?? ""),
      HEAD: async ({ request, params }) => serveMedia(request, params._splat ?? ""),
    },
  },
});
