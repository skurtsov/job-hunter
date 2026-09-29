import test from "node:test";
import assert from "node:assert/strict";

import {
  extractRequiredYears,
} from "../../analyzers/job-analyzer.js";

const cases: Array<{
  text: string;
  expected: number | null;
}> = [
  {
    text: "Requires 4+ years of software engineering experience.",
    expected: 4,
  },
  {
    text: "You have 1.5+ years of professional experience.",
    expected: 1.5,
  },
  {
    text: "At least 5 years of backend development experience.",
    expected: 5,
  },
  {
    text: "Minimum of 3 years of experience with Node.js.",
    expected: 3,
  },
  {
    text: "Minimum 6 years of professional software development.",
    expected: 6,
  },
  {
    text: "Strong professional software engineering experience.",
    expected: null,
  },
  {
    text: "We are looking for an experienced engineer.",
    expected: null,
  },
  {
    text: "",
    expected: null,
  },
];

for (const testCase of cases) {
  test(
    `extractRequiredYears: ${testCase.text || "empty description"}`,
    () => {
      assert.equal(
        extractRequiredYears(
          testCase.text
        ),
        testCase.expected
      );
    }
  );
}
