import type { ReactNode } from "react";
import type { BadgeTone } from "./status-tone";

export function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
