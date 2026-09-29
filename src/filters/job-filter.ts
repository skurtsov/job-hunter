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

/**
 * Roles that we don't want to send to the expensive
 * Bedrock analysis at all.
 */
const EXCLUDED_TITLE_KEYWORDS = [
  // Too junior
  "intern",
  "internship",
  "junior",
  "graduate",
  "new grad",
  "entry level",
  "entry-level",

  // Staff level
  "staff",

  // Management
  "engineering manager",
  "software engineering manager",
  "manager, software engineering",
  "manager software engineering",
  "engineering director",
  "director of engineering",

  // Mobile specialization
  "mobile",
  "ios",
  "android",
];

function includesAny(
  value: string,
  keywords: string[]
): boolean {
  const normalized =
    value.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(
      keyword.toLowerCase()
    )
  );
}

/**
 * Detect explicit level-I engineering titles.
 *
 * Examples:
 *
 * Software Engineer I
 * Software Engineer I, Backend
 * Software Developer I
 * Backend Engineer I
 * Frontend Engineer I
 *
 * But NOT:
 *
 * Software Engineer II
 * Software Engineer III
 */
function isLevelOneEngineer(
  title: string
): boolean {
  const normalized =
    title
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const patterns = [
    /\bsoftware engineer i\b(?!i)/,
    /\bsoftware developer i\b(?!i)/,
    /\bbackend engineer i\b(?!i)/,
    /\bback-end engineer i\b(?!i)/,
    /\bfrontend engineer i\b(?!i)/,
    /\bfront-end engineer i\b(?!i)/,
    /\bfullstack engineer i\b(?!i)/,
    /\bfull-stack engineer i\b(?!i)/,
    /\bfull stack engineer i\b(?!i)/,
  ];

  return patterns.some(
    (pattern) =>
      pattern.test(normalized)
  );
}

export function filterJobs(
  jobs: Job[]
): Job[] {
  return jobs.filter((job) => {
    const matchesRole =
      includesAny(
        job.title,
        TITLE_KEYWORDS
      );

    if (!matchesRole) {
      return false;
    }

    const hasExcludedKeyword =
      includesAny(
        job.title,
        EXCLUDED_TITLE_KEYWORDS
      );

    if (hasExcludedKeyword) {
      return false;
    }

    if (
      isLevelOneEngineer(
        job.title
      )
    ) {
      return false;
    }

    return true;
  });
}