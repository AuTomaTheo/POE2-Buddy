import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PoE2 Helper",
  description: "Deterministic Path of Exile 2 build helper",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
