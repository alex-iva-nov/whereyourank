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

type MilestoneCardProps = {
  title: string;
  description: string;
  items: string[];
  example: string;
  unlocked: boolean;
};

type ComparisonTone = "green" | "red" | "neutral";

type ComparisonCardProps = {
  title: string;
  body: string;
  tone: ComparisonTone;
};

const checkIcon = (
  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 999, background: "#daf2df", color: "#1b5e20", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 5.2L4.1 7.3L8 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const toneColors: Record<ComparisonTone, { dot: string; ring: string }> = {
  green: { dot: "#2e7d32", ring: "#d8ecd9" },
  red: { dot: "#c0392b", ring: "#f4d2cc" },
  neutral: { dot: "#8a8a8a", ring: "#e6e6e6" },
};

function MilestoneCard({ title, description, items, example, unlocked }: MilestoneCardProps) {
  return (
    <article style={{ background: "#fff", borderRadius: 8, border: `1px solid ${unlocked ? "#bfe3c6" : "#d7eadb"}`, boxShadow: unlocked ? "none" : "inset 4px 0 0 #7bc48a", padding: 14 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "4px 8px", borderRadius: 999, background: unlocked ? "#e6f4ea" : "#eff8f1", color: unlocked ? "#1b5e20" : "#2d6a4f", fontSize: 12, fontWeight: 700 }}>
        {unlocked ? "Unlocked" : "Upcoming"}
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 20, color: "#183a1f" }}>{title}</h3>
      <p style={{ margin: "0 0 10px", color: "#444" }}>{description}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {items.map((item) => (
          <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#333" }}>
            {checkIcon}
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", color: "#666", fontSize: 13 }}>{example}</p>
    </article>
  );
}

function ComparisonCard({ title, body, tone }: ComparisonCardProps) {
  const colors = toneColors[tone];

  return (
    <article style={{ background: "#fff", borderRadius: 8, border: "1px solid #ddd", padding: 16, minHeight: 140 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        <span
          aria-hidden="true"
          style={{ width: 14, height: 14, borderRadius: 999, background: colors.dot, boxShadow: `0 0 0 4px ${colors.ring}`, flexShrink: 0 }}
        />
      </div>
      <p style={{ margin: "12px 0 0", color: "#333" }}>{body}</p>
    </article>
  );
}

const getRecoveryTone = (percentile: number | null): ComparisonTone => {
  if (percentile == null) return "neutral";
  return percentile >= 50 ? "green" : "red";
};

const getSleepTone = (delta: number | null): ComparisonTone => {
  if (delta == null) return "neutral";
  return delta >= 0 ? "green" : "red";
};

const getHrvTone = (delta: number | null): ComparisonTone => {
  if (delta == null) return "neutral";
  return delta >= 0 ? "green" : "red";
};

const formatSleepDelta = (delta: number | null): string => {
  if (delta == null) {
    return "Your sleep comparison will appear here after we have enough of your data.";
  }

  if (delta === 0) {
    return "You sleep about the same amount as the current dataset average.";
  }

  const direction = delta > 0 ? "longer" : "less";
  return `You sleep ${Math.abs(delta)} minutes ${direction} than the current dataset average.`;
};

const formatHrvDelta = (delta: number | null): string => {
  if (delta == null) {
    return "Your HRV comparison will appear here after we have enough of your data.";
  }

  if (delta === 0) {
    return "Your HRV baseline is about the same as the dataset average.";
  }

  const direction = delta > 0 ? "above" : "below";
  return `Your HRV baseline is ${Math.abs(delta)} ms ${direction} the dataset average.`;
};

const formatRecoveryComparison = (percentile: number | null): string => {
  if (percentile == null) {
    return "Your average recovery score will appear here after we have enough of your data.";
  }

  return `Your average recovery score is higher than ${percentile}% of users in the current dataset.`;
};

function EarlyComparisonSection({ earlyComparison }: { earlyComparison: EarlyComparisonSectionData }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 22, color: "#183a1f" }}>How you compare so far</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <ComparisonCard
          title="Recovery rank"
          body={formatRecoveryComparison(earlyComparison.recovery.percentile)}
          tone={getRecoveryTone(earlyComparison.recovery.percentile)}
        />
        <ComparisonCard
          title="Sleep comparison"
          body={formatSleepDelta(earlyComparison.sleep.delta)}
          tone={getSleepTone(earlyComparison.sleep.delta)}
        />
        <ComparisonCard
          title="HRV comparison"
          body={formatHrvDelta(earlyComparison.hrv.delta)}
          tone={getHrvTone(earlyComparison.hrv.delta)}
        />
      </div>
    </div>
  );
}

export function UnlocksRoadmap({ totalUsers, earlyComparison }: UnlocksRoadmapProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const progressTarget = totalUsers < 100 ? 100 : 1000;
  const progressPercent = Math.min(100, (totalUsers / progressTarget) * 100);
  const progressLabel = totalUsers >= 1000 ? "1000+ users unlocked" : `${totalUsers} / ${progressTarget} users`;
  const hundredUnlocked = totalUsers >= 100;
  const thousandUnlocked = totalUsers >= 1000;

  const onShare = async () => {
    const url = window.location.origin;
    const sharePayload = {
      title: "WhereYouRank",
      text: "Compare your WHOOP data and unlock better insights as the dataset grows.",
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
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
    <section style={{ background: "#fafafa", borderRadius: 8, border: "1px solid #e8e8e8", padding: 16, marginTop: 12 }}>
      <h2 style={{ marginTop: 0 }}>What unlocks as more users join</h2>
      <p style={{ margin: "0 0 14px", color: "#555" }}>
        The more people who join WhereYouRank, the more powerful the comparisons become.
      </p>

      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", color: "#444", fontWeight: 600 }}>{progressLabel}</p>
        <div style={{ width: "100%", height: 10, background: "#e9e9e9", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: totalUsers >= 1000 ? "#1b5e20" : "#2d6a4f", borderRadius: 999 }} />
        </div>
      </div>

      {totalUsers < 100 ? <EarlyComparisonSection earlyComparison={earlyComparison} /> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <MilestoneCard
          title="At 100 users"
          description="You'll unlock real comparisons with people like you."
          items={[
            "HRV percentile by age",
            "Sleep vs people like you",
            "Strain vs similar users",
            "Are you overtraining compared to others?",
          ]}
          example='Example: "Your HRV is higher than 72% of users aged 35-44."'
          unlocked={hundredUnlocked}
        />
        <MilestoneCard
          title="At 1000 users"
          description="You'll unlock deeper insights powered by the full dataset."
          items={[
            "Habits that improve recovery",
            "Sleep patterns of high-HRV users",
            "Training patterns of top performers",
            "AI insights based on similar users",
          ]}
          example='Example: "People like you recover faster when strain stays below 15."'
          unlocked={thousandUnlocked}
        />
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#555" }}>Share this project to unlock comparisons sooner.</p>
          {feedback ? <p style={{ margin: "6px 0 0", color: "#2d6a4f", fontSize: 13 }}>{feedback}</p> : null}
        </div>
        <button type="button" onClick={onShare} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #b8dcbc", background: "#edf8ef", color: "#1b5e20", fontWeight: 700, cursor: "pointer" }}>
          Share
        </button>
      </div>
    </section>
  );
}
