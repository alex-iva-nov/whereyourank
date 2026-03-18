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
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 16, minHeight: "100vh" }}>
      <UploadPageViewTracker />
      <header
        style={{
          marginBottom: 18,
          background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)",
          borderRadius: 30,
          padding: 28,
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <BrandWordmark subtitle="Upload your WHOOP export to unlock your first results" />
        <p style={{ margin: "22px 0 8px", color: "#aeb5bb", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700 }}>Data intake</p>
        <h1 style={{ margin: "0 0 8px", fontSize: 58, lineHeight: 0.94, letterSpacing: "-0.06em", textTransform: "uppercase" }}>Upload WHOOP files</h1>
        <p style={{ margin: 0, color: "#20d985" }}>Bring in your exports to unlock the first full dashboard pass</p>
        <p style={{ margin: "10px 0 0", color: "#a3adb4" }}>
          By continuing, you agree to the <Link href="/privacy">Privacy Notice</Link> and <Link href="/terms">Terms of Use</Link>
        </p>
      </header>

      <section style={{ background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)", padding: 24, borderRadius: 30, marginBottom: 18, border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <h2 style={{ marginTop: 0, textTransform: "uppercase", letterSpacing: "-0.03em" }}>Files needed for a complete upload</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {REQUIRED_FILE_LABELS.map((item) => {
            const isUploaded = readiness.uploadedKinds.includes(item.kind);

            return (
              <p key={item.kind} style={{ margin: 0, color: isUploaded ? "#20d985" : "#a3adb4", display: "flex", gap: 8 }}>
                <span aria-hidden="true">{isUploaded ? "\u2713" : "\u25CB"}</span>
                <span>{item.filename}{isUploaded ? " uploaded" : " missing"}</span>
              </p>
            );
          })}
        </div>
        {readiness.isCompleteBundle ? (
          <div style={{ marginTop: 12 }}>
            <Link href="/dashboard" style={{ display: "inline-block", padding: "10px 14px", borderRadius: 999, background: "#f5f5f5", color: "#080808", textDecoration: "none", fontWeight: 700 }}>
              View dashboard
            </Link>
          </div>
        ) : null}
      </section>

      <section style={{ background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)", padding: 24, borderRadius: 30, marginBottom: 18, border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <UploadForm initialConsentSatisfied={consentStatus.hasRequiredConsent} />
      </section>
    </main>
  );
}
