import type { Job } from "../types.js";
import { askBedrock } from "../llm/bedrock-client.js";

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

function buildPrompt(
  job: Job,
  candidate: CandidateProfile
): string {
  const input = buildJobAnalysisInput(
    job,
    candidate
  );

  return `
You are a software engineering job matching system.

Analyze how well the candidate matches the vacancy.

IMPORTANT RULES:

1. Use ONLY information present in the candidate profile and job description.

2. Never invent candidate skills, technologies, experience, or qualifications.

3. Candidate domains represent previous experience only.

Do NOT penalize the candidate because the vacancy belongs to another industry.

For example, experience in FinTech or BioTech does NOT mean the candidate
should be penalized for SaaS, e-commerce, travel, media, gaming, AdTech,
or another industry.

4. Distinguish carefully between:
- required skills
- preferred / nice-to-have skills

Missing a preferred skill must have much less impact than missing
a required skill.

Do NOT treat every technology mentioned in the job description
as a mandatory requirement.

5. SENIORITY PREFERENCES

The candidate is interested in:

- mid
- senior
- principal
- lead

The candidate is NOT interested in:

- intern
- junior
- staff
- manager

If the vacancy is clearly intern, junior, staff, or manager level:

- set seniority.match to false
- add an appropriate blocker
- recommendation must be "weak_match"

Do NOT reject a vacancy merely because seniority cannot be determined.
If seniority is unclear, use "unknown".

6. WORK ARRANGEMENT

The candidate is open to international B2B / contractor opportunities.

A location label such as:

"Remote US"
"Remote Canada"
"Remote UK"
"Remote Europe"

does NOT automatically mean the candidate is ineligible.

Location by itself is NOT a blocker.

Look for explicit restrictions in the actual job description such as:

- must reside in...
- must be authorized to work in...
- US residents only
- Canada residents only
- employment only
- no contractors
- no B2B

Look also for positive contractor signals such as:

- B2B
- contractor
- independent contractor
- international contractor
- EOR
- worldwide
- work from anywhere

Use:

"b2b_possible"

only when there is actual evidence that B2B,
contractor, international contractor, EOR,
or equivalent arrangements are possible.

Use:

"employment_only"

only when the job description provides explicit evidence
that the role requires an employment relationship or
contains restrictions incompatible with international B2B.

Otherwise use:

"unknown"

Do NOT guess work eligibility from the location field alone.

7. BLOCKERS

A blocker is a serious issue that could prevent the candidate
from qualifying or make the vacancy clearly unsuitable.

Examples:

- explicitly required skill that the candidate does not have
- explicitly required work authorization
- explicitly required residency
- incompatible seniority
- explicitly required qualification not present in candidate profile

Do NOT classify these as blockers:

- nice-to-have skills
- preferred technologies
- different business domain
- location label by itself
- ambiguous requirements

8. EXPERIENCE

Determine required years of experience only when the job description
provides enough evidence.

If the vacancy does not specify required years, use:

"requiredYears": null

Do NOT invent a number.

9. SKILLS

Only put a skill into "matched" if:

- the vacancy requires or prefers it
AND
- it exists in the candidate profile

Only put a skill into "missingRequired" if the job description
clearly requires it.

Use "missingPreferred" for optional or preferred skills.

10. SCORING

overallScore must be between 0 and 100.

skills.score must be between 0 and 100.

experience.score must be between 0 and 100.

Consider:

- required skill match
- relevant experience
- seniority
- role compatibility
- explicit work restrictions

Do NOT reduce the score simply because the candidate
has not previously worked in the vacancy's industry.

11. RECOMMENDATION

recommendation must be exactly one of:

"strong_match"
"good_match"
"possible_match"
"weak_match"

Use approximately:

strong_match: 85-100
good_match: 70-84
possible_match: 50-69
weak_match: 0-49

A serious blocker may justify "weak_match"
even if several technologies match.

12. OUTPUT

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT include explanations before or after JSON.

The JSON MUST follow exactly this structure:

{
  "overallScore": 0,

  "skills": {
    "score": 0,
    "matched": [],
    "missingRequired": [],
    "missingPreferred": []
  },

  "experience": {
    "score": 0,
    "requiredYears": null,
    "candidateYears": 0
  },

  "seniority": {
    "required": "unknown",
    "candidate": "unknown",
    "match": false
  },

  "workArrangement": {
    "type": "unknown",
    "restrictions": []
  },

  "blockers": [],

  "recommendation": "weak_match",

  "reasoning": ""
}

Allowed seniority values:

"intern"
"junior"
"mid"
"senior"
"staff"
"principal"
"lead"
"manager"
"unknown"

Allowed workArrangement.type values:

"b2b_possible"
"employment_only"
"unknown"

CANDIDATE PROFILE:

${JSON.stringify(input.candidate, null, 2)}

JOB:

${JSON.stringify(input.job, null, 2)}
`.trim();
}

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
    analysis.skills.score < 0 ||
    analysis.skills.score > 100 ||
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
    analysis.experience.score < 0 ||
    analysis.experience.score > 100 ||
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

  const seniorityLevels: SeniorityLevel[] = [
    "intern",
    "junior",
    "mid",
    "senior",
    "staff",
    "principal",
    "lead",
    "manager",
    "unknown",
  ];

  if (
    !seniorityLevels.includes(
      analysis.seniority.required
    ) ||
    !seniorityLevels.includes(
      analysis.seniority.candidate
    )
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

  const workArrangementTypes: WorkArrangement[] = [
    "b2b_possible",
    "employment_only",
    "unknown",
  ];

  if (
    !workArrangementTypes.includes(
      analysis.workArrangement.type
    )
  ) {
    return false;
  }

  if (!Array.isArray(analysis.blockers)) {
    return false;
  }

  const recommendations: MatchRecommendation[] = [
    "strong_match",
    "good_match",
    "possible_match",
    "weak_match",
  ];

  if (
    !analysis.recommendation ||
    !recommendations.includes(
      analysis.recommendation
    )
  ) {
    return false;
  }

  if (
    typeof analysis.reasoning !== "string"
  ) {
    return false;
  }

  return true;
}

function parseModelJson(
  text: string
): unknown {
  let cleaned = text.trim();

  // GPT OSS may occasionally wrap JSON
  // inside a markdown code block despite instructions.
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `LLM returned invalid JSON:\n${text}`
    );
  }
}

export async function analyzeJob(
  job: Job,
  candidate: CandidateProfile
): Promise<JobAnalysis> {
  const prompt = buildPrompt(
    job,
    candidate
  );

  const response = await askBedrock(
    prompt
  );

  const parsed = parseModelJson(
    response.text
  );

  if (!isJobAnalysis(parsed)) {
    throw new Error(
      `LLM returned JSON with invalid JobAnalysis structure:\n${response.text}`
    );
  }

  return parsed;
}