export type CanPublishInput =
  | { scope: "church"; churchRole: string | null }
  | { scope: "group"; groupRole: string | null };

export function canPublish(input: CanPublishInput): boolean {
  if (input.scope === "church") return ["owner", "admin"].includes(input.churchRole ?? "");
  return ["admin", "moderator"].includes(input.groupRole ?? "");
}

export type CanModerateInput = CanPublishInput;

export function canModerate(input: CanModerateInput): boolean {
  if (input.scope === "church") return ["owner", "admin"].includes(input.churchRole ?? "");
  return ["admin", "moderator"].includes(input.groupRole ?? "");
}
