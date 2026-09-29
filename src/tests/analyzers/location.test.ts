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


test(
  "country-of-employment wording rejects Spain candidate for Remote Canada",
  () => {
    const job = makeJob({
      location: "Remote Canada",
      description:
        "Affirm is remote-first. Most roles can be done from almost anywhere within the country of employment.",
    });

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
  "country-of-employment wording accepts Spain candidate for Remote Spain",
  () => {
    const job = makeJob({
      location: "Remote Spain",
      description:
        "Most roles can be done from almost anywhere within the country of employment.",
    });

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
  "country-of-employment wording rejects Spain candidate for Remote US",
  () => {
    const job = makeJob({
      location: "Remote US",
      description:
        "Most roles can be done from almost anywhere within the country of employment.",
    });

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
  "country-of-employment wording rejects Spain candidate for Remote UK",
  () => {
    const job = makeJob({
      location: "UK Remote",
      description:
        "Most roles can be done from almost anywhere within the country of employment.",
    });

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
  "generic Remote does not turn country-of-employment wording into a restriction",
  () => {
    const job = makeJob({
      location: "Remote",
      description:
        "Most roles can be done from almost anywhere within the country of employment.",
    });

    assert.equal(
      detectExplicitLocationRestriction(
        job
      ),
      null
    );
  }
);
