"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AGE_BUCKET_OPTIONS, COUNTRY_OPTIONS, SEX_OPTIONS, findCountryOption } from "@/lib/profile/demographics";

export function OnboardingForm() {
  const router = useRouter();
  const [ageBucket, setAgeBucket] = useState("25_29");
  const [sex, setSex] = useState("prefer_not_to_say");
  const [countryInput, setCountryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const selectedCountry = findCountryOption(countryInput);

      if (!selectedCountry) {
        throw new Error("Please choose a country from the list.");
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageBucket, sex, country: selectedCountry.code }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save your profile");
      }

      router.push("/upload");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Age range</span>
        <select value={ageBucket} onChange={(e) => setAgeBucket(e.target.value)} style={{ padding: 10 }}>
          {AGE_BUCKET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Sex</span>
        <select value={sex} onChange={(e) => setSex(e.target.value)} style={{ padding: 10 }}>
          {SEX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Country</span>
        <input required list="country-options" placeholder="Start typing your country" value={countryInput} onChange={(e) => setCountryInput(e.target.value)} style={{ padding: 10 }} />
        <datalist id="country-options">
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.name} />
          ))}
        </datalist>
        <p style={{ margin: 0, color: "#666", fontSize: 13 }}>Use your country of residence.</p>
      </label>

      {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}

      <button type="submit" disabled={loading} style={{ padding: 10 }}>
        {loading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}