import type { Metadata } from "next";

import { BrandWordmark } from "@/components/brand-wordmark";
import { DeleteDataForm } from "../dashboard/delete-data-form";
import { EarlyInsightsLoading } from "../dashboard/early-insights-section";
import { FirstDashboardFeedbackCard } from "../dashboard/first-dashboard-feedback-card";
import { UnlocksRoadmap } from "../dashboard/unlocks-roadmap";

export const metadata: Metadata = {
  title: "Dashboard Preview",
};

export default function DashboardPreviewPage() {
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
      <header
        style={{
          background: "linear-gradient(180deg, #121212 0%, #090909 100%)",
          borderRadius: 28,
          padding: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          border: "1px solid #232323",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div>
          <BrandWordmark subtitle="WHOOP-inspired local dashboard preview." />
          <h1 style={{ margin: "14px 0 6px", color: "#f5f5f5", fontSize: 54, lineHeight: 0.95, letterSpacing: "-0.06em", textTransform: "uppercase" }}>Dashboard</h1>
          <p style={{ margin: 0, color: "#9a9a9a" }}>Preview user: alex@example.com</p>
          <p style={{ margin: "6px 0 0", color: "#7c7c7c" }}>Comparing against 25-34, male, United Kingdom.</p>
          <p style={{ margin: "6px 0 0", color: "#7c7c7c" }}>Local-only preview route for evaluating the redesign before any production release.</p>
        </div>

        <div style={{ display: "grid", justifyItems: "end", gap: 10 }}>
          <p style={{ margin: 0, padding: "8px 12px", borderRadius: 999, background: "#171717", color: "#f5f5f5", border: "1px solid #242424" }}>Dataset: 84 users</p>
        </div>
      </header>

      <FirstDashboardFeedbackCard promptSeenAt={null} />
      <EarlyInsightsLoading />
      <UnlocksRoadmap totalUsers={84} earlyComparison={{ recovery: { percentile: 68 }, sleep: { delta: 21 }, hrv: { delta: 6 } }} />

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
