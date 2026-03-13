export const PRODUCT_EVENT_NAMES = [
  "sign_in_completed",
  "sign_up_completed",
  "onboarding_completed",
  "upload_page_viewed",
  "upload_submitted",
  "upload_completed",
  "dashboard_viewed",
  "first_dashboard_feedback_submitted",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const isProductEventName = (value: string): value is ProductEventName =>
  PRODUCT_EVENT_NAMES.includes(value as ProductEventName);

export const postProductEvent = async (
  eventName: ProductEventName,
  eventPayload: Record<string, unknown> = {},
) => {
  const response = await fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, eventPayload }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to track product event ${eventName}`);
  }
};
