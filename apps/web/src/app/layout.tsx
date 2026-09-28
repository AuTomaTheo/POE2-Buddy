import type { Metadata } from "next";
import { AppShell } from "./shell/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoE2 Buddy",
  description: "Deterministic Path of Exile 2 build helper",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
