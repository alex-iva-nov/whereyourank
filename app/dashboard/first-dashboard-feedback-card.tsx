"use client";

import { useEffect, useState } from "react";

import { MUTATION_HEADERS } from "@/lib/security/client-request";

type Sentiment = "loved_it" | "confusing" | "missing_something";

type FirstDashboardFeedbackCardProps = {
  promptSeenAt: string | null;
};

type ActionConfig = {
  label: string;
  heading: string;
  prompt: string;
  placeholder: string;
};

const ACTIONS: Record<Sentiment, ActionConfig> = {
  loved_it: {
    label: "Loved it",
    heading: "Thanks - that's great to hear.",
    prompt: "What stood out to you most?",
    placeholder: "Tell me what stood out most",
  },
  confusing: {
    label: "Confusing",
    heading: "Thanks - that's very helpful.",
    prompt: "What felt confusing or unclear?",
    placeholder: "Tell me what felt unclear or hard to use",
  },
  missing_something: {
    label: "Missing something",
    heading: "Thanks - I'd love to hear this.",
    prompt: "What did you expect to see but didn't find?",
    placeholder: "Tell me what you expected to see",
  },
};

export function FirstDashboardFeedbackCard({ promptSeenAt }: FirstDashboardFeedbackCardProps) {
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [seenAt, setSeenAt] = useState(promptSeenAt);

  useEffect(() => {
    if (seenAt) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/feedback/first-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...MUTATION_HEADERS },
          body: JSON.stringify({ action: "mark_seen" }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { promptSeenAt?: string | null }
          | null;

        if (!response.ok || cancelled) {
          return;
        }

        setSeenAt(payload?.promptSeenAt ?? new Date().toISOString());
      } catch {
        // Best-effort lifecycle tracking; the prompt should still stay usable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seenAt]);

  const onDismiss = async () => {
    setError(null);
    setDismissing(true);

    try {
      const response = await fetch("/api/feedback/first-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...MUTATION_HEADERS },
        body: JSON.stringify({ action: "dismiss" }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not dismiss feedback prompt");
      }

      setHidden(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not dismiss feedback prompt");
    } finally {
      setDismissing(false);
    }
  };

  const onSubmit = async () => {
    if (!selectedSentiment) {
      return;
    }

    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/feedback/first-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...MUTATION_HEADERS },
        body: JSON.stringify({
          action: "submit",
          sentiment: selectedSentiment,
          message,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not send feedback");
      }

      setSuccess(true);
      setSelectedSentiment(null);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setSending(false);
    }
  };

  if (hidden) {
    return null;
  }

  if (success) {
    return (
      <section style={{ background: "linear-gradient(180deg, #121212 0%, #090909 100%)", borderRadius: 28, border: "1px solid #232323", padding: 24, marginTop: 16, boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)" }}>
        <p style={{ margin: 0, color: "#79f28b", fontWeight: 600 }}>
          Thanks - this feedback goes straight to the founder and helps improve WhereYouRank
        </p>
      </section>
    );
  }

  const selectedAction = selectedSentiment ? ACTIONS[selectedSentiment] : null;

  return (
    <section style={{ background: "linear-gradient(180deg, #121212 0%, #090909 100%)", borderRadius: 28, border: "1px solid #232323", padding: 24, marginTop: 16, boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)" }}>
      <style>{`
        .first-impression-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .first-impression-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        @media (max-width: 640px) {
          .first-impression-header {
            flex-direction: column;
          }
        }
      `}</style>
      <div className="first-impression-header">
        <div>
          <h2 style={{ margin: 0, color: "#f5f5f5", textTransform: "uppercase", letterSpacing: "-0.04em" }}>How&apos;s your first impression?</h2>
          {!selectedAction ? (
            <p style={{ margin: "8px 0 0", color: "#7c7c7c" }}>
              A quick note helps shape the next version of WhereYouRank
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissing || sending}
          style={{ border: "none", background: "transparent", color: "#7c7c7c", cursor: dismissing || sending ? "default" : "pointer", padding: 0 }}
        >
          {dismissing ? "Hiding..." : "Dismiss"}
        </button>
      </div>

      {!selectedAction ? (
        <div className="first-impression-options">
          {(Object.entries(ACTIONS) as Array<[Sentiment, ActionConfig]>).map(([sentiment, config]) => (
            <button
              key={sentiment}
              type="button"
              onClick={() => {
                setSelectedSentiment(sentiment);
                setError(null);
              }}
              style={{ padding: "10px 8px", borderRadius: 999, border: "1px solid #242424", background: "#171717", color: "#f5f5f5", cursor: "pointer", fontWeight: 600, minWidth: 0, fontSize: 14 }}
            >
              {config.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: "#f5f5f5" }}>{selectedAction.heading}</h3>
            <p style={{ margin: "8px 0 0", color: "#b9b9b9" }}>{selectedAction.prompt}</p>
            <p style={{ margin: "6px 0 0", color: "#7c7c7c", fontSize: 13 }}>
              Your note goes directly to me, please help me to improve WhereYouRank and provide you more useful insights
            </p>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={selectedAction.placeholder}
            rows={4}
            maxLength={1500}
            style={{ width: "100%", resize: "vertical", borderRadius: 16, border: "1px solid #242424", padding: 12, font: "inherit", background: "#171717", color: "#f5f5f5" }}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={sending}
              style={{ padding: "10px 14px", borderRadius: 999, border: "none", background: "#f5f5f5", color: "#080808", fontWeight: 700, cursor: sending ? "default" : "pointer" }}
            >
              {sending ? "Sending..." : "Send feedback"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSentiment(null);
                setError(null);
              }}
              disabled={sending}
              style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid #242424", background: "#171717", color: "#f5f5f5", cursor: sending ? "default" : "pointer" }}
            >
              Choose another answer
            </button>
          </div>
        </div>
      )}

      {error ? <p style={{ margin: "12px 0 0", color: "#b00020" }}>{error}</p> : null}
    </section>
  );
}
