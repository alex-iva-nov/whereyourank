import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandWordmark } from "@/components/brand-wordmark";
import { getCurrentProfile, requireUser } from "@/lib/auth/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile(user.id);

  if (profile) {
    redirect("/dashboard");
  }
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, minHeight: "100vh", display: "grid", alignItems: "center" }}>
      <style>{`
        .onboarding-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
          gap: 18px;
          align-items: stretch;
        }

        @media (max-width: 900px) {
          .onboarding-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section className="onboarding-shell">
        <article
          style={{
            background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
            borderRadius: 30,
            padding: 32,
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <BrandWordmark subtitle="A quick setup before your first benchmark" />
          <p style={{ margin: "26px 0 8px", color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Profile setup</p>
          <h1 style={{ margin: 0, fontSize: 58, lineHeight: 0.94, letterSpacing: "-0.06em", textTransform: "uppercase" }}>Complete your profile</h1>
          <p style={{ color: "#a3adb4", margin: "18px 0 0", maxWidth: 520, lineHeight: 1.5 }}>
            We only ask for the minimum needed to compare your metrics with similar users. No full name. No exact birth date.
          </p>
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
          <p style={{ margin: 0, color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Demographics</p>
          <h2 style={{ margin: "12px 0 8px", fontSize: 34, lineHeight: 0.95, letterSpacing: "-0.04em", textTransform: "uppercase" }}>Tell us the basics</h2>
          <p style={{ color: "#20d985", margin: 0 }}>These fields power your cohort matching and dashboard benchmarks.</p>
          <OnboardingForm />
        </section>
      </section>
    </main>
  );
}
