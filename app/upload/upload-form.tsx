"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  INFORMATIONAL_ONLY_CONSENT_TEXT,
  UPLOAD_PROCESSING_CONSENT_TEXT,
} from "@/lib/legal/constants";
import { REQUIRED_FILE_LABELS } from "@/lib/profile/demographics";

type FileResult = {
  filename: string;
  uploadId: string;
  ingestionRunId: string;
  fileKind: string | null;
  status: "completed" | "failed";
  telemetry: {
    rowsTotal: number;
    rowsParsed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsFailed: number;
    durationMs: number;
    errorRate: number;
  } | null;
  errors: Array<{ rowNumber: number | null; message: string; code: string }>;
};

type UploadResponse = {
  status: string;
  uploadedFiles: number;
  failedFiles: number;
  batchErrors: Array<{ filename: string; message: string }>;
  fileResults: FileResult[];
  analyticsRecompute?: { ok: boolean; details?: unknown; error?: string };
  summary?: {
    uploadReadiness?: {
      uploadedKinds?: string[];
      missingKinds?: string[];
      isCompleteBundle?: boolean;
    };
    availableMetrics?: string[];
    recommendedFiles?: string[];
    metricsReady?: boolean;
  };
};

type UploadFormProps = {
  initialConsentSatisfied: boolean;
};

export function UploadForm({ initialConsentSatisfied }: UploadFormProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [consentSatisfied, setConsentSatisfied] = useState(initialConsentSatisfied);
  const [whoopProcessingConsent, setWhoopProcessingConsent] = useState(false);
  const [informationalOnlyConsent, setInformationalOnlyConsent] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  const uploadedKinds = new Set(result?.summary?.uploadReadiness?.uploadedKinds ?? []);

  const onSubmitConsent = async () => {
    setError(null);

    if (!whoopProcessingConsent || !informationalOnlyConsent) {
      setError("You must accept both statements before uploading your data.");
      return;
    }

    setConsentLoading(true);

    try {
      const response = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whoopProcessingConsent, informationalOnlyConsent }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save consent");
      }

      setConsentSatisfied(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save consent");
    } finally {
      setConsentLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!consentSatisfied) {
      setError(
        "Before you can upload WHOOP data, you need to review and accept the Privacy Notice and Terms of Use, and confirm that you understand this service is not medical advice.",
      );
      return;
    }

    if (files.length === 0) {
      setError("Select at least one CSV file.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | (UploadResponse & { error?: string })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Upload failed");
      }

      setResult({
        status: payload?.status ?? "unknown",
        uploadedFiles: payload?.uploadedFiles ?? 0,
        failedFiles: payload?.failedFiles ?? 0,
        batchErrors: payload?.batchErrors ?? [],
        fileResults: payload?.fileResults ?? [],
        analyticsRecompute: payload?.analyticsRecompute,
        summary: payload?.summary,
      });

      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      {!consentSatisfied ? (
        <section style={{ border: "1px solid #e5c07b", background: "#fff8e1", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Consent required</h3>
          <p style={{ marginTop: 0, color: "#555" }}>
            Before you upload your WHOOP data, please review the terms below and confirm that you understand this service is for informational use only.
          </p>

          <h4 style={{ margin: "12px 0 6px" }}>Before you continue</h4>
          <p style={{ marginTop: 0, color: "#555" }}>Please accept both statements to continue.</p>

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <input type="checkbox" checked={whoopProcessingConsent} onChange={(event) => setWhoopProcessingConsent(event.target.checked)} />
            <span>{UPLOAD_PROCESSING_CONSENT_TEXT}</span>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
            <input type="checkbox" checked={informationalOnlyConsent} onChange={(event) => setInformationalOnlyConsent(event.target.checked)} />
            <span>{INFORMATIONAL_ONLY_CONSENT_TEXT}</span>
          </label>

          <p style={{ margin: "8px 0", color: "#555" }}>
            By continuing, you agree to the <a href="/privacy">Privacy Notice</a> and <a href="/terms">Terms of Use</a>.
          </p>

          <button type="button" onClick={onSubmitConsent} disabled={consentLoading || !whoopProcessingConsent || !informationalOnlyConsent} style={{ padding: 10 }}>
            {consentLoading ? "Saving..." : "Save and continue"}
          </button>
        </section>
      ) : null}

      <p style={{ margin: 0, color: "#666" }}>
        Your CSV files are processed and then deleted. We keep the derived metrics needed for your insights until you choose to delete your data.
      </p>

      <input
        type="file"
        multiple
        accept=".csv"
        disabled={!consentSatisfied || loading}
        onChange={(e) => {
          const nextFiles = Array.from(e.target.files ?? []);
          setFiles(nextFiles);
        }}
      />

      {files.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>{file.name}</li>
          ))}
        </ul>
      ) : null}

      {!consentSatisfied ? <p style={{ margin: 0, color: "#8a6d3b" }}>Please accept both statements before uploading your data.</p> : null}

      {error ? <p style={{ color: "#b00020", margin: 0 }}>{error}</p> : null}

      {result ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 10, display: "grid", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {result.failedFiles === 0 ? "Your upload was processed." : "Your upload finished with a few issues."}
            </p>
            <p style={{ margin: "6px 0 0", color: "#555" }}>
              {result.summary?.uploadReadiness?.isCompleteBundle ? "You have all required WHOOP files." : "You can upload more files any time to complete your set."}
            </p>
          </div>

          {result.batchErrors.length > 0 ? (
            <div>
              <strong>Files that need attention:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                {result.batchErrors.map((item) => (
                  <li key={`${item.filename}-${item.message}`}>
                    {item.filename}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <strong>File status</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {REQUIRED_FILE_LABELS.map((item) => {
                const isUploaded = uploadedKinds.has(item.kind);

                return (
                  <p key={item.kind} style={{ margin: 0, color: isUploaded ? "#1b5e20" : "#555", display: "flex", gap: 8 }}>
                    <span aria-hidden="true">{isUploaded ? "\u2713" : "\u25CB"}</span>
                    <span>{item.filename}{isUploaded ? " uploaded" : " missing"}</span>
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={loading || !consentSatisfied} style={{ padding: 10 }}>
          {loading ? "Uploading..." : "Upload files"}
        </button>
        <button type="button" disabled={refreshing || loading} onClick={refreshStatus} style={{ padding: 10 }}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </form>
  );
}
