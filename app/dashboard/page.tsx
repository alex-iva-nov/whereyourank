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
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: 16,
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(40, 40, 40, 0.45), transparent 30%), radial-gradient(circle at top right, rgba(27, 94, 32, 0.16), transparent 26%), #050505",
      }}
    >
      <style>{`
        .dashboard-header {
          background: linear-gradient(180deg, #121212 0%, #090909 100%);
          border-radius: 28px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border: 1px solid #232323;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }

        .dashboard-title {
          margin: 14px 0 6px;
          color: #f5f5f5;
          font-size: 54px;
          line-height: 0.95;
          letter-spacing: -0.06em;
          text-transform: uppercase;
        }

        .dashboard-actions {
          display: grid;
          justify-items: end;
          gap: 10px;
        }

        .dashboard-action-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        @media (max-width: 760px) {
          .dashboard-header {
            padding: 18px;
            align-items: flex-start;
            flex-direction: column;
          }

          .dashboard-title {
            font-size: 42px;
          }

          .dashboard-actions {
            width: 100%;
            justify-items: stretch;
          }

          .dashboard-action-row {
            justify-content: flex-start;
          }
        }

        @media (max-width: 480px) {
          .dashboard-title {
            font-size: 32px;
          }
        }
      `}</style>
      <DashboardViewTracker />
      <header className="dashboard-header">
        <div>
          <BrandWordmark subtitle="Your WHOOP benchmarks and early insights" />
          <h1 className="dashboard-title">Dashboard</h1>
          <p style={{ margin: 0, color: "#9a9a9a" }}>Signed in as {user.email}</p>
          <p style={{ margin: "6px 0 0", color: "#7c7c7c" }}>
            Comparing against {formatAgeBucketLabel(profile.age_bucket)}, {formatSexLabel(profile.sex).toLowerCase()}, {getCountryName(profile.country)}
          </p>
          <p style={{ margin: "6px 0 0", color: "#7c7c7c" }}>
            Informational only, not medical advice. See the{" "}
            <Link href="/privacy" style={{ color: "#f5f5f5" }}>
              Privacy Notice
            </Link>{" "}
            and{" "}
            <Link href="/terms" style={{ color: "#f5f5f5" }}>
              Terms of Use
            </Link>
          </p>
        </div>

        <div className="dashboard-actions">
          <p style={{ margin: 0, padding: "8px 12px", borderRadius: 999, background: "#171717", color: "#f5f5f5", border: "1px solid #242424" }}>Dataset: {totalUsers} users</p>
          <div className="dashboard-action-row">
            <Link href="/upload" style={{ padding: "10px 14px", background: "#171717", color: "#f5f5f5", borderRadius: 999, border: "1px solid #242424" }}>
              Upload files
            </Link>
            <form action="/api/auth/sign-out" method="post">
              <button type="submit" style={{ padding: "10px 14px", borderRadius: 999, background: "#f5f5f5", color: "#080808", border: "none", fontWeight: 700 }}>
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

      <section
        style={{
          background: "linear-gradient(180deg, #121212 0%, #090909 100%)",
          borderRadius: 28,
          padding: 24,
          marginTop: 16,
          border: "1px solid #232323",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#f5f5f5", textTransform: "uppercase", letterSpacing: "-0.04em" }}>Delete My Data</h2>
        <DeleteDataForm />
      </section>
    </main>
  );
}
