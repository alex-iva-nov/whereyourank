import type { Metadata } from "next";
import Link from "next/link";

import { BrandWordmark } from "@/components/brand-wordmark";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 16, minHeight: "100vh", display: "grid", alignItems: "center" }}>
      <style>{`
        .reset-password-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
          gap: 18px;
          align-items: stretch;
        }

        @media (max-width: 900px) {
          .reset-password-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section className="reset-password-shell">
        <article
          style={{
            background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
            borderRadius: 30,
            padding: 32,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
            display: "grid",
            alignContent: "center",
            minHeight: 460,
          }}
        >
          <BrandWordmark subtitle="WHOOP benchmarks made simple" />
          <p style={{ margin: "30px 0 8px", color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Account access</p>
          <h1 style={{ margin: 0, fontSize: 58, lineHeight: 0.92, letterSpacing: "-0.06em", textTransform: "uppercase" }}>Get back to your benchmarks</h1>
        </article>

        <section
          style={{
            background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
            borderRadius: 30,
            padding: 28,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
            alignSelf: "stretch",
          }}
        >
          <p style={{ margin: 0, color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Password reset</p>
          <h2 style={{ margin: "12px 0 8px", fontSize: 34, lineHeight: 0.95, letterSpacing: "-0.04em", textTransform: "uppercase" }}>Set a new password</h2>
          <p style={{ color: "#20d985", margin: 0 }}>Choose a secure password for your account.</p>
          <ResetPasswordForm />
          <Link href="/sign-in" style={{ display: "inline-block", marginTop: 16, color: "#c7ced4", fontWeight: 700, textDecoration: "none" }}>
            Back to sign in
          </Link>
        </section>
      </section>
    </main>
  );
}
