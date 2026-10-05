import assert from "node:assert/strict";
import test from "node:test";
import { parseGreenhouseJobUrl } from "../../applications/greenhouse-form-reader.js";

test("parses Greenhouse application URL", () => {
  assert.deepEqual(
    parseGreenhouseJobUrl(
      "https://job-boards.greenhouse.io/canonical/jobs/4398031"
    ),
    { company: "canonical", jobId: "4398031" }
  );
});

test("rejects unsupported application URL", () => {
  assert.throws(
    () => parseGreenhouseJobUrl("https://example.com/jobs/123"),
    /Expected Greenhouse URL/
  );
});
