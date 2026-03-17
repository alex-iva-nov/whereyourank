import { NextResponse } from "next/server";

import { trackProductEvent } from "@/lib/product-events-server";
import { ACCEPTED_AGE_BUCKET_VALUES, SEX_OPTIONS } from "@/lib/profile/demographics";
import { ensureValidMutationRequest } from "@/lib/security/mutation-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const AGE_BUCKETS = new Set<string>(ACCEPTED_AGE_BUCKET_VALUES);
const SEX_VALUES = new Set<string>(SEX_OPTIONS.map((option) => option.value));

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
    | { ageBucket?: string; sex?: string; country?: string }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ageBucket = payload.ageBucket ?? "";
  const sex = payload.sex ?? "";
  const country = (payload.country ?? "").trim().toUpperCase();

  if (!AGE_BUCKETS.has(ageBucket)) {
    return NextResponse.json({ error: "Please choose a valid age range." }, { status: 400 });
  }

  if (!SEX_VALUES.has(sex)) {
    return NextResponse.json({ error: "Please choose a valid sex option." }, { status: 400 });
  }

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: "Please choose a valid country." }, { status: 400 });
  }

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      age_bucket: ageBucket,
      sex,
      country,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await trackProductEvent(user.id, "onboarding_completed", {
    age_bucket: ageBucket,
    sex,
    country,
  });

  return NextResponse.json({ ok: true });
}
