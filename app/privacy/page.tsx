import {
  PRIVACY_NOTICE_COMMERCIALIZATION_SUMMARY,
  PRIVACY_NOTICE_VERSION,
} from "@/lib/legal/constants";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: 16, minHeight: "100vh" }}>
      <section style={{ background: "linear-gradient(180deg, #20262c 0%, #11151a 100%)", borderRadius: 30, padding: 28, border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
      <h1 style={{ marginTop: 0, textTransform: "uppercase", letterSpacing: "-0.04em", fontSize: 44 }}>Privacy Notice</h1>
      <p style={{ color: "#a3adb4", marginTop: 0 }}>
        Version {PRIVACY_NOTICE_VERSION}
      </p>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We built this service to help you understand your WHOOP data through personal benchmarking and cohort comparisons.
        This notice explains what data we collect, how we use it, and what choices you have.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>What we collect</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>When you use this service, we may collect:</p>
      <ul>
        <li>account information such as your email address for login and access</li>
        <li>profile information such as birth year, sex, and country</li>
        <li>WHOOP-derived data and metrics that you upload or authorize us to process</li>
        <li>technical and product usage information needed to operate, secure, and improve the service</li>
      </ul>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>What we do not ask for</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We do not ask for your full name, home address, phone number, exact date of birth, or medical diagnosis
        information.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>How we use your data</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>We use your data to:</p>
      <ul>
        <li>create your personal benchmarking experience</li>
        <li>compare your metrics against relevant cohorts</li>
        <li>improve our benchmark models, analytics, and product experience</li>
        <li>maintain, secure, debug, and operate the service</li>
        <li>respond to deletion requests and other privacy-related actions</li>
      </ul>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>How uploaded files are handled</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        If you upload WHOOP export files, the uploaded files are used for processing and ingestion. We aim to delete the raw
        uploaded files after processing. We keep the derived metrics and related records needed to provide the product
        experience unless you delete your data or your account.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Aggregated and anonymized analytics</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We may use data from the service to generate aggregated and anonymized statistics, benchmarks, and market-level
        insights. These outputs are designed to avoid identifying individual users. We do not sell raw personal data or
        user-level health data.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Commercial use of aggregated insights</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We may use or share aggregated and anonymized insights commercially, including in benchmarking, analytics, or
        research-style summaries, as long as those outputs are not reasonably designed to identify you or any other individual
        user.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Data retention and deletion</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        You can request deletion of your data or use available in-product deletion tools where offered. When your deletion
        request is processed, we aim to remove user-linked data from active systems, except where limited retention is required
        for security, fraud prevention, legal compliance, or irreversibly anonymized aggregate statistics.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Your choices</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        You can choose whether to upload your WHOOP data. If you do not consent to the processing described here, you should
        not upload your data to the service.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Medical disclaimer</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        This service provides informational and statistical insights only. It is not medical advice, not a medical device, and
        should not be used for diagnosis, treatment, or healthcare decision-making.
      </p>

      <h2 style={{ textTransform: "uppercase", letterSpacing: "-0.03em" }}>Changes to this notice</h2>
      <p style={{ color: "#d0d7dc", lineHeight: 1.6 }}>
        We may update this Privacy Notice from time to time. If we make material changes, we may ask you to review the
        updated version or provide consent again where appropriate.
      </p>

      <p style={{ marginBottom: 0, color: "#d0d7dc", lineHeight: 1.6 }}>
        If you have a privacy request related to your account or data, please use the available in-product tools or the
        support contact provided in the app.
      </p>
      </section>
    </main>
  );
}
