import { getUserEarlyInsights, type EarlyInsightCard, type EarlyInsightKey } from "@/lib/analytics/early-insights";

const sectionStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
  borderRadius: 30,
  padding: 24,
  marginTop: 16,
  border: "1px solid rgba(255, 255, 255, 0.05)",
  boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const headingStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  color: "#f5f5f5",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const subheadingStyle: React.CSSProperties = {
  margin: 0,
  color: "#96a0a7",
  fontSize: 14,
  maxWidth: 680,
};

const accentToneMap = {
  green: {
    color: "#20d985",
    glow: "rgba(32, 217, 133, 0.15)",
    pillBorder: "rgba(32, 217, 133, 0.12)",
  },
  red: {
    color: "#20d985",
    glow: "rgba(32, 217, 133, 0.15)",
    pillBorder: "rgba(32, 217, 133, 0.12)",
  },
  neutral: {
    color: "#20d985",
    glow: "rgba(32, 217, 133, 0.15)",
    pillBorder: "rgba(32, 217, 133, 0.12)",
  },
} as const;

const iconMap: Record<EarlyInsightKey, React.ReactNode> = {
  sober_streak_effect: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8M10 3v5l-4.5 7.5A4 4 0 0 0 8.9 21h6.2a4 4 0 0 0 3.4-5.5L14 8V3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  optimal_sleep_cutoff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5v5l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  body_battery_leak: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M18 10h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m10 9-2 3h3l-1 3 4-5h-3l1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  strain_limit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 16.5 10 11l3 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7h2v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  recovery_speed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 6v6l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  best_worst_day: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4M4 9h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  hrv_threshold: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l2-4 4 8 2-4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sleep_gap_days: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 4.5c1.7 0 3 1.3 3 3V9H7a2 2 0 0 0-2 2v4.5c0 2.5 2 4.5 4.5 4.5S14 18 14 15.5V8a3.5 3.5 0 1 1 7 0V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  recovery_streak: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 15c0-3.3 2.7-6 6-6 .6 0 1.2.1 1.8.3C14.7 6.8 17 5 19.7 5 22.1 5 24 6.9 24 9.3c0 5.2-6.4 8.9-12 12.7C6.4 18.2 0 14.5 0 9.3 0 6.9 1.9 5 4.3 5 6 5 7.5 6 8.3 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, -1) scale(0.8)" />
    </svg>
  ),
};

function DashboardInsightCard({ card }: { card: EarlyInsightCard }) {
  const tone = accentToneMap[card.accentTone];
  const icon = iconMap[card.key];

  return (
    <article
      style={{
        minHeight: 222,
        borderRadius: 22,
        padding: 22,
        background: "linear-gradient(180deg, rgba(41, 47, 53, 0.98) 0%, rgba(33, 38, 44, 0.98) 100%)",
        border: `1px solid ${tone.pillBorder}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 28px ${tone.glow}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{ display: "inline-flex", color: "#97a3ab" }}>
            {icon}
          </span>
          <h3 style={{ margin: 0, color: "#c7ced4", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>{card.title}</h3>
        </div>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#20d985",
            boxShadow: "0 0 12px rgba(32, 217, 133, 0.45)",
            flexShrink: 0,
          }}
        />
      </div>

      <div
        style={{
          color: tone.color,
          fontSize: card.accent.length > 10 ? 34 : 42,
          lineHeight: 0.95,
          letterSpacing: "-0.045em",
          fontWeight: 600,
          textTransform: "uppercase",
          wordBreak: "break-word",
        }}
      >
        {card.accent}
      </div>

      <p style={{ margin: 0, color: "#a3adb4", fontSize: 14, lineHeight: 1.45 }}>{card.detail}</p>
    </article>
  );
}

const loadingCards: EarlyInsightCard[] = [
  { key: "sober_streak_effect", title: "Sober streak effect", accent: "...", detail: "Loading live insight", accentTone: "green", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "optimal_sleep_cutoff", title: "Optimal sleep cutoff", accent: "...", detail: "Loading live insight", accentTone: "neutral", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "body_battery_leak", title: "Body battery leak", accent: "...", detail: "Loading live insight", accentTone: "red", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "strain_limit", title: "Your strain limit", accent: "...", detail: "Loading live insight", accentTone: "neutral", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "recovery_speed", title: "Recovery speed", accent: "...", detail: "Loading live insight", accentTone: "neutral", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "best_worst_day", title: "Best & worst day", accent: "...", detail: "Loading live insight", accentTone: "neutral", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "hrv_threshold", title: "HRV threshold", accent: "...", detail: "Loading live insight", accentTone: "red", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "sleep_gap_days", title: "Sleep gap days", accent: "...", detail: "Loading live insight", accentTone: "red", status: "ok", sampleSize: 0, lastComputedAt: "" },
  { key: "recovery_streak", title: "Recovery streak", accent: "...", detail: "Loading live insight", accentTone: "green", status: "ok", sampleSize: 0, lastComputedAt: "" },
];

function InsightsGrid({ cards }: { cards: EarlyInsightCard[] }) {
  return (
    <div className="early-insights-grid">
      {cards.map((card) => (
        <DashboardInsightCard key={card.key} card={card} />
      ))}
    </div>
  );
}

export async function EarlyInsightsSection({ userId }: { userId: string }) {
  const cards = await getUserEarlyInsights(userId);

  return (
    <section style={sectionStyle}>
      <style>{`
        .early-insights-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 22px;
        }

        @media (max-width: 980px) {
          .early-insights-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .early-insights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <h2 style={headingStyle}>Early Insights</h2>
      <p style={subheadingStyle}>Personal patterns from your own history</p>
      <InsightsGrid cards={cards} />
    </section>
  );
}

export function EarlyInsightsLoading() {
  return (
    <section style={sectionStyle}>
      <style>{`
        .early-insights-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 22px;
        }

        @media (max-width: 980px) {
          .early-insights-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .early-insights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <h2 style={headingStyle}>Early Insights</h2>
      <p style={subheadingStyle}>Personal patterns from your own history</p>
      <InsightsGrid cards={loadingCards} />
    </section>
  );
}
