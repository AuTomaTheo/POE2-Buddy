export type BadgeTone =
  | "heuristic"
  | "measured"
  | "community"
  | "user"
  | "success"
  | "caution"
  | "unavailable"
  | "neutral";

export function statusBadgeTone(
  label: string,
): "success" | "caution" | "unavailable" {
  if (label === "Ready") return "success";
  if (label === "Partial") return "caution";
  return "unavailable";
}
