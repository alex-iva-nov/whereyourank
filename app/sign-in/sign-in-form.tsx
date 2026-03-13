"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { postProductEvent } from "@/lib/product-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function SignInForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        router.push("/");
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
        router.push("/");
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
        <span>Email</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: 10 }} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Password</span>
        <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: 10 }} />
      </label>

      {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}
      {message ? <p style={{ color: "#0a7", margin: 0 }}>{message}</p> : null}

      <button type="submit" disabled={loading} style={{ padding: 10 }}>
        {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>

      <button type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} style={{ padding: 10 }}>
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
