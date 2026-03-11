import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "WhereYouRank",
    template: "%s | WhereYouRank",
  },
  description: "WhereYouRank turns your WHOOP exports into clear benchmarks and early insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f7f7f7" }}>{children}</body>
    </html>
  );
}