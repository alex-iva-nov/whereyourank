"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { postProductEvent } from "@/lib/product-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function SignInForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace("/dashboard");
      }
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        await postProductEvent("sign_in_completed", { method: "password" }).catch(() => undefined);
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        await postProductEvent("sign_up_completed", {
          method: "password",
          email_confirmation_required: false,
        }).catch(() => undefined);
        router.replace("/onboarding");
        router.refresh();
      } else {
        setMessage("Account created. If email confirmation is enabled, please confirm your email to continue.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign you in";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 18 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#c7ced4", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 14, borderRadius: 16, border: "1px solid #2d353c", background: "#171d22", color: "#f5f5f5" }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#c7ced4", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>Password</span>
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 14, borderRadius: 16, border: "1px solid #2d353c", background: "#171d22", color: "#f5f5f5" }}
        />
      </label>

      {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: "#20d985", margin: 0 }}>{message}</p> : null}

      <button type="submit" disabled={loading} style={{ padding: 14, borderRadius: 999, border: "none", background: "#f5f5f5", color: "#080808", fontWeight: 700 }}>
        {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} style={{ padding: 14, borderRadius: 999, border: "1px solid #2d353c", background: "#171d22", color: "#f5f5f5", fontWeight: 600 }}>
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
