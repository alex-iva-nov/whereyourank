import { NextResponse } from "next/server";

import { revalidateEarlyComparisonCohorts } from "@/lib/analytics/early-comparison";
import { recomputeUserDerivedAnalytics } from "@/lib/analytics/recompute";
import { revalidateUserEarlyInsights } from "@/lib/analytics/early-insights";
import { publicEnv } from "@/lib/env";
import { readCsv } from "@/lib/ingestion/csv/readCsv";
import { runIngestion } from "@/lib/ingestion/run";
import type { IngestionBatchResult, NormalizedUploadInput } from "@/lib/ingestion/types";
import {
  CONSENT_COPY_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { getRequiredConsentStatusForUser } from "@/lib/legal/consent";
import { trackProductEvent } from "@/lib/product-events-server";
import { getAvailableMetricKeysForUser, getUploadReadinessForUser } from "@/lib/product/readiness";
import { revalidateUserDataCount } from "@/lib/product/user-data-count";
import { ensureValidMutationRequest } from "@/lib/security/mutation-guard";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_UPLOAD_ROWS = 10;
const MAX_UPLOAD_FILES = 8;
const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "",
]);

const cleanupRawUploads = async (storagePaths: string[], userId: string) => {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.storage.from(publicEnv.storageBucketRaw).remove(storagePaths);

  if (!error) {
    return;
  }

  await supabaseAdmin.from("privacy_events").insert({
    user_id: userId,
    event_type: "raw_upload_cleanup_failed",
    event_payload: {
      storage_paths: storagePaths,
      error: error.message,
    },
  });
};

export async function POST(request: Request) {
  const invalidRequestResponse = ensureValidMutationRequest(request);
  if (invalidRequestResponse) {
    return invalidRequestResponse;
  }

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consentStatus = await getRequiredConsentStatusForUser(supabaseAdmin, user.id);
  if (!consentStatus.hasRequiredConsent) {
    return NextResponse.json(
      {
        error:
          "Before you can upload WHOOP data, you need to review and accept the Privacy Notice and Terms of Use, and confirm that you understand this service is not medical advice.",
        consentRequired: true,
        missingConsentTypes: consentStatus.missingConsentTypes,
        versions: {
          privacyNotice: PRIVACY_NOTICE_VERSION,
          terms: TERMS_VERSION,
          consentCopy: CONSENT_COPY_VERSION,
        },
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_UPLOAD_FILES) {
    return NextResponse.json(
      { error: `Please upload no more than ${MAX_UPLOAD_FILES} files at a time.` },
      { status: 400 },
    );
  }

  const preparedFiles: NormalizedUploadInput[] = [];
  const batchErrors: Array<{ filename: string; message: string }> = [];

  for (const file of files) {
    try {
      const lowercaseName = file.name.toLowerCase();
      if (!lowercaseName.endsWith(".csv")) {
        batchErrors.push({
          filename: file.name,
          message: "Only CSV files exported from WHOOP are supported.",
        });
        continue;
      }

      if (!ALLOWED_CSV_MIME_TYPES.has(file.type)) {
        batchErrors.push({
          filename: file.name,
          message: "This upload did not look like a CSV file.",
        });
        continue;
      }

      if (file.size > MAX_UPLOAD_FILE_BYTES) {
        batchErrors.push({
          filename: file.name,
          message: `This file is too large. Please keep each CSV under ${Math.round(MAX_UPLOAD_FILE_BYTES / (1024 * 1024))} MB.`,
        });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const csv = readCsv(bytes.toString("utf8"));

      if (csv.rows.length < MIN_UPLOAD_ROWS) {
        batchErrors.push({
          filename: file.name,
          message: `This file has only ${csv.rows.length} data rows. Please upload a WHOOP export with at least ${MIN_UPLOAD_ROWS} rows.`,
        });
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: storageError } = await supabaseUser.storage
        .from(publicEnv.storageBucketRaw)
        .upload(storagePath, file, {
          contentType: "text/csv",
          upsert: false,
        });

      if (storageError) {
        batchErrors.push({ filename: file.name, message: storageError.message });
        continue;
      }

      preparedFiles.push({
        userId: user.id,
        filename: file.name,
        mimeType: file.type,
        bytes,
        csv,
        storagePath,
      });
    } catch (error) {
      batchErrors.push({
        filename: file.name,
        message: error instanceof Error ? error.message : "Unexpected upload preparation error",
      });
    }
  }

  let ingestionResult: IngestionBatchResult = {
    status: "failed",
    uploadedFiles: 0,
    failedFiles: 0,
    fileResults: [],
  };

  try {
    if (preparedFiles.length > 0) {
      ingestionResult = await runIngestion(supabaseAdmin, user.id, preparedFiles);
    }

    let analyticsRecompute: { ok: boolean; details?: unknown; error?: string } = { ok: false };

    if (ingestionResult.uploadedFiles > 0) {
      try {
        const details = await recomputeUserDerivedAnalytics(user.id);
        analyticsRecompute = { ok: true, details };
      } catch (error) {
        analyticsRecompute = {
          ok: false,
          error: error instanceof Error ? error.message : "Derived analytics recompute failed",
        };
      }
    }

    revalidateUserDataCount();
    revalidateEarlyComparisonCohorts();
    revalidateUserEarlyInsights(user.id);

    const uploadReadiness = await getUploadReadinessForUser(supabaseAdmin, user.id);
    const availableMetrics = await getAvailableMetricKeysForUser(supabaseAdmin, user.id);

    const failedFiles = ingestionResult.failedFiles + batchErrors.length;
    const uploadedFiles = ingestionResult.uploadedFiles;
    const status =
      uploadedFiles === 0
        ? "failed"
        : failedFiles === 0
          ? "completed"
          : "partial";

    await trackProductEvent(user.id, "upload_completed", {
      status,
      uploaded_files: uploadedFiles,
      failed_files: failedFiles,
      metrics_ready: availableMetrics.length > 0,
      complete_bundle: uploadReadiness.isCompleteBundle,
    });

    return NextResponse.json({
      status,
      uploadedFiles,
      failedFiles,
      batchErrors,
      fileResults: ingestionResult.fileResults,
      analyticsRecompute,
      summary: {
        uploadReadiness,
        availableMetrics,
        recommendedFiles: uploadReadiness.missingKinds,
        metricsReady: availableMetrics.length > 0,
      },
    });
  } finally {
    await cleanupRawUploads(
      preparedFiles.map((file) => file.storagePath),
      user.id,
    );
  }
}
