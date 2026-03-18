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
      <body
        style={{
          margin: 0,
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          background:
            "radial-gradient(circle at top left, rgba(40, 40, 40, 0.45), transparent 30%), radial-gradient(circle at top right, rgba(32, 217, 133, 0.12), transparent 26%), #050505",
          color: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        <style>{`
          * {
            box-sizing: border-box;
          }

          html {
            background: #050505;
          }

          body {
            min-height: 100vh;
          }

          a {
            color: #f5f5f5;
          }

          button,
          input,
          select,
          textarea {
            font: inherit;
          }

          ::selection {
            background: rgba(32, 217, 133, 0.28);
            color: #f5f5f5;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
