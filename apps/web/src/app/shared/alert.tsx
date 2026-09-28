import type { ReactNode } from "react";

export function Alert({
  tone,
  children,
}: {
  tone: "info" | "caution" | "blocking";
  children: ReactNode;
}) {
  return (
    <p
      className={`alert alert-${tone}`}
      role={tone === "blocking" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
