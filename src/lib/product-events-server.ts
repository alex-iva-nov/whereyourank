import { supabaseAdmin } from "@/lib/supabase/admin-client";

import type { ProductEventName } from "@/lib/product-events";

export const trackProductEvent = async (
  userId: string,
  eventName: ProductEventName,
  eventPayload: Record<string, unknown> = {},
) => {
  const { error } = await supabaseAdmin.from("product_events").insert({
    user_id: userId,
    event_name: eventName,
    event_payload: eventPayload,
  });

  if (error) {
    console.error(`Failed to track product event ${eventName} for user ${userId}: ${error.message}`);
  }
};
