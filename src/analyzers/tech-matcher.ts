import type { Job } from "../types.js";
import { TECHNOLOGIES } from "../config/technologies.js";

export type TechMatch = {
  jobTechnologies: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchCount: number;
  missingCount: number;
  score: number;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9.+#/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTechnology(
  text: string,
  technology: string
): boolean {
  const normalizedTechnology = normalizeText(technology);

  // Multi-word technology, e.g. "rest api"
  if (normalizedTechnology.includes(" ")) {
    return text.includes(normalizedTechnology);
  }

  const tokens = text.split(" ");

  return tokens.includes(normalizedTechnology);
}

export function analyzeTechMatch(
  job: Job,
  profileSkills: string[]
): TechMatch {
  const text = normalizeText(
    `${job.title} ${job.description ?? ""}`
  );

  // Technologies mentioned in the vacancy
  const jobTechnologies = TECHNOLOGIES.filter((technology) =>
    containsTechnology(text, technology)
  );

  const normalizedProfileSkills = profileSkills.map((skill) =>
    normalizeText(skill)
  );

  const matchedSkills = jobTechnologies.filter((technology) =>
    normalizedProfileSkills.includes(
      normalizeText(technology)
    )
  );

  const missingSkills = jobTechnologies.filter(
    (technology) =>
      !normalizedProfileSkills.includes(
        normalizeText(technology)
      )
  );

  const score =
    jobTechnologies.length === 0
      ? 0
      : Math.round(
          (matchedSkills.length / jobTechnologies.length) * 100
        );

  return {
    jobTechnologies,
    matchedSkills,
    missingSkills,
    matchCount: matchedSkills.length,
    missingCount: missingSkills.length,
    score,
  };
}