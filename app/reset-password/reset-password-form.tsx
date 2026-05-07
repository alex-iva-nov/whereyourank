"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { clearPasswordResetRequest, hasRecentPasswordResetRequest } from "@/lib/auth/password-reset";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const getRecoveryLinkState = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "");
  const errorDescription = searchParams.get("error_description") ?? hashParams.get("error_description");

  return {
    hasRecoveryToken: searchParams.has("code") || hashParams.get("type") === "recovery",
    errorDescription,
  };
};

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const { hasRecoveryToken, errorDescription } = getRecoveryLinkState();
    const hasResetRequest = hasRecentPasswordResetRequest();

    if (errorDescription) {
      setError(errorDescription);
      setCheckingSession(false);
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
      } else if ((!hasRecoveryToken && !hasResetRequest) || !data.session) {
        setError("This reset link is invalid or expired. Request a new link from the sign-in page.");
      } else {
        setCanResetPassword(true);
      }

      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canResetPassword) {
      setError("This reset link is invalid or expired. Request a new link from the sign-in page.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      clearPasswordResetRequest();
      setMessage("Password updated. Redirecting to your dashboard...");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update your password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#c7ced4", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>New password</span>
        <input
          required
          minLength={8}
          type="password"
          value={password}
          disabled={checkingSession || !canResetPassword || loading}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 14, borderRadius: 16, border: "1px solid #2d353c", background: "#171d22", color: "#f5f5f5" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#c7ced4", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Confirm password</span>
        <input
          required
          minLength={8}
          type="password"
          value={confirmPassword}
          disabled={checkingSession || !canResetPassword || loading}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ padding: 14, borderRadius: 16, border: "1px solid #2d353c", background: "#171d22", color: "#f5f5f5" }}
        />
      </label>

      {checkingSession ? <p style={{ color: "#a3adb4", margin: 0 }}>Checking reset link...</p> : null}
      {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: "#20d985", margin: 0 }}>{message}</p> : null}

      <button type="submit" disabled={checkingSession || !canResetPassword || loading} style={{ padding: 14, borderRadius: 999, border: "none", background: "#f5f5f5", color: "#080808", fontWeight: 700 }}>
        {loading ? "Please wait..." : "Update password"}
      </button>
    </form>
  );
}
