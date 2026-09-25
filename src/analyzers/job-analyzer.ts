import type { Job } from "../types.js";

export type WorkArrangement =
  | "b2b_possible"
  | "employment_only"
  | "unknown";

export type SeniorityLevel =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "lead"
  | "manager"
  | "unknown";

export type MatchRecommendation =
  | "strong_match"
  | "good_match"
  | "possible_match"
  | "weak_match";

export type CandidateProfile = {
  title: string;

  yearsOfExperience: number;

  seniority: SeniorityLevel;

  skills: string[];

  domains: string[];

  preferredRoles: string[];

  workPreferences: {
    acceptsB2B: boolean;
    acceptsEmployment: boolean;
    acceptsRemote: boolean;
  };
};

export type JobAnalysis = {
  overallScore: number;

  skills: {
    score: number;

    matched: string[];

    missingRequired: string[];

    missingPreferred: string[];
  };

  experience: {
    score: number;

    requiredYears: number | null;

    candidateYears: number;
  };

  seniority: {
    required: SeniorityLevel;

    candidate: SeniorityLevel;

    match: boolean;
  };

  workArrangement: {
    type: WorkArrangement;

    restrictions: string[];
  };

  blockers: string[];

  recommendation: MatchRecommendation;

  reasoning: string;
};

/**
 * Contract for the future LLM analyzer.
 *
 * At this stage this function deliberately does not call an LLM.
 * It creates the input structure that will later be sent to the model.
 */
export function buildJobAnalysisInput(
  job: Job,
  candidate: CandidateProfile
) {
  return {
    job: {
      id: job.externalId,
      company: job.company,
      title: job.title,
      location: job.location,
      description: job.description,
      applyUrl: job.applyUrl,
      publishedAt:
        job.publishedAt?.toISOString() ?? null,
    },

    candidate: {
      title: candidate.title,
      yearsOfExperience:
        candidate.yearsOfExperience,

      seniority: candidate.seniority,

      skills: candidate.skills,

      domains: candidate.domains,

      preferredRoles:
        candidate.preferredRoles,

      workPreferences:
        candidate.workPreferences,
    },
  };
}

/**
 * Runtime validation for an LLM response.
 *
 * We intentionally validate the response before allowing
 * the rest of the application to use it.
 */
export function isJobAnalysis(
  value: unknown
): value is JobAnalysis {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const analysis =
    value as Partial<JobAnalysis>;

  if (
    typeof analysis.overallScore !== "number" ||
    analysis.overallScore < 0 ||
    analysis.overallScore > 100
  ) {
    return false;
  }

  if (
    !analysis.skills ||
    typeof analysis.skills.score !== "number" ||
    !Array.isArray(analysis.skills.matched) ||
    !Array.isArray(
      analysis.skills.missingRequired
    ) ||
    !Array.isArray(
      analysis.skills.missingPreferred
    )
  ) {
    return false;
  }

  if (
    !analysis.experience ||
    typeof analysis.experience.score !==
      "number" ||
    typeof analysis.experience.candidateYears !==
      "number"
  ) {
    return false;
  }

  if (
    !analysis.seniority ||
    typeof analysis.seniority.match !==
      "boolean"
  ) {
    return false;
  }

  if (
    !analysis.workArrangement ||
    !Array.isArray(
      analysis.workArrangement.restrictions
    )
  ) {
    return false;
  }

  if (!Array.isArray(analysis.blockers)) {
    return false;
  }

  if (
    typeof analysis.reasoning !== "string"
  ) {
    return false;
  }

  return true;
}