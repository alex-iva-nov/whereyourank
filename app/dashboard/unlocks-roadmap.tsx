"use client";

import { useState } from "react";

type EarlyComparisonSectionData = {
  recovery: { percentile: number | null };
  sleep: { delta: number | null };
  hrv: { delta: number | null };
};

type UnlocksRoadmapProps = {
  totalUsers: number;
  earlyComparison: EarlyComparisonSectionData;
};

type ComparisonTone = "green" | "red" | "neutral";

type ComparisonCardProps = {
  title: string;
  accent: string;
  body: string;
  tone: ComparisonTone;
  icon: React.ReactNode;
};

type MilestoneCardProps = {
  title: string;
  description: string;
  items: string[];
  example: string;
  unlocked: boolean;
};

const sectionStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
  borderRadius: 30,
  padding: 24,
  marginTop: 16,
  border: "1px solid rgba(255, 255, 255, 0.05)",
  boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
};

const toneStyles = {
  green: {
    dot: "#20d985",
    border: "rgba(32, 217, 133, 0.12)",
    glow: "rgba(32, 217, 133, 0.15)",
    text: "#20d985",
  },
  red: {
    dot: "#20d985",
    border: "rgba(32, 217, 133, 0.12)",
    glow: "rgba(32, 217, 133, 0.15)",
    text: "#20d985",
  },
  neutral: {
    dot: "#20d985",
    border: "rgba(32, 217, 133, 0.12)",
    glow: "rgba(32, 217, 133, 0.15)",
    text: "#20d985",
  },
} as const;

