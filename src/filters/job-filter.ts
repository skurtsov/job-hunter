import type { Job } from "../types.js";

const TITLE_KEYWORDS = [
  "software engineer",
  "software developer",

  "full stack",
  "full-stack",
  "fullstack",

  "backend",
  "back-end",

  "frontend",
  "front-end",

  "node.js",
  "nodejs",

  "typescript",
  "javascript",

  "python",
];

const EXCLUDED_TITLE_KEYWORDS = [
  // Too junior
  "intern",
  "internship",
  "junior",

  // Staff level
  "staff software engineer",
  "staff engineer",

  // Management
  "engineering manager",
  "software engineering manager",
  "manager, software engineering",

  // Mobile specialization
  "mobile",
  "ios",
  "android",
];

function includesAny(
  value: string,
  keywords: string[]
): boolean {
  const normalized = value.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function filterJobs(
  jobs: Job[]
): Job[] {
  return jobs.filter((job) => {
    const matchesRole = includesAny(
      job.title,
      TITLE_KEYWORDS
    );

    const isExcluded = includesAny(
      job.title,
      EXCLUDED_TITLE_KEYWORDS
    );

    return matchesRole && !isExcluded;
  });
}