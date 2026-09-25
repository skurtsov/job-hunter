import type { DeduplicatedJob } from "./job-deduplicator.js";
import { analyzeTechMatch } from "../analyzers/tech-matcher.js";
import { PROFILE_SKILLS } from "../config/profile.js";

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
  return jobs
    .map((job) => {
      const representativeJob = job.jobs[0];

      const techMatch = analyzeTechMatch(
        representativeJob,
        PROFILE_SKILLS
      );

      return {
        job,
        techScore: techMatch.score,
        matchedSkills: techMatch.matchedSkills,
        missingSkills: techMatch.missingSkills,
        jobTechnologies: techMatch.jobTechnologies,
      };
    })

    // For now this is intentionally permissive.
    // LLM analysis will make the real decision later.
    .filter((item) => item.techScore >= 50)

    .sort((a, b) => b.techScore - a.techScore);
}