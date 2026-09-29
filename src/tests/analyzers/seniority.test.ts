import test from "node:test";
import assert from "node:assert/strict";

import {
  inferSeniorityFromTitle,
  type SeniorityLevel,
} from "../../analyzers/job-analyzer.js";

const cases: Array<{
  title: string;
  expected: SeniorityLevel | null;
}> = [
  {
    title: "Software Engineer II",
    expected: "mid",
  },
  {
    title: "Software Engineer II, Backend",
    expected: "mid",
  },
  {
    title: "Backend Engineer II",
    expected: "mid",
  },
  {
    title: "Frontend Engineer II",
    expected: "mid",
  },
  {
    title: "Full-Stack Engineer II",
    expected: "mid",
  },
  {
    title: "Senior Software Engineer",
    expected: "senior",
  },
  {
    title: "Principal Software Engineer",
    expected: "principal",
  },
  {
    title: "Lead Software Engineer",
    expected: "lead",
  },
  {
    title: "Software Engineer III",
    expected: null,
  },
];

for (const testCase of cases) {
  test(
    `${testCase.title} -> ${testCase.expected ?? "unknown"}`,
    () => {
      assert.equal(
        inferSeniorityFromTitle(
          testCase.title
        ),
        testCase.expected
      );
    }
  );
}
