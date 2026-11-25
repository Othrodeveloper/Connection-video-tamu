import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "drizzle/migrations/0011_restrict_notification_reads_to_released_content.sql",
  "utf8",
);

describe("Notification read policy", () => {
  it("replaces unrestricted reads with a signed-in access predicate", () => {
    expect(sql).toContain('ALTER POLICY "Signed in read notifications"');
    expect(sql).toContain("ON public.notifications");
    expect(sql).toContain("TO authenticated");
    expect(sql).toContain("auth.uid() IS NOT NULL");
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it("preserves general announcements without exposing unlinked video alerts", () => {
    expect(sql).toContain("kind = 'info' AND video_id IS NULL");
  });

  it("requires the linked video to be published and already released", () => {
    expect(sql).toContain("notification_video.id = notifications.video_id");
    expect(sql).toContain("AND notification_video.is_published");
    expect(sql).toContain("AND notification_video.publish_at <= now()");
  });

  it("leaves administrator management and all other table policies unchanged", () => {
    expect(sql.match(/ALTER POLICY/g)).toHaveLength(1);
    expect(sql).not.toMatch(/CREATE POLICY|DROP POLICY|GRANT|REVOKE/i);
    expect(sql).not.toContain('"Admins manage notifications"');
  });
});
