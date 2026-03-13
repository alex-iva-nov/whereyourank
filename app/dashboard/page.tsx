import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BrandWordmark } from "@/components/brand-wordmark";
import { getEarlyComparisonSectionData } from "@/lib/analytics/early-comparison";
import { requireOnboardingComplete } from "@/lib/auth/server";
import { getFirstDashboardFeedbackPromptState } from "@/lib/feedback/first-dashboard";
import { getUserDataCount } from "@/lib/product/user-data-count";
import { formatAgeBucketLabel, formatSexLabel, getCountryName } from "@/lib/profile/demographics";
import { DashboardViewTracker } from "./dashboard-view-tracker";
import { DeleteDataForm } from "./delete-data-form";
import { EarlyInsightsLoading, EarlyInsightsSection } from "./early-insights-section";
import { FirstDashboardFeedbackCard } from "./first-dashboard-feedback-card";
import { UnlocksRoadmap } from "./unlocks-roadmap";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { user, profile } = await requireOnboardingComplete();
  const [{ totalUsers }, earlyComparison, feedbackPrompt] = await Promise.all([
    getUserDataCount(),
    getEarlyComparisonSectionData(user.id),
    getFirstDashboardFeedbackPromptState(user.id),
  ]);

  return (
    <main style={{ maxWidth: 1000, margin: "30px auto", padding: 16 }}>
      <DashboardViewTracker />
      <header style={{ background: "#fff", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <BrandWordmark subtitle="Your WHOOP benchmarks and early insights." />
          <h1 style={{ margin: "14px 0 6px" }}>Dashboard</h1>
          <p style={{ margin: 0, color: "#555" }}>Signed in as {user.email}</p>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            Comparing against {formatAgeBucketLabel(profile.age_bucket)}, {formatSexLabel(profile.sex).toLowerCase()}, {getCountryName(profile.country)}.
          </p>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            Informational only, not medical advice. See the <Link href="/privacy">Privacy Notice</Link> and <Link href="/terms">Terms of Use</Link>.
          </p>
        </div>

        <div style={{ display: "grid", justifyItems: "end", gap: 10 }}>
          <p style={{ margin: 0, padding: "6px 10px", borderRadius: 999, background: "#f3f3f3", color: "#444" }}>Dataset: {totalUsers} users</p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/upload" style={{ padding: "8px 12px", background: "#eee", borderRadius: 6 }}>
              Upload files
            </Link>
            <form action="/api/auth/sign-out" method="post">
              <button type="submit" style={{ padding: "8px 12px" }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {feedbackPrompt.shouldShowPrompt ? (
        <FirstDashboardFeedbackCard promptSeenAt={feedbackPrompt.promptSeenAt} />
      ) : null}

      <Suspense fallback={<EarlyInsightsLoading />}>
        <EarlyInsightsSection userId={user.id} />
      </Suspense>

      <UnlocksRoadmap totalUsers={totalUsers} earlyComparison={earlyComparison} />

      <section style={{ background: "#fff", borderRadius: 8, padding: 16, marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>Delete My Data</h2>
        <DeleteDataForm />
      </section>
    </main>
  );
}
