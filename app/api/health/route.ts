import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      supabaseUrlConfigured: Boolean(getServerEnv().supabaseUrl),
      supabaseClientKeyConfigured: Boolean(getServerEnv().supabaseClientKey),
      supabaseServiceRoleConfigured: Boolean(getServerEnv().supabaseServiceRoleKey),
      storageBucketRaw: getServerEnv().storageBucketRaw,
    },
    { status: 200 },
  );
}

