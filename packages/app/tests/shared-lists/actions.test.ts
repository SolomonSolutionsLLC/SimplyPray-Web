import { describe, it, expect } from "vitest";
import { canPublish } from "@/lib/shared-lists/permissions";

describe("canPublish", () => {
  it("allows church owner", () => {
    expect(canPublish({ scope: "church", churchRole: "owner" })).toBe(true);
  });
  it("allows church admin", () => {
    expect(canPublish({ scope: "church", churchRole: "admin" })).toBe(true);
  });
  it("rejects church member", () => {
    expect(canPublish({ scope: "church", churchRole: "member" })).toBe(false);
  });
  it("allows group admin + moderator", () => {
    expect(canPublish({ scope: "group", groupRole: "admin" })).toBe(true);
    expect(canPublish({ scope: "group", groupRole: "moderator" })).toBe(true);
  });
  it("rejects group member", () => {
    expect(canPublish({ scope: "group", groupRole: "member" })).toBe(false);
  });
});
