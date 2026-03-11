"use client";

import { useState } from "react";

export function DeleteDataForm() {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = loading || confirm !== "DELETE";

  const onDelete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (confirm !== "DELETE") {
      setError("Type DELETE to confirm.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/delete-my-data", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Delete-my-data failed");
      }

      setSuccess(true);
      setShowConfirm(false);
      setConfirm("");
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete-my-data failed");
    } finally {
      setLoading(false);
    }
  };

  if (!showConfirm && !success) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" onClick={() => setShowConfirm(true)} style={{ padding: 8, width: "fit-content" }}>
          Delete my data
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Your data has been deleted</h3>
        <p style={{ margin: 0, color: "#155724" }}>
          Your account-linked data has been removed from the product&apos;s active systems.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onDelete} style={{ display: "grid", gap: 8 }}>
      <h3 style={{ margin: 0 }}>Delete your data?</h3>
      <p style={{ margin: 0, color: "#555" }}>
        This will permanently remove your account-linked WHOOP data and related records from the product&apos;s active
        systems, except for any information that has already been irreversibly anonymized in aggregate statistics or must be
        retained for limited legal or security reasons.
      </p>
      <p style={{ margin: 0, color: "#8a6d3b", fontWeight: 600 }}>This action cannot be undone.</p>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Type DELETE"
        style={{ padding: 8 }}
      />
      {error ? <p style={{ margin: 0, color: "#b00020" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={disabled} style={{ padding: 8 }}>
          {loading ? "Deleting..." : "Yes, delete my data"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowConfirm(false);
            setError(null);
            setConfirm("");
          }}
          disabled={loading}
          style={{ padding: 8 }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
