import assert from "node:assert/strict";
import test from "node:test";
import type { Job } from "../../types.js";
import { isEuropeRelevantJob } from "../../filters/europe-filter.js";

function job(location: string | null): Job {
  return {
    externalId: "1",
    company: "Test",
    title: "Software Engineer",
    location,
    description: null,
    applyUrl: "https://example.com",
    source: "greenhouse",
    publishedAt: null,
  };
}

for (const location of [
  "Remote Spain",
  "Madrid, Spain",
  "European Union",
  "Remote - Europe",
  "Home based - EMEA",
  "Remote - Americas or EU",
  "Home Based - Americas; Home based - EMEA",
  "Home based - Worldwide",
  "Global Anywhere",
  "Barcelona",
  "Remote",
]) {
  test(`Europe gate keeps: ${location}`, () => {
    assert.equal(isEuropeRelevantJob(job(location)), true);
  });
}

for (const location of [
  "Remote US",
  "United States (Remote)",
  "Remote Canada",
  "Canada (Remote)",
  "Americas Remote",
  "North America",
  "Remote - Latin America",
  "Office Based - Taipei, Taiwan",
]) {
  test(`Europe gate rejects: ${location}`, () => {
    assert.equal(isEuropeRelevantJob(job(location)), false);
  });
}
