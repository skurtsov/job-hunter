import type { Job } from "../types.js";

const TITLE_KEYWORDS = [
  "software engineer",
  "software developer",
  "full stack",
  "full-stack",
  "fullstack",
  "backend",
  "back-end",
  "node.js",
  "nodejs",
  "typescript",
  "python",
];

const EXCLUDED_TITLE_KEYWORDS = [
  "mobile",
  "ios",
  "android",
  "engineering manager",
  "manager, software engineering",
];

function includesAny(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function filterJobs(jobs: Job[]): Job[] {
  return jobs.filter((job) => {
    const matchesRole = includesAny(job.title, TITLE_KEYWORDS);

    const isExcluded = includesAny(
      job.title,
      EXCLUDED_TITLE_KEYWORDS
    );

    return matchesRole && !isExcluded;
  });
}