function ComparisonCard({ title, accent, body, tone, icon }: ComparisonCardProps) {
  const colors = toneStyles[tone];

  return (
    <article
      style={{
        minHeight: 220,
        borderRadius: 22,
        padding: 22,
        background: "linear-gradient(180deg, rgba(41, 47, 53, 0.98) 0%, rgba(33, 38, 44, 0.98) 100%)",
        border: `1px solid ${colors.border}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 28px ${colors.glow}`,
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
          <h3 style={{ margin: 0, color: "#c7ced4", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>{title}</h3>
        </div>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: colors.dot,
            boxShadow: "0 0 12px rgba(32, 217, 133, 0.45)",
            flexShrink: 0,
          }}
        />
      </div>

      <div style={{ color: colors.text, fontSize: accent.length > 12 ? 28 : 42, lineHeight: 0.95, letterSpacing: "-0.045em", fontWeight: 600, textTransform: "uppercase" }}>
        {accent}
      </div>

      <p style={{ margin: 0, color: "#a3adb4", fontSize: 14, lineHeight: 1.45 }}>{body}</p>
    </article>
  );
}

function MilestoneCard({ title, description, items, example, unlocked }: MilestoneCardProps) {
  return (
    <article
      style={{
        borderRadius: 22,
        padding: 22,
        background: "linear-gradient(180deg, rgba(41, 47, 53, 0.98) 0%, rgba(33, 38, 44, 0.98) 100%)",
        border: `1px solid ${unlocked ? "rgba(32, 217, 133, 0.18)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: unlocked ? "0 14px 28px rgba(32, 217, 133, 0.14)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: unlocked ? "rgba(32, 217, 133, 0.12)" : "rgba(255,255,255,0.05)", color: unlocked ? "#20d985" : "#c7ced4", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
        {unlocked ? "Unlocked" : "Upcoming"}
      </div>
      <h3 style={{ margin: "14px 0 8px", color: "#f5f5f5", fontSize: 28, lineHeight: 0.98, letterSpacing: "-0.04em", textTransform: "uppercase" }}>{title}</h3>
      <p style={{ margin: 0, color: "#a3adb4", lineHeight: 1.5 }}>{description}</p>
      <ul style={{ margin: "14px 0 0", paddingLeft: 18, color: "#d0d7dc", lineHeight: 1.6 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p style={{ margin: "14px 0 0", color: "#20d985", fontSize: 13 }}>{example}</p>
    </article>
  );
}

const getRecoveryTone = (percentile: number | null): ComparisonTone => {
  if (percentile == null) return "neutral";
  return percentile >= 50 ? "green" : "red";
};

const getDeltaTone = (delta: number | null): ComparisonTone => {
  if (delta == null) return "neutral";
  return delta >= 0 ? "green" : "red";
};

const formatRecoveryAccent = (percentile: number | null): string => {
  if (percentile == null) return "SOON";
  return `${percentile}%`;
};

const formatRecoveryBody = (percentile: number | null): string => {
  if (percentile == null) {
    return "Your average recovery score will appear here after we have enough of your data.";
  }

  return `Your average recovery score is higher than ${percentile}% of users in the current dataset`;
};

const formatSleepAccent = (delta: number | null): string => {
  if (delta == null) return "SOON";
  if (delta === 0) return "SAME SLEEP";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta)} min`;
};

const formatSleepBody = (delta: number | null): string => {
  if (delta == null) {
    return "Your sleep comparison will appear here after we have enough of your data.";
  }

  if (delta === 0) {
    return "You sleep about the same amount as the current benchmark baseline";
  }

  return `You sleep ${Math.abs(delta)} minutes ${delta > 0 ? "longer" : "less"} than the current benchmark baseline`;
};

const formatHrvAccent = (delta: number | null): string => {
  if (delta == null) return "SOON";
  if (delta === 0) return "SAME HRV";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta)} ms`;
};

const formatHrvBody = (delta: number | null): string => {
  if (delta == null) {
    return "Your HRV comparison will appear here after we have enough of your data.";
  }

  if (delta === 0) {
    return "Your HRV baseline is about the same as the current benchmark baseline";
  }

  return `Your HRV baseline is ${Math.abs(delta)} ms ${delta > 0 ? "above" : "below"} the current benchmark baseline`;
};

export function UnlocksRoadmap({ totalUsers, earlyComparison }: UnlocksRoadmapProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const progressTarget = totalUsers < 100 ? 100 : 1000;
  const progressPercent = Math.min(100, (totalUsers / progressTarget) * 100);
  const progressLabel = totalUsers >= 1000 ? "1000+ users unlocked" : `${totalUsers} / ${progressTarget} users`;
  const hundredUnlocked = totalUsers >= 100;
  const thousandUnlocked = totalUsers >= 1000;

  const onShare = async () => {
    const url = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "WhereYouRank",
          text: "Compare your WHOOP data and unlock better insights as the dataset grows.",
          url,
        });
        setFeedback("Shared");
        return;
      }

      await navigator.clipboard.writeText(url);
      setFeedback("Share link copied");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setFeedback("Share link copied");
      } catch {
        setFeedback("Could not share");
      }
    } finally {
      window.setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <section style={sectionStyle}>
      <style>{`
        .roadmap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 14px;
          margin-top: 22px;
        }

        .roadmap-footer {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
      `}</style>
      <h2 style={{ margin: "0 0 8px", color: "#f5f5f5", fontSize: 34, lineHeight: 1, letterSpacing: "0.03em", textTransform: "uppercase", fontWeight: 700 }}>What unlocks as more users join</h2>
      <p style={{ margin: 0, color: "#a3adb4", fontSize: 14, maxWidth: 760 }}>
        The more people who join WhereYouRank, the more powerful the comparisons become
      </p>

      <div style={{ marginTop: 18 }}>
        <p style={{ margin: "0 0 8px", color: "#f5f5f5", fontWeight: 600 }}>{progressLabel}</p>
        <div style={{ width: "100%", height: 12, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #20d985 0%, #74f6b6 100%)", borderRadius: 999 }} />
        </div>
      </div>

      {totalUsers < 100 ? (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 22, color: "#f5f5f5", textTransform: "uppercase", letterSpacing: "-0.03em" }}>How you compare so far</h3>
          <div className="roadmap-grid" style={{ marginTop: 14 }}>
            <ComparisonCard
              title="Recovery rank"
              accent={formatRecoveryAccent(earlyComparison.recovery.percentile)}
              body={formatRecoveryBody(earlyComparison.recovery.percentile)}
              tone={getRecoveryTone(earlyComparison.recovery.percentile)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4 14.5 9l5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              }
            />
            <ComparisonCard
              title="Sleep comparison"
              accent={formatSleepAccent(earlyComparison.sleep.delta)}
              body={formatSleepBody(earlyComparison.sleep.delta)}
              tone={getDeltaTone(earlyComparison.sleep.delta)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M7 5.5h10a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M7 17v2M17 17v2M5 10h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              }
            />
            <ComparisonCard
              title="HRV comparison"
              accent={formatHrvAccent(earlyComparison.hrv.delta)}
              body={formatHrvBody(earlyComparison.hrv.delta)}
              tone={getDeltaTone(earlyComparison.hrv.delta)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12h4l2-4 4 8 2-4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </div>
      ) : null}

      <div className="roadmap-grid">
        <MilestoneCard
          title="At 100 users"
          description="You'll unlock real comparisons with people like you"
          items={["HRV percentile by age", "Sleep vs people like you", "Strain vs similar users", "Are you overtraining compared to others?"]}
          example={'Example: "Your HRV is higher than 72% of users aged 35-44"'}
          unlocked={hundredUnlocked}
        />
        <MilestoneCard
          title="At 1000 users"
          description="You'll unlock deeper insights powered by the full dataset"
          items={["Habits that improve recovery", "Sleep patterns of high-HRV users", "Training patterns of top performers", "AI insights based on similar users"]}
          example={'Example: "People like you recover faster when strain stays below 15"'}
          unlocked={thousandUnlocked}
        />
      </div>

      <div className="roadmap-footer">
        <div>
          <p style={{ margin: 0, color: "#a3adb4", fontSize: 13 }}>Share this project to unlock comparisons sooner</p>
          {feedback ? <p style={{ margin: "6px 0 0", color: "#20d985", fontSize: 13 }}>{feedback}</p> : null}
        </div>
        <button
          type="button"
          onClick={onShare}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#171717",
            color: "#f5f5f5",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Share
        </button>
      </div>
    </section>
  );
}
