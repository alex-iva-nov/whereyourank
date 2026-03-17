import { NextResponse } from "next/server";

import {
  buildConsentRecords,
  buildLegacyConsentRecords,
  getRequiredConsentStatusForUser,
  isConsentEventsSchemaMismatchError,
} from "@/lib/legal/consent";
import {
  CONSENT_COPY_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/constants";
import { ensureValidMutationRequest } from "@/lib/security/mutation-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getRequiredConsentStatusForUser(supabase, user.id);

  return NextResponse.json({
    ...status,
    versions: {
      privacyNotice: PRIVACY_NOTICE_VERSION,
      terms: TERMS_VERSION,
      consentCopy: CONSENT_COPY_VERSION,
    },
  });
}

export async function POST(request: Request) {
  const invalidRequestResponse = ensureValidMutationRequest(request);
  if (invalidRequestResponse) {
    return invalidRequestResponse;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { whoopProcessingConsent?: boolean; informationalOnlyConsent?: boolean }
    | null;

  if (!payload?.whoopProcessingConsent || !payload?.informationalOnlyConsent) {
    return NextResponse.json(
      { error: "Both required consent checkboxes must be accepted." },
      { status: 400 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const modernRecords = buildConsentRecords(user.id, acceptedAt);

  const modernInsert = await supabase.from("consent_events").insert(modernRecords);

  if (modernInsert.error) {
    if (!isConsentEventsSchemaMismatchError(modernInsert.error.message)) {
      return NextResponse.json({ error: `Failed to save consent: ${modernInsert.error.message}` }, { status: 500 });
    }

    const legacyInsert = await supabase
      .from("consent_events")
      .insert(buildLegacyConsentRecords(user.id));

    if (legacyInsert.error) {
      return NextResponse.json({ error: `Failed to save consent: ${legacyInsert.error.message}` }, { status: 500 });
    }
  }

  await supabase.from("privacy_events").insert({
    user_id: user.id,
    event_type: "consent_submitted",
    event_payload: {
      accepted_at: acceptedAt,
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
      terms_version: TERMS_VERSION,
      consent_copy_version: CONSENT_COPY_VERSION,
    },
  });

  return NextResponse.json({ ok: true, acceptedAt });
}
