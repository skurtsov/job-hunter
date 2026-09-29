import test from "node:test";
import assert from "node:assert/strict";

import type { Job } from "../../types.js";
import {
  deduplicateJobs,
} from "../../processors/job-deduplicator.js";

function createJob(
  externalId: string,
  title: string,
  location: string,
  applyUrl: string,
  company = "Affirm"
): Job {
  return {
    externalId,
    company,
    title,
    location,
    description: null,
    applyUrl,
    source: "greenhouse",
    publishedAt: null,
  };
}

test(
  "deduplicates punctuation variants of the same vacancy",
  () => {
    const jobs = [
      createJob(
        "1",
        "Software Engineer II , Backend, (Furnishing Platform)",
        "Remote US",
        "https://example.com/1"
      ),
      createJob(
        "2",
        "Software Engineer II, Backend (Furnishing Platform)",
        "Remote Canada",
        "https://example.com/2"
      ),
    ];

    const result =
      deduplicateJobs(jobs);

    assert.equal(
      result.length,
      1
    );

    const vacancy = result[0];
    assert.ok(vacancy);

    assert.equal(
      vacancy.jobs.length,
      2
    );

    assert.deepEqual(
      vacancy.locations,
      [
        "Remote US",
        "Remote Canada",
      ]
    );

    assert.deepEqual(
      vacancy.applyUrls,
      [
        "https://example.com/1",
        "https://example.com/2",
      ]
    );
  }
);

test(
  "deduplicates common backend and full-stack spelling variants",
  () => {
    const jobs = [
      createJob(
        "1",
        "Senior Back-End Full-Stack Engineer",
        "Remote",
        "https://example.com/1"
      ),
      createJob(
        "2",
        "Senior Backend Fullstack Engineer",
        "Remote",
        "https://example.com/2"
      ),
    ];

    const result =
      deduplicateJobs(jobs);

    assert.equal(
      result.length,
      1
    );
  }
);

test(
  "does not deduplicate identical titles from different companies",
  () => {
    const jobs = [
      createJob(
        "1",
        "Senior Software Engineer",
        "Remote",
        "https://example.com/1",
        "Affirm"
      ),
      createJob(
        "2",
        "Senior Software Engineer",
        "Remote",
        "https://example.com/2",
        "Other Company"
      ),
    ];

    const result =
      deduplicateJobs(jobs);

    assert.equal(
      result.length,
      2
    );
  }
);
