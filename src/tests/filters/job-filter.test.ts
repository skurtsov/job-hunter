import test from "node:test";
import assert from "node:assert/strict";

import type { Job } from "../../types.js";
import {
  filterJobs,
} from "../../filters/job-filter.js";

function createJob(
  title: string
): Job {
  return {
    externalId: title,
    company: "Test Company",
    title,
    location: "Remote",
    description: null,
    applyUrl: "https://example.com",
    source: "greenhouse",
    publishedAt: null,
  };
}

const cases: Array<{
  title: string;
  expected: boolean;
}> = [
  {
    title: "Senior Software Engineer",
    expected: true,
  },
  {
    title: "Software Engineer II",
    expected: true,
  },
  {
    title: "Software Engineer III",
    expected: true,
  },
  {
    title: "Principal Software Engineer",
    expected: true,
  },
  {
    title: "Lead Software Engineer",
    expected: true,
  },
  {
    title: "Software Engineer I",
    expected: false,
  },
  {
    title: "Software Engineer I, Backend",
    expected: false,
  },
  {
    title: "Junior Software Engineer",
    expected: false,
  },
  {
    title: "Software Engineer Intern",
    expected: false,
  },
  {
    title: "Staff Software Engineer",
    expected: false,
  },
  {
    title: "Engineering Manager, Software",
    expected: false,
  },
  {
    title: "Senior iOS Software Engineer",
    expected: false,
  },
  {
    title: "Senior Android Software Engineer",
    expected: false,
  },
];

for (const testCase of cases) {
  test(
    `filterJobs: ${testCase.title} -> ${testCase.expected ? "keep" : "reject"}`,
    () => {
      const result =
        filterJobs([
          createJob(
            testCase.title
          ),
        ]);

      assert.equal(
        result.length === 1,
        testCase.expected
      );
    }
  );
}
