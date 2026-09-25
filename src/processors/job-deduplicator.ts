 import type { Job } from "../types.js";

export type DeduplicatedJob = {
  company: string;
  title: string;
  locations: string[];
  applyUrls: string[];
  jobs: Job[];
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function createKey(job: Job): string {
  return `${job.company.toLowerCase()}::${normalizeTitle(job.title)}`;
}

export function deduplicateJobs(
  jobs: Job[]
): DeduplicatedJob[] {
  const groups = new Map<string, DeduplicatedJob>();

  for (const job of jobs) {
    const key = createKey(job);

    const existing = groups.get(key);

    if (existing) {
      if (
        job.location &&
        !existing.locations.includes(job.location)
      ) {
        existing.locations.push(job.location);
      }

      if (!existing.applyUrls.includes(job.applyUrl)) {
        existing.applyUrls.push(job.applyUrl);
      }

      existing.jobs.push(job);

      continue;
    }

    groups.set(key, {
      company: job.company,
      title: job.title.trim(),
      locations: job.location ? [job.location] : [],
      applyUrls: [job.applyUrl],
      jobs: [job],
    });
  }

  return [...groups.values()];
}