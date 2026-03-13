import { NextResponse } from "next/server";

import { isProductEventName } from "@/lib/product-events";
import { trackProductEvent } from "@/lib/product-events-server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { eventName?: string; eventPayload?: Record<string, unknown> | null }
    | null;

  if (!payload?.eventName || !isProductEventName(payload.eventName)) {
    return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
  }

  await trackProductEvent(user.id, payload.eventName, payload.eventPayload ?? {});

  return NextResponse.json({ ok: true });
}
