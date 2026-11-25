<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Project rules

- Visitor counts come from the `VisitTracker` in `__root.tsx` inserting into `site_visits` (anon allowed, admin-only read); admin stats are read through security-definer RPCs (`admin_analytics`, `admin_video_stats`) so RLS stays strict.
- Video plays are logged by the `record_view` RPC into `video_views`; do not increment `videos.views` from the client directly.
- Admin actions use security-definer SQL functions or authenticated server functions checking `can_manage` for their section; full-administrator operations check `admins` so scoped staff cannot escalate privileges.
- Blocked accounts are gated once in `_authenticated/route.tsx` via `BlockedGate`, not per page.
- Payment key settings return configuration status only; credential reads and provider calls stay server-side so browsers cannot retrieve stored keys.
- Cleanup is explicit, scoped and confirmed through a full-admin RPC; accounts, pending and successful payments, and subscriptions are never part of cache cleanup.
- The channel invitation uses account-persisted Follow and ten-minute Back reminders with an admin-uploaded channel image/name and a validated HTTPS WhatsApp channel URL; it is deferred on landing, login, admin and player screens.
- Checkout has two sequential steps (selection, then phone confirmation); the player remounts per episode and refreshes access every second to prevent stale playback state.
- Group purchases share the payment wizard and store `payments.group_id`; finalization grants group membership instead of video access so group prices cannot unlock unrelated packages.
- Group introduction images live in `group_slides` with section-scoped edits, preserving independent administration and ordering.
- Account deletion is a separate full-admin authenticated server action with explicit account confirmation, staff protection, Auth deletion and app-detail cleanup; anonymized financial records remain for reconciliation.
- Notification reads are limited by database policy to unlinked general announcements or published, released videos; notification managers retain section-scoped access so draft content cannot leak through alerts.
