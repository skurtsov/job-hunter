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


test(
  "deduplicates city-specific variants when title suffix matches location",
  () => {
    const jobs = [
      createJob(
        "1",
        "Software Engineer, Platform - Barcelona, Spain",
        "Barcelona, Spain",
        "https://example.com/barcelona",
        "Speechify"
      ),
      createJob(
        "2",
        "Software Engineer, Platform - Madrid, Spain",
        "Madrid, Spain",
        "https://example.com/madrid",
        "Speechify"
      ),
      createJob(
        "3",
        "Software Engineer, Platform - Berlin, Germany",
        "Berlin, Germany",
        "https://example.com/berlin",
        "Speechify"
      ),
    ];

    const result =
      deduplicateJobs(jobs);

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0]?.jobs.length,
      3
    );

    assert.deepEqual(
      result[0]?.locations,
      [
        "Barcelona, Spain",
        "Madrid, Spain",
        "Berlin, Germany",
      ]
    );
  }
);

test(
  "does not strip a suffix that is not the structured location",
  () => {
    const jobs = [
      createJob(
        "1",
        "Senior Software Engineer - Payments",
        "Madrid, Spain",
        "https://example.com/payments"
      ),
      createJob(
        "2",
        "Senior Software Engineer",
        "Madrid, Spain",
        "https://example.com/general"
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
