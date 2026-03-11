import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRequiredConsentRows } from "./consent.ts";

test("returns missing consent types when required rows are absent", () => {
  const result = evaluateRequiredConsentRows([{ consent_type: "whoop_processing" }]);

  assert.equal(result.hasRequiredConsent, false);
  assert.deepEqual(result.missingConsentTypes, ["informational_non_medical"]);
});

test("returns fully consented when both required consent rows are present", () => {
  const result = evaluateRequiredConsentRows([
    { consent_type: "whoop_processing" },
    { consent_type: "informational_non_medical" },
  ]);

  assert.equal(result.hasRequiredConsent, true);
  assert.deepEqual(result.missingConsentTypes, []);
});


