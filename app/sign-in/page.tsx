import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandWordmark } from "@/components/brand-wordmark";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    const profile = await getCurrentProfile(user.id);
    redirect(profile ? "/dashboard" : "/onboarding");
  }
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 16, minHeight: "100vh", display: "grid", alignItems: "center" }}>
      <style>{`
        .sign-in-shell {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 420px);
          gap: 18px;
          align-items: stretch;
        }

        @media (max-width: 900px) {
          .sign-in-shell {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sign-in-highlights {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .sign-in-highlight-card {
            padding: 14px !important;
            gap: 10px !important;
          }

          .sign-in-highlight-title {
            font-size: 11px !important;
            letter-spacing: 0.12em !important;
          }

          .sign-in-highlight-value {
            margin-top: 10px !important;
            font-size: 28px !important;
            line-height: 0.95 !important;
            letter-spacing: -0.035em !important;
          }

          .sign-in-highlight-body {
            font-size: 12px !important;
            line-height: 1.35 !important;
          }
        }
      `}</style>
      <section className="sign-in-shell">
        <article
          style={{
            background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
            borderRadius: 30,
            padding: 32,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
            display: "grid",
            alignContent: "space-between",
            minHeight: 620,
          }}
        >
          <div>
            <BrandWordmark subtitle="WHOOP benchmarks made simple" />
            <p style={{ margin: "26px 0 8px", color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Welcome back</p>
            <h1 style={{ margin: 0, fontSize: 64, lineHeight: 0.92, letterSpacing: "-0.06em", textTransform: "uppercase" }}>How do you compare to people like you</h1>
          </div>

          <div className="sign-in-highlights" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 26 }}>
            {[
              {
                label: "Recovery Rank",
                value: "50%",
                body: "Your average recovery score is higher than 50% of users in the current dataset",
              },
              {
                label: "Optimal Sleep Cutoff",
                value: "00:00",
                body: "Your recovery is usually 68+ when you're asleep before 00:00. When you go later, it drops to 45 on average",
              },
              {
                label: "Body Battery Leak",
                value: "-17 pts",
                body: "Your body loses ~17 recovery points after nights with less than 6h of sleep",
              },
            ].map((item) => (
              <div className="sign-in-highlight-card" key={item.label} style={{ background: "linear-gradient(180deg, rgba(41, 47, 53, 0.98) 0%, rgba(33, 38, 44, 0.98) 100%)", borderRadius: 22, padding: 20, border: "1px solid rgba(32, 217, 133, 0.12)", display: "grid", gap: 14, alignContent: "space-between", minWidth: 0 }}>
                <p className="sign-in-highlight-title" style={{ margin: 0, color: "#c7ced4", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>{item.label}</p>
                <p className="sign-in-highlight-value" style={{ margin: "18px 0 0", color: "#20d985", fontSize: 38, lineHeight: 0.95, letterSpacing: "-0.045em", fontWeight: 600, wordBreak: "break-word" }}>{item.value}</p>
                <p className="sign-in-highlight-body" style={{ margin: 0, color: "#a3adb4", lineHeight: 1.45, fontSize: 14, wordBreak: "break-word" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </article>

        <section
          style={{
            background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
            borderRadius: 30,
            padding: 28,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <p style={{ margin: 0, color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Account access</p>
          <h2 style={{ margin: "12px 0 8px", fontSize: 34, lineHeight: 0.95, letterSpacing: "-0.04em", textTransform: "uppercase" }}>Sign in to your account</h2>
          <p style={{ color: "#20d985", margin: 0 }}>Access your benchmarks, early insights</p>
          <SignInForm />
        </section>
      </section>
    </main>
  );
}
