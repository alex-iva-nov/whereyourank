import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

test("allows same-origin mutation requests", async () => {
  const { isAllowedMutationOrigin } = await import("./request-origin.ts");

  const request = new Request("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  });

  assert.equal(isAllowedMutationOrigin(request), true);
});

test("falls back to referer origin when origin header is absent", async () => {
  const { isAllowedMutationOrigin } = await import("./request-origin.ts");

  const request = new Request("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: { referer: "http://localhost:3000/dashboard" },
  });

  assert.equal(isAllowedMutationOrigin(request), true);
});

test("rejects cross-site mutation requests", async () => {
  const { isAllowedMutationOrigin } = await import("./request-origin.ts");

  const request = new Request("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });

  assert.equal(isAllowedMutationOrigin(request), false);
});
