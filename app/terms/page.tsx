import { TERMS_VERSION } from "@/lib/legal/constants";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16, background: "#fff", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>Terms of Use</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Version {TERMS_VERSION}</p>
      <p>
        These Terms of Use govern your access to and use of this service. By using the service, you agree to these terms.
      </p>

      <h2>1. What the service does</h2>
      <p>
        This service helps users explore WHOOP-derived metrics through benchmarking, comparisons, and statistical insights.
        Features may change over time, especially during beta or early MVP stages.
      </p>

      <h2>2. Informational use only</h2>
      <p>
        The service is provided for informational and statistical purposes only. It does not provide medical advice, diagnosis,
        treatment, or healthcare services. You should not rely on the service for medical or health decisions.
      </p>

      <h2>3. Not a medical device</h2>
      <p>
        This service is not a medical device and is not intended to monitor, prevent, diagnose, or treat any disease or health
        condition.
      </p>

      <h2>4. Your data and uploads</h2>
      <p>
        You may only upload data that you are authorized to use and share. You remain responsible for the accuracy of the
        information you provide and for your decision to upload WHOOP-related data.
      </p>

      <h2>5. Account and access</h2>
      <p>
        You are responsible for maintaining the security of your account and access credentials. You must not misuse the
        service, interfere with its operation, or attempt to access data that does not belong to you.
      </p>

      <h2>6. Product changes</h2>
      <p>
        We may modify, improve, limit, or remove features at any time. During beta or MVP stages, parts of the service may
        change quickly and may contain errors, interruptions, or incomplete functionality.
      </p>

      <h2>7. Benchmarking and analytics</h2>
      <p>
        The service may use uploaded and derived data to generate personal insights, cohort comparisons, and aggregated
        benchmarking outputs, subject to the Privacy Notice.
      </p>

      <h2>8. No guarantee</h2>
      <p>
        We try to make the service useful, but we do not guarantee that the service will always be available, error-free,
        accurate, or suitable for any specific purpose.
      </p>

      <h2>9. Deletion and termination</h2>
      <p>
        You may stop using the service at any time and may request deletion of your data through the available product flows.
        We may suspend or terminate access if the service is misused or if continued access creates legal, security, or
        operational risk.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these Terms of Use from time to time. Continued use of the service after an update may require
        acceptance of the new version where applicable.
      </p>

      <p style={{ marginBottom: 0 }}>
        If the app includes a separate Privacy Notice, that notice also applies to how data is processed.
      </p>
    </main>
  );
}
