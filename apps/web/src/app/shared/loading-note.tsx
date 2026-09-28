import type { ReactNode } from "react";

export function LoadingNote({ children }: { children: ReactNode }) {
  return (
    <p className="loading-note" role="status">
      <span className="loading-mark" aria-hidden="true" />
      {children}
    </p>
  );
}
