import { getUserEarlyInsights, type EarlyInsightCard } from "@/lib/analytics/early-insights";

const renderFactors = (insight: EarlyInsightCard) => {
  if (insight.status !== "ok" || !insight.metrics) return null;
  if (insight.key !== "recovery_killers" && insight.key !== "hrv_boosters") return null;

  return (
    <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
      {insight.metrics.factors.map((factor) => (
        <li key={factor.key} style={{ marginBottom: 6 }}>
          {factor.label}
        </li>
      ))}
    </ul>
  );
};

const renderInsightDetails = (insight: EarlyInsightCard) => {
  if (insight.status !== "ok" || !insight.metrics) return null;

  if (insight.key === "recovery_killers" || insight.key === "hrv_boosters") {
    return renderFactors(insight);
  }

  return null;
};

const InsightCard = ({ insight }: { insight: EarlyInsightCard }) => {
  const isError = insight.status === "error";
  const borderColor = isError ? "#f2c2c2" : insight.status === "insufficient_data" ? "#f0e0b2" : "#ddd";

  return (
    <article style={{ background: "#fff", borderRadius: 8, border: `1px solid ${borderColor}`, padding: 14, minHeight: 148 }}>
      <h3 style={{ margin: 0, fontSize: 18 }}>{insight.title}</h3>

      <p style={{ margin: "10px 0 0", color: isError ? "#b42318" : "#333", whiteSpace: "pre-line" }}>{insight.summary}</p>
      {renderInsightDetails(insight)}
    </article>
  );
};

export async function EarlyInsightsSection({ userId }: { userId: string }) {
  const insights = await getUserEarlyInsights(userId);

  return (
    <section style={{ background: "#fff", borderRadius: 8, padding: 16, marginTop: 12 }}>
      <h2 style={{ marginTop: 0 }}>Early Insights</h2>
      <p style={{ margin: "0 0 12px", color: "#555" }}>Personal patterns from your own history.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {insights.map((insight) => (
          <InsightCard key={insight.key} insight={insight} />
        ))}
      </div>
    </section>
  );
}

export function EarlyInsightsLoading() {
  const placeholders = [
    "Optimal sleep cutoff",
    "Real sleep need",
    "Your body battery leak",
    "Your HRV baseline",
    "What boosts your HRV",
    "Your strain limit",
    "Your recovery speed",
    "Recovery insight",
    "TOP Recovery killers",
  ];

  return (
    <section style={{ background: "#fff", borderRadius: 8, padding: 16, marginTop: 12 }}>
      <h2 style={{ marginTop: 0 }}>Early Insights</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {placeholders.map((title) => (
          <article key={title} style={{ background: "#fff", borderRadius: 8, border: "1px solid #ddd", padding: 14, minHeight: 148 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
            <p style={{ margin: "10px 0 0", color: "#777" }}>Loading insight...</p>
          </article>
        ))}
      </div>
    </section>
  );
}
