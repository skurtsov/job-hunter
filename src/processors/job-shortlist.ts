import type {
  DeduplicatedJob,
} from "./job-deduplicator.js";

import {
  analyzeTechMatch,
} from "../analyzers/tech-matcher.js";

import {
  PROFILE_SKILLS,
} from "../config/profile.js";

export type ShortlistedJob = {
  job: DeduplicatedJob;
  techScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  jobTechnologies: string[];
};

export function createShortlist(
  jobs: DeduplicatedJob[]
): ShortlistedJob[] {
  const shortlist: ShortlistedJob[] = [];

  for (const job of jobs) {
    const representativeJob =
      job.jobs[0];

    if (!representativeJob) {
      continue;
    }

    const techMatch =
      analyzeTechMatch(
        representativeJob,
        PROFILE_SKILLS
      );

    if (techMatch.score < 50) {
      continue;
    }

    shortlist.push({
      job,
      techScore:
        techMatch.score,
      matchedSkills:
        techMatch.matchedSkills,
      missingSkills:
        techMatch.missingSkills,
      jobTechnologies:
        techMatch.jobTechnologies,
    });
  }

  shortlist.sort(
    (a, b) =>
      b.techScore -
      a.techScore
  );

  return shortlist;
}