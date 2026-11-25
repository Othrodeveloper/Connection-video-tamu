import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "drizzle/migrations/0010_fix_signup_welcome_subscription_source.sql",
  "utf8",
);
const check = sql.match(/CHECK\s*\(source IN\s*\(([^)]+)\)\)/i)?.[1] ?? "";
const allowedSources = [...check.matchAll(/'([^']+)'/g)].map((match) => match[1]);

describe("Signup subscription sources", () => {
  it("permits the welcome access inserted during new-user signup", () => {
    expect(allowedSources).toContain("welcome");
  });
  it("permits bulk offers alongside existing payment and referral access", () => {
    expect(allowedSources).toEqual(["payment", "referral", "admin", "offer", "welcome"]);
    expect(allowedSources).not.toContain("unknown");
  });
});
