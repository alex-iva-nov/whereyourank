import type { Metadata } from "next";
import Link from "next/link";

import { BrandWordmark } from "@/components/brand-wordmark";
import { requireOnboardingComplete } from "@/lib/auth/server";
import { getRequiredConsentStatusForUser } from "@/lib/legal/consent";
import { getUploadReadinessForUser } from "@/lib/product/readiness";
import { REQUIRED_FILE_LABELS } from "@/lib/profile/demographics";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { UploadForm } from "./upload-form";
import { UploadPageViewTracker } from "./upload-page-view-tracker";

export const metadata: Metadata = {
  title: "Upload WHOOP Files",
};

export default async function UploadPage() {
  const { user } = await requireOnboardingComplete();
  const supabase = await createSupabaseServerClient();

  const [readiness, consentStatus] = await Promise.all([
    getUploadReadinessForUser(supabase, user.id),
    getRequiredConsentStatusForUser(supabase, user.id),
  ]);

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16 }}>
      <UploadPageViewTracker />
      <header style={{ marginBottom: 20 }}>
        <BrandWordmark subtitle="Upload your WHOOP export to unlock your first results." />
        <h1 style={{ marginBottom: 8 }}>Upload WHOOP files</h1>
        <p style={{ margin: "8px 0 0", color: "#555" }}>
          By continuing, you agree to the <Link href="/privacy">Privacy Notice</Link> and <Link href="/terms">Terms of Use</Link>.
        </p>
      </header>

      <section style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Files needed for a complete upload</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {REQUIRED_FILE_LABELS.map((item) => {
            const isUploaded = readiness.uploadedKinds.includes(item.kind);

            return (
              <p key={item.kind} style={{ margin: 0, color: isUploaded ? "#1b5e20" : "#555", display: "flex", gap: 8 }}>
                <span aria-hidden="true">{isUploaded ? "\u2713" : "\u25CB"}</span>
                <span>{item.filename}{isUploaded ? " uploaded" : " missing"}</span>
              </p>
            );
          })}
        </div>
        {readiness.isCompleteBundle ? (
          <div style={{ marginTop: 12 }}>
            <Link href="/dashboard" style={{ display: "inline-block", padding: "10px 14px", borderRadius: 6, background: "#111", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
              View dashboard
            </Link>
          </div>
        ) : null}
      </section>

      <section style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <UploadForm initialConsentSatisfied={consentStatus.hasRequiredConsent} />
      </section>
    </main>
  );
}
