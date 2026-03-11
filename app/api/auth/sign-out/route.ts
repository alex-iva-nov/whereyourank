import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  const redirectUrl = new URL("/sign-in", request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  const supabase = createSupabaseRouteHandlerClient(request, response);

  await supabase.auth.signOut();

  return response;
}
