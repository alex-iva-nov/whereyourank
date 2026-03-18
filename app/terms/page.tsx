import { TERMS_VERSION } from "@/lib/legal/constants";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 16, minHeight: "100vh" }}>
      <section style={{ background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)", borderRadius: 30, padding: 28, border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
      <h1 style={{ marginTop: 0, textTransform: "uppercase", letterSpacing: "-0.04em", fontSize: 44 }}>Terms of Use</h1>
      <p style={{ color: "#a3adb4", marginTop: 0 }}>Version {TERMS_VERSION}</p>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        These Terms of Use govern your access to and use of this service. By using the service, you agree to these terms.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>1. What the service does</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        This service helps users explore WHOOP-derived metrics through benchmarking, comparisons, and statistical insights.
        Features may change over time, especially during beta or early MVP stages.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>2. Informational use only</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        The service is provided for informational and statistical purposes only. It does not provide medical advice, diagnosis,
        treatment, or healthcare services. You should not rely on the service for medical or health decisions.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>3. Not a medical device</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        This service is not a medical device and is not intended to monitor, prevent, diagnose, or treat any disease or health
        condition.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>4. Your data and uploads</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        You may only upload data that you are authorized to use and share. You remain responsible for the accuracy of the
        information you provide and for your decision to upload WHOOP-related data.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>5. Account and access</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        You are responsible for maintaining the security of your account and access credentials. You must not misuse the
        service, interfere with its operation, or attempt to access data that does not belong to you.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>6. Product changes</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We may modify, improve, limit, or remove features at any time. During beta or MVP stages, parts of the service may
        change quickly and may contain errors, interruptions, or incomplete functionality.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>7. Benchmarking and analytics</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        The service may use uploaded and derived data to generate personal insights, cohort comparisons, and aggregated
        benchmarking outputs, subject to the Privacy Notice.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>8. No guarantee</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We try to make the service useful, but we do not guarantee that the service will always be available, error-free,
        accurate, or suitable for any specific purpose.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>9. Deletion and termination</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        You may stop using the service at any time and may request deletion of your data through the available product flows.
        We may suspend or terminate access if the service is misused or if continued access creates legal, security, or
        operational risk.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>10. Changes to these terms</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We may update these Terms of Use from time to time. Continued use of the service after an update may require
        acceptance of the new version where applicable.
      </p>

      <p style={{ marginBottom: 0, color: "#d0d7dc", lineHeight: 1.6 }}>
        If the app includes a separate Privacy Notice, that notice also applies to how data is processed.
      </p>
      </section>
    </main>
  );
}
