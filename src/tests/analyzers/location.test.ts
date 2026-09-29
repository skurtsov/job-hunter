import type { Job } from "../../types.js";

import {
  detectExplicitLocationRestriction,
  candidateSatisfiesLocationRestriction,
} from "../../analyzers/job-analyzer.js";

import {
  CANDIDATE_PROFILE,
} from "../../config/candidate-profile.js";

function createJob(
  location: string,
  description: string
): Job {
  return {
    externalId: "test",
    company: "Test Company",
    title: "Senior Software Engineer",
    location,
    description,
    applyUrl: "https://example.com",
    source: "greenhouse",
    publishedAt: null,
  };
}

const tests = [
  {
    name: "Canada-only",
    job: createJob(
      "Remote Canada",
      `
      This remote role is open only to candidates residing in
      Alberta, British Columbia, Manitoba, New Brunswick,
      Newfoundland and Labrador, Nova Scotia, Ontario,
      Prince Edward Island, or Saskatchewan.
      `
    ),
    expected: false,
  },

  {
    name: "Spain-only",
    job: createJob(
      "Remote Spain",
      `
      We require that someone is based in Spain.
      `
    ),
    expected: true,
  },

  {
    name: "Remote US without explicit restriction",
    job: createJob(
      "Remote US",
      `
      This is a remote software engineering position.
      `
    ),
    expected: null,
  },
];

console.log(
  "\n================================"
);
console.log("LOCATION TESTS");
console.log(
  "================================"
);

for (const test of tests) {
  const restriction =
    detectExplicitLocationRestriction(
      test.job
    );

  const result = restriction
    ? candidateSatisfiesLocationRestriction(
        restriction,
        test.job,
        CANDIDATE_PROFILE
      )
    : null;

  const passed =
    result === test.expected;

  console.log(
    `\n${passed ? "✅" : "❌"} ${test.name}`
  );

  console.log(
    "Restriction:",
    restriction?.text ?? "none"
  );

  console.log(
    "Candidate country:",
    CANDIDATE_PROFILE.location.country
  );

  console.log(
    "Result:",
    result
  );

  console.log(
    "Expected:",
    test.expected
  );
}