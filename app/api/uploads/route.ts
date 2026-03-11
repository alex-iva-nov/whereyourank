import { NextResponse } from "next/server";

import { recomputeAnalyticsForUser } from "@/lib/analytics/recompute";
import { readCsv } from "@/lib/ingestion/csv/readCsv";
import { runIngestion } from "@/lib/ingestion/run";
import type { IngestionBatchResult, NormalizedUploadInput } from "@/lib/ingestion/types";
import { publicEnv } from "@/lib/env";
import { getRequiredConsentStatusForUser } from "@/lib/legal/consent";
import {
  CONSENT_COPY_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { getAvailableMetricKeysForUser, getUploadReadinessForUser } from "@/lib/product/readiness";
import { revalidateUserDataCount } from "@/lib/product/user-data-count";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const MIN_UPLOAD_ROWS = 10;

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

  const preparedFiles: NormalizedUploadInput[] = [];
  const batchErrors: Array<{ filename: string; message: string }> = [];

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const text = bytes.toString("utf8");
      const csv = readCsv(text);

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
        text,
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
        const details = await recomputeAnalyticsForUser(user.id);
        analyticsRecompute = { ok: true, details };
      } catch (error) {
        analyticsRecompute = {
          ok: false,
          error: error instanceof Error ? error.message : "Analytics recompute failed",
        };
      }
    }

    revalidateUserDataCount();

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