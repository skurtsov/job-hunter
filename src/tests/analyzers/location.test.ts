import test from "node:test";
import assert from "node:assert/strict";

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

test(
  "Canada-only restriction rejects candidate in Spain",
  () => {
    const job = createJob(
      "Remote Canada",
      `
      This remote role is open only to candidates residing in
      Alberta, British Columbia, Manitoba, New Brunswick,
      Newfoundland and Labrador, Nova Scotia, Ontario,
      Prince Edward Island, or Saskatchewan.
      `
    );

    const restriction =
      detectExplicitLocationRestriction(job);

    assert.ok(restriction);

    assert.equal(
      candidateSatisfiesLocationRestriction(
        restriction,
        job,
        CANDIDATE_PROFILE
      ),
      false
    );
  }
);

test(
  "Spain-only restriction accepts candidate in Spain",
  () => {
    const job = createJob(
      "Remote Spain",
      `
      We require that someone is based in Spain.
      `
    );

    const restriction =
      detectExplicitLocationRestriction(job);

    assert.ok(restriction);

    assert.equal(
      candidateSatisfiesLocationRestriction(
        restriction,
        job,
        CANDIDATE_PROFILE
      ),
      true
    );
  }
);

test(
  "Remote US without explicit restriction remains unknown",
  () => {
    const job = createJob(
      "Remote US",
      `
      This is a remote software engineering position.
      `
    );

    assert.equal(
      detectExplicitLocationRestriction(job),
      null
    );
  }
);
