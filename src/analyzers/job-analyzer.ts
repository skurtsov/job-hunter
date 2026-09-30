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

  location: {
    country: string;
  };
  workPreferences: {
    acceptsB2B: boolean;
    acceptsEmployment: boolean;
    acceptsRemote: boolean;
    hasUSWorkAuthorization: boolean;
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

function buildPrompt(
  job: Job,
  profile: CandidateProfile
): string {
  return `
You are analyzing a software engineering job vacancy
against a candidate profile.

Your goal is to estimate whether applying to this vacancy
is reasonable.

This is NOT a keyword-counting task.

Evaluate the candidate the way a reasonable technical
recruiter or hiring manager would evaluate transferable
engineering experience.

Use ONLY:

1. CANDIDATE PROFILE
2. JOB DESCRIPTION

Never invent candidate experience.
Never invent job requirements.
Never invent legal or geographic restrictions.

==================================================
CANDIDATE PROFILE
==================================================

${JSON.stringify(profile, null, 2)}

==================================================
JOB
==================================================

Company:
${job.company}

Title:
${job.title}

Location:
${job.location ?? "Unknown"}

Description:

${job.description ?? "No description provided"}

==================================================
CORE PRINCIPLE
==================================================

Evaluate COMPETENCY AREAS, not isolated keywords.

A job description frequently describes one competency
using several examples, technologies, practices, or tasks.

Do NOT automatically transform every noun or technology
inside such a description into an independent mandatory
requirement.

Example:

"Comfort building integrations between systems —
REST APIs, OAuth/OIDC, webhook ingestion,
secrets management, egress networking configuration,
and identity/SSO patterns."

This describes a broader competency:

"Systems integrations and networking"

It does NOT necessarily mean that the candidate must have
explicit prior experience with every single listed item.

If the candidate has substantial relevant experience such as:

- REST APIs
- Webhooks
- third-party integrations
- cloud infrastructure
- backend systems

then this competency can be considered partially or
substantially matched.

Do NOT put every unconfirmed example technology into
missingRequired.

==================================================
COMPETENCY GROUPING
==================================================

Before scoring, internally group the job requirements into
meaningful competency areas.

Examples:

- Analytical Data Platforms
- Containerization & Deployment
- Platform / Developer Tooling
- Integrations & Networking
- Backend Engineering
- Operational Ownership
- AI / Agentic Data Tooling
- Communication & Collaboration

For each competency determine internally whether the
candidate has:

- strong evidence
- partial / transferable evidence
- no evidence

Score based primarily on coverage of these competency areas,
not raw keyword coverage.

Do NOT output this internal grouping separately.

==================================================
TECHNOLOGY ALTERNATIVES
==================================================

Treat alternatives as ONE requirement.

Example:

"Snowflake, Databricks, BigQuery, or similar"

means experience with ONE relevant analytical data platform
may satisfy the requirement.

Candidate has BigQuery:

=> competency satisfied

Do NOT report Snowflake and Databricks as missing.

Example:

"Buildkite, GitHub Actions, or similar"

Candidate has general CI/CD experience:

=> consider relevant transferable experience.

Do NOT require both Buildkite and GitHub Actions.

Do NOT claim the candidate knows GitHub Actions unless
GitHub Actions explicitly exists in the candidate profile.

==================================================
MATCHED SKILLS
==================================================

skills.matched is NOT a list of all skills the candidate knows.

A skill may appear in skills.matched ONLY when BOTH
conditions are true:

1. The candidate profile explicitly confirms the skill
   or a clearly equivalent named skill.

AND

2. The skill is relevant to a requirement, responsibility,
   competency, technology, or engineering area described
   in THIS specific job description.

Think of matched as the INTERSECTION:

candidate skills
∩
job-relevant skills

Do NOT copy unrelated candidate skills into matched merely
because they exist in the candidate profile.

Example:

Candidate knows:

- Python
- BigQuery
- Stripe
- WordPress
- Solidity

Job requires:

- Python
- SQL
- analytical data platforms
- Docker

Valid matched output may include:

- Python
- BigQuery

Invalid matched output:

- Stripe
- WordPress
- Solidity

because those skills are not relevant to this vacancy.

A broader transferable skill may appear in matched when the
job clearly describes the corresponding competency.

Example:

Job:
"building integrations between systems"

Candidate:
"REST APIs"
"Webhooks"
"Third-Party API Integrations"

These may appear in matched.

However, do NOT add:

"OAuth/OIDC"

unless OAuth/OIDC itself exists in the candidate profile.

==================================================
MATCHED SKILLS QUALITY CHECK
==================================================

Before returning the response, inspect EVERY item in
skills.matched.

For every matched item ask:

A. Is this explicitly supported by the candidate profile?

B. Is this actually relevant to this job description?

If either answer is NO:

REMOVE the item from skills.matched.

Do not use skills.matched as a candidate skill inventory.

Keep the array focused on evidence explaining why this
candidate matches THIS vacancy.

Prefer 5-20 highly relevant matched skills over copying
dozens of unrelated candidate skills.

==================================================
MISSING REQUIRED
==================================================

Be VERY conservative with missingRequired.

A technology or competency belongs in missingRequired only
when ALL of the following are true:

1. The job clearly treats it as a core requirement.

2. The candidate profile does not confirm it.

3. The candidate does not have substantial transferable
   experience that reasonably covers the broader competency.

4. The item is not merely:
   - an example
   - one technology in a list
   - an implementation detail
   - a responsibility
   - a practice
   - an optional capability

Do NOT split one competency into many missing requirements.

BAD:

[
  "OAuth",
  "OIDC",
  "Secrets Management",
  "Egress Networking",
  "SSO"
]

when these are examples within one broader integrations
competency and the candidate already has meaningful
integration experience.

If there is genuinely a major competency gap, prefer a
single competency-level description.

Example:

[
  "Advanced identity and access management experience"
]

But only if the job clearly requires that competency and
the candidate has no meaningful evidence for it.

==================================================
RESPONSIBILITIES ARE NOT AUTOMATICALLY SKILLS
==================================================

Do NOT automatically classify responsibilities as missing
technical skills.

Examples:

- writing runbooks
- participating in on-call
- owning alerts
- incident response
- code review
- collaborating with teams

These describe working practices or responsibilities.

They should influence the overall evaluation when important,
but should NOT automatically become separate
missingRequired entries.

==================================================
PARTIAL / TRANSFERABLE MATCH
==================================================

Transferable experience matters.

Example:

Job asks for:

internal developer platforms / self-service infrastructure

Candidate has:

- backend development
- distributed systems
- APIs
- cloud deployment
- CI/CD
- automation
- system architecture

This is relevant transferable experience.

Do NOT treat the entire competency as completely absent.

However:

do NOT claim that the candidate explicitly built an internal
developer platform unless the candidate profile says so.

Use the distinction:

explicit experience != transferable experience

Transferable experience may increase the score without
fabricating experience.

==================================================
PREFERRED / OPTIONAL
==================================================

Use missingPreferred only when the job explicitly presents
something as:

- preferred
- optional
- nice-to-have
- familiarity
- interest
- beneficial
- a future/emerging capability

Example:

"Familiarity with or interest in semantic layer design"

should normally NOT be treated as a mandatory requirement.

==================================================
DOMAIN EXPERIENCE
==================================================

Candidate domains describe previous experience only.

They are NOT search restrictions.

Do not penalize the candidate because the company operates
in a different industry unless the job explicitly requires
specific domain experience.

==================================================
SENIORITY
==================================================

Candidate seniority:

${profile.seniority}

Candidate accepts:

- mid
- senior
- principal
- lead

Candidate does NOT want:

- intern
- junior
- staff
- manager

If the vacancy is clearly:

- intern
- junior
- staff
- manager

then:

seniority.match = false

and this should normally be a blocker.

If the title explicitly contains:

Senior

then required should normally be:

"senior"

unless the job description clearly indicates another level.

If the title explicitly contains:

Principal

then required should normally be:

"principal"

If the title explicitly contains:

Lead

then required should normally be:

"lead"

If seniority cannot reasonably be determined:

required = "unknown"

Do NOT infer seniority purely from compensation.

==================================================
EXPERIENCE
==================================================

Candidate experience:

${profile.yearsOfExperience} years

Set requiredYears ONLY when the job explicitly gives a
numeric minimum.

Example:

"5+ years of software engineering experience"

=> requiredYears = 5

If the job does not specify a number:

requiredYears = null

Do not invent a required number of years from seniority.

experience.score MUST represent how well the candidate's
professional experience satisfies the experience level
required by the vacancy.

Do NOT return experience.score = 0 merely because the job
does not specify an explicit number of years.

If requiredYears is null, evaluate experience qualitatively
from the role's seniority and responsibilities.

A senior candidate with substantial relevant professional
experience should normally have a high experience score for
a senior role unless the job requires a substantially
different type of experience.

==================================================
SKILLS SCORE
==================================================

skills.score MUST represent the candidate's coverage of the
job's technical competency areas.

Do NOT return skills.score = 0 when relevant matched skills
or transferable competencies exist.

The score should reflect:

- core competency coverage
- direct technology matches
- transferable technical experience
- important missing competencies

Do NOT calculate it as simple keyword percentage.

==================================================
WORK ARRANGEMENT
==================================================

The candidate:

- accepts remote work
- accepts international B2B / contractor work
- can work with companies globally through B2B
- does NOT currently have US employment authorization

These are separate concepts.

Lack of US employment authorization does NOT mean the
candidate cannot work with a US company as an international
contractor.

==================================================
WORK AUTHORIZATION / LOCATION
==================================================

Never infer:

"must be authorized to work in the US"

from:

- Remote US
- US salary
- US benefits
- US company
- US city
- USD compensation
- remote-first
- "within the country of employment"

A work authorization or residency restriction may appear
in restrictions ONLY when explicitly supported by the
job description.

Examples of explicit restrictions:

- "must be authorized to work in the United States"
- "US work authorization required"
- "must have the right to work in the US"
- "no visa sponsorship"
- "US residents only"
- "must reside in the United States"

Do not strengthen ambiguous language.

If location is "Remote US" but the description does not
explicitly establish authorization/residency requirements:

type = "unknown"

restrictions = []

IMPORTANT:

A country-specific remote location such as:

- Remote US
- Remote Canada
- Remote UK
- Remote Poland
- Remote Spain
- Remote Germany

does NOT by itself prove either:

1. that the candidate is eligible for employment there

OR

2. that international B2B / contractor engagement is allowed.

The location field is informational evidence about how the
employer labels the role.

Do NOT convert absence of an explicit restriction into
positive evidence of eligibility.

If the description is silent about international contractor
or B2B engagement, preserve uncertainty.

==================================================
B2B
==================================================

Set:

type = "b2b_possible"

ONLY with positive evidence such as:

- contractor
- independent contractor
- B2B
- international contractor
- EOR
- worldwide remote
- work from anywhere

Remote alone does not mean B2B.

Set:

type = "employment_only"

ONLY if the job explicitly establishes that the role must
be employment and contractor/B2B work is unavailable, or
an explicit employment restriction makes the candidate
ineligible for that employment arrangement.

Otherwise:

type = "unknown"

==================================================
BLOCKERS
==================================================

Blockers must be rare.

A blocker means a serious incompatibility that can make
applying unreasonable or impossible.

Examples:

- explicit work authorization requirement candidate lacks
- explicit residency requirement candidate cannot satisfy
- incompatible seniority
- mandatory certification/license candidate lacks
- major core competency completely absent from candidate
  experience

A blocker is NOT:

- one unfamiliar library
- one unfamiliar tool
- a technology example
- a preferred skill
- partial coverage of a competency
- a responsibility such as on-call
- different industry experience
- ambiguous location
- an isolated skill gap

Do NOT create a blocker simply because missingRequired
contains something.

==================================================
SCORING
==================================================

Score the overall practical fit.

Do NOT calculate score as:

matched keywords / total keywords

Instead consider approximately:

Technical competency coverage:
highest importance

Professional experience:
high importance

Seniority:
high importance

Transferable experience:
meaningful importance

Preferred skills:
low importance

Minor tooling gaps:
low importance

A candidate who strongly covers most core competencies
should not receive a low score merely because several
specific tools or implementation details are unconfirmed.

Likewise, a candidate should not receive a high score if
a genuinely central competency is absent.

Scores:

85-100:
strong_match

70-84:
good_match

50-69:
possible_match

0-49:
weak_match

==================================================
REASONING
==================================================

reasoning MUST NOT be empty.

Write a concise explanation of approximately 2-5 sentences.

It should explain:

- the strongest reasons for the score
- the most important gaps, if any
- whether seniority matches
- any important work-arrangement uncertainty or blocker

Do NOT list every matched technology.

Do NOT repeat the entire job description.

The reasoning must be useful to a candidate deciding
whether this vacancy is worth applying to.

IMPORTANT WORK-ARRANGEMENT CONSISTENCY:

reasoning MUST be consistent with workArrangement.

If:

workArrangement.type = "unknown"

then reasoning MUST NOT claim or imply:

- "there are no location barriers"
- "there are no authorization barriers"
- "there are no work authorization constraints"
- "there are no legal barriers"
- "the candidate can work in this location"
- "the candidate is eligible to work in this location"
- "the candidate can work for this employer"
- "international B2B is supported"

unless the job description explicitly provides evidence
supporting that specific conclusion.

For example:

Location = "Remote Canada"

and the job description contains no explicit information
about international contractors.

Correct reasoning:

"The posting does not explicitly state whether
international B2B/contractor engagement is supported,
so work-arrangement eligibility remains uncertain."

Incorrect reasoning:

"No location or authorization barriers apply."

Similarly:

Location = "Remote US"

does NOT establish either:

- that US employment authorization is required

OR

- that international B2B work is allowed.

If the job description is silent, preserve uncertainty.

Do NOT convert absence of an explicit restriction into
positive evidence of eligibility.

==================================================
CONSISTENCY CHECK
==================================================

Before returning JSON, internally verify:

1. Every matched skill is supported by candidate profile.

2. Every missingRequired item is genuinely a core
   requirement rather than an example or responsibility.

3. Alternative technologies were not counted separately.

4. Responsibilities were not converted into dozens of
   missing skills.

5. No legal/geographic restriction was invented.

6. Blockers represent serious incompatibilities only.

7. recommendation corresponds to overallScore.

8. Candidate skills were not invented.

9. Every item in skills.matched is relevant to THIS
   specific vacancy.

10. skills.matched does not contain unrelated skills copied
    from the candidate profile.

11. reasoning is not empty.

12. skills.score is consistent with the actual competency
    coverage.

13. experience.score is consistent with the candidate's
    experience and the role.

14. If workArrangement.type is "unknown", reasoning does
    NOT claim that there are no location, authorization,
    legal, residency, or employment barriers.

15. Absence of an explicit restriction was NOT interpreted
    as evidence that the candidate is eligible.

16. A location such as "Remote US", "Remote Canada",
    "Remote UK", or another country-specific remote location
    was NOT interpreted as evidence that international B2B
    work is supported.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

No markdown.
No code fences.
No comments.
No explanatory text outside JSON.

Use exactly this structure:

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
    "candidateYears": ${profile.yearsOfExperience}
  },

  "seniority": {
    "required": "unknown",
    "candidate": "${profile.seniority}",
    "match": true
  },

  "workArrangement": {
    "type": "unknown",
    "restrictions": []
  },

  "blockers": [],

  "recommendation": "possible_match",

  "reasoning": ""
}
`;
}

function parseModelJson(
  text: string
): unknown {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse Bedrock JSON response:\n${text}`
    );
  }
}

function isNumber(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string"
    )
  );
}

function isSeniorityLevel(
  value: unknown
): value is SeniorityLevel {
  return [
    "intern",
    "junior",
    "mid",
    "senior",
    "staff",
    "principal",
    "lead",
    "manager",
    "unknown",
  ].includes(String(value));
}

function isWorkArrangement(
  value: unknown
): value is WorkArrangement {
  return [
    "b2b_possible",
    "employment_only",
    "unknown",
  ].includes(String(value));
}

function isRecommendation(
  value: unknown
): value is MatchRecommendation {
  return [
    "strong_match",
    "good_match",
    "possible_match",
    "weak_match",
  ].includes(String(value));
}

function validateAnalysis(
  value: unknown
): JobAnalysis {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "Invalid job analysis: expected object"
    );
  }

  const data = value as Record<
    string,
    any
  >;

  if (
    !isNumber(data.overallScore) ||
    data.overallScore < 0 ||
    data.overallScore > 100
  ) {
    throw new Error(
      "Invalid overallScore"
    );
  }

  if (
    !data.skills ||
    typeof data.skills !== "object"
  ) {
    throw new Error(
      "Invalid skills analysis"
    );
  }

  if (
    !isNumber(data.skills.score) ||
    data.skills.score < 0 ||
    data.skills.score > 100
  ) {
    throw new Error(
      "Invalid skills.score"
    );
  }

  if (
    !isStringArray(
      data.skills.matched
    )
  ) {
    throw new Error(
      "Invalid skills.matched"
    );
  }

  if (
    !isStringArray(
      data.skills.missingRequired
    )
  ) {
    throw new Error(
      "Invalid skills.missingRequired"
    );
  }

  if (
    !isStringArray(
      data.skills.missingPreferred
    )
  ) {
    throw new Error(
      "Invalid skills.missingPreferred"
    );
  }

  if (
    !data.experience ||
    typeof data.experience !== "object"
  ) {
    throw new Error(
      "Invalid experience analysis"
    );
  }

  if (
    !isNumber(
      data.experience.score
    ) ||
    data.experience.score < 0 ||
    data.experience.score > 100
  ) {
    throw new Error(
      "Invalid experience.score"
    );
  }

  if (
    data.experience.requiredYears !== null &&
    !isNumber(
      data.experience.requiredYears
    )
  ) {
    throw new Error(
      "Invalid experience.requiredYears"
    );
  }

  if (
    !isNumber(
      data.experience.candidateYears
    )
  ) {
    throw new Error(
      "Invalid experience.candidateYears"
    );
  }

  if (
    !data.seniority ||
    typeof data.seniority !== "object"
  ) {
    throw new Error(
      "Invalid seniority analysis"
    );
  }

  if (
    !isSeniorityLevel(
      data.seniority.required
    )
  ) {
    throw new Error(
      "Invalid seniority.required"
    );
  }

  if (
    !isSeniorityLevel(
      data.seniority.candidate
    )
  ) {
    throw new Error(
      "Invalid seniority.candidate"
    );
  }

  if (
    typeof data.seniority.match !==
    "boolean"
  ) {
    throw new Error(
      "Invalid seniority.match"
    );
  }

  if (
    !data.workArrangement ||
    typeof data.workArrangement !==
      "object"
  ) {
    throw new Error(
      "Invalid workArrangement"
    );
  }

  if (
    !isWorkArrangement(
      data.workArrangement.type
    )
  ) {
    throw new Error(
      "Invalid workArrangement.type"
    );
  }

  if (
    !isStringArray(
      data.workArrangement.restrictions
    )
  ) {
    throw new Error(
      "Invalid workArrangement.restrictions"
    );
  }

  if (
    !isStringArray(
      data.blockers
    )
  ) {
    throw new Error(
      "Invalid blockers"
    );
  }

  if (
    !isRecommendation(
      data.recommendation
    )
  ) {
    throw new Error(
      "Invalid recommendation"
    );
  }

  if (
    typeof data.reasoning !== "string"
  ) {
    throw new Error(
      "Invalid reasoning"
    );
  }

  if (!data.reasoning.trim()) {
    throw new Error(
      "Invalid reasoning: reasoning cannot be empty"
    );
  }

  return data as JobAnalysis;
}

/**
 * Seniority levels the candidate is interested in.
 */
const ACCEPTED_SENIORITY: SeniorityLevel[] = [
  "mid",
  "senior",
  "principal",
  "lead",
];

/**
 * Infer explicit seniority directly from the job title.
 *
 * This is deterministic and therefore more reliable than
 * asking the LLM to interpret an obvious title such as:
 *
 * "Senior Software Engineer"
 */
export function inferSeniorityFromTitle(
  title: string
): SeniorityLevel | null {
  const normalized = title
    .trim()
    .toLowerCase();

  /*
   * Check manager before senior because titles such as
   * "Senior Engineering Manager" are still manager roles.
   */
  if (
    normalized.includes(
      "engineering manager"
    ) ||
    normalized.includes(
      "software engineering manager"
    ) ||
    normalized.includes(
      "manager, software"
    ) ||
    normalized.includes(
      "manager software"
    )
  ) {
    return "manager";
  }

  if (
    normalized.includes("intern") ||
    normalized.includes("internship")
  ) {
    return "intern";
  }

  if (
    normalized.includes("junior") ||
    normalized.includes("jr.") ||
    normalized.includes("jr ")
  ) {
    return "junior";
  }

  if (normalized.includes("staff")) {
    return "staff";
  }

  if (normalized.includes("principal")) {
    return "principal";
  }

  if (normalized.includes("lead")) {
    return "lead";
  }

  if (
    normalized.includes("senior") ||
    normalized.includes("sr.") ||
    normalized.includes("sr ")
  ) {
    return "senior";
  }
  /*
 * Level II engineering titles are treated as mid-level.
 *
 * Examples:
 * - Software Engineer II
 * - Software Developer II
 * - Backend Engineer II
 * - Frontend Engineer II
 * - Full-Stack Engineer II
 *
 * Engineer III is intentionally not inferred here because
 * company leveling systems differ significantly.
 */
if (
  /\b(?:software|backend|frontend|full[- ]?stack)\s+(?:engineer|developer)\s+ii\b/i.test(
    normalized
  )
) {
  return "mid";
}
  if (
    normalized.includes("mid-level") ||
    normalized.includes("mid level") ||
    normalized.includes("midlevel")
  ) {
    return "mid";
  }

  return null;
}

/**
 * Recommendation is derived from overallScore so the model
 * cannot return combinations such as:
 *
 * overallScore: 90
 * recommendation: "possible_match"
 */
function recommendationFromScore(
  score: number
): MatchRecommendation {
  if (score >= 85) {
    return "strong_match";
  }

  if (score >= 70) {
    return "good_match";
  }

  if (score >= 50) {
    return "possible_match";
  }

  return "weak_match";
}

function normalizeSkill(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

/**
 * Bedrock is not allowed to invent candidate skills.
 *
 * Every returned matched skill must exist in
 * profile.skills.
 *
 * Example:
 *
 * profile:
 *   CI/CD
 *
 * model:
 *   GitHub Actions
 *
 * result:
 *   GitHub Actions is removed.
 */
function sanitizeMatchedSkills(
  matched: string[],
  profile: CandidateProfile
): string[] {
  const candidateSkills = new Map<
    string,
    string
  >(
    profile.skills.map((skill) => [
      normalizeSkill(skill),
      skill,
    ])
  );

  const sanitized: string[] = [];
  const seen = new Set<string>();

  for (const skill of matched) {
    const normalized =
      normalizeSkill(skill);

    const candidateSkill =
      candidateSkills.get(normalized);

    if (!candidateSkill) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    sanitized.push(candidateSkill);
  }

  return sanitized;
}

type ExplicitLocationRestriction = {
  text: string;
  locationText: string;
  kind: "residency" | "based_in";
};

function stripHtml(
  value: string
): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectExplicitLocationRestriction(
  job: Job
): ExplicitLocationRestriction | null {
  if (!job.description) {
    return null;
  }

  const description = stripHtml(
    job.description
  );

  const residingMatch = description.match(
    /(?:open|available)\s+only\s+to\s+candidates\s+(?:who\s+are\s+)?residing\s+in\s+([^.!?]+)/i
  );

  if (residingMatch?.[1]) {
    const locationText =
      residingMatch[1].trim();

    return {
      text:
        `Role is restricted to candidates residing in ${locationText}`,
      locationText,
      kind: "residency",
    };
  }

  const mustResideMatch = description.match(
    /must\s+(?:currently\s+)?reside\s+in\s+([^.!?]+)/i
  );

  if (mustResideMatch?.[1]) {
    const locationText =
      mustResideMatch[1].trim();

    return {
      text:
        `Candidate must reside in ${locationText}`,
      locationText,
      kind: "residency",
    };
  }

  const requireBasedMatch = description.match(
    /require\s+that\s+someone\s+is\s+based\s+in\s+([^.!?]+)/i
  );

  if (requireBasedMatch?.[1]) {
    const locationText =
      requireBasedMatch[1].trim();

    return {
      text:
        `Candidate must be based in ${locationText}`,
      locationText,
      kind: "based_in",
    };
  }

  const basedInMatch = description.match(
    /must\s+(?:be\s+)?based\s+in\s+([^.!?]+)/i
  );

  if (basedInMatch?.[1]) {
    const locationText =
      basedInMatch[1].trim();

    return {
      text:
        `Candidate must be based in ${locationText}`,
      locationText,
      kind: "based_in",
    };
  }

  /*
   * Some remote-first postings describe the geographic
   * restriction indirectly:
   *
   * "Most roles can be done from almost anywhere within
   * the country of employment."
   *
   * This sentence is only actionable when the vacancy
   * itself names a country (for example "Remote Canada").
   * We deliberately do NOT infer a restriction from a
   * generic "Remote" location.
   */
  const withinCountryOfEmployment =
    /\bwithin\s+the\s+country\s+of\s+employment\b/i.test(
      description
    );

  if (withinCountryOfEmployment) {
    const jobLocation =
      normalizeLocationText(
        job.location ?? ""
      ).replace(
        /\bus\b/g,
        "united states"
      );

    const knownCountries = [
      "spain",
      "canada",
      "united states",
      "united kingdom",
      "poland",
      "germany",
      "france",
      "italy",
      "portugal",
      "ireland",
    ];

    const country =
      knownCountries.find(
        (candidateCountry) =>
          jobLocation.includes(
            candidateCountry
          )
      );

    if (country) {
      return {
        text:
          `Role is restricted to the country of employment: ${country}`,
        locationText: country,
        kind: "based_in",
      };
    }
  }

  return null;
}

function normalizeLocationText(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\bunited states of america\b/g, "united states")
    .replace(/\bu\.s\.a\.\b/g, "united states")
    .replace(/\busa\b/g, "united states")
    .replace(/\bu\.s\.\b/g, "united states")
    .replace(/\buk\b/g, "united kingdom")
    .replace(/\s+/g, " ");
}

const COUNTRY_REGION_HINTS: Record<
  string,
  string[]
> = {
  canada: [
    "alberta",
    "british columbia",
    "manitoba",
    "new brunswick",
    "newfoundland and labrador",
    "nova scotia",
    "ontario",
    "prince edward island",
    "quebec",
    "saskatchewan",
  ],
};

function inferRestrictionCountry(
  restriction: ExplicitLocationRestriction,
  job: Job
): string | null {
  const restrictionText =
    normalizeLocationText(
      restriction.locationText
    );

  const knownCountries = [
    "spain",
    "canada",
    "united states",
    "united kingdom",
    "poland",
    "germany",
    "france",
    "italy",
    "portugal",
    "ireland",
  ];

  for (const country of knownCountries) {
    if (restrictionText.includes(country)) {
      return country;
    }
  }

  for (
    const [country, regions]
    of Object.entries(COUNTRY_REGION_HINTS)
  ) {
    if (
      regions.some((region) =>
        restrictionText.includes(region)
      )
    ) {
      return country;
    }
  }

  const jobLocation =
    normalizeLocationText(
      job.location ?? ""
    );

  for (const country of knownCountries) {
    if (jobLocation.includes(country)) {
      return country;
    }
  }

  return null;
}

export function candidateSatisfiesLocationRestriction(
  restriction: ExplicitLocationRestriction,
  job: Job,
  profile: CandidateProfile
): boolean | null {
  const candidateCountry =
    normalizeLocationText(
      profile.location.country
    );

  const restrictionCountry =
    inferRestrictionCountry(
      restriction,
      job
    );

  if (!restrictionCountry) {
    return null;
  }

  return (
    candidateCountry ===
    restrictionCountry
  );
}

function addUnique(
  values: string[],
  value: string
): void {
  const normalized = value
    .trim()
    .toLowerCase();

  const exists = values.some(
    (existing) =>
      existing
        .trim()
        .toLowerCase() === normalized
  );

  if (!exists) {
    values.push(value);
  }
}

function sanitizeUnknownWorkReasoning(
  reasoning: string
): string {
  const sentences = reasoning
    .split(/(?<=[.!?])\\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const forbiddenPatterns = [
    /\\bno (?:explicit )?(?:location|authorization|work[- ]authorization|legal|residency|employment) (?:barriers|restrictions|constraints|blockers)\\b/i,
    /\\bthere (?:are|is) no (?:explicit )?(?:location|authorization|work[- ]authorization|legal|residency|employment) (?:barriers|restrictions|constraints|blockers)\\b/i,
    /\\bdoes not preclude (?:a |an )?(?:contractor|b2b|international contractor) arrangement\\b/i,
    /\\binternational (?:b2b|contractor) (?:work|engagement|arrangement) is (?:allowed|supported|possible)\\b/i,
    /\\bthe candidate (?:can|is eligible to) work (?:in|for)\\b/i,
  ];

  return sentences
    .filter(
      (sentence) =>
        !forbiddenPatterns.some(
          (pattern) => pattern.test(sentence)
        )
    )
    .join(" ")
    .trim();
}
/* */
export type DeterministicWorkArrangement = {
  type: WorkArrangement;
  evidence: string[];
};

export function detectWorkArrangement(
  description: string | null
): DeterministicWorkArrangement {
  if (!description) {
    return {
      type: "unknown",
      evidence: [],
    };
  }

  const text = stripHtml(description)
    .toLowerCase();

  const b2bPatterns: Array<{
    pattern: RegExp;
    evidence: string;
  }> = [
    {
      pattern: /\bindependent contractor\b/i,
      evidence: "independent contractor",
    },
    {
      pattern: /\binternational contractors?\b/i,
      evidence: "international contractor",
    },
    {
      pattern: /\bb2b\b/i,
      evidence: "B2B",
    },
    {
      pattern: /\bemployer of record\b|\beor\b/i,
      evidence: "EOR",
    },
    {
      pattern: /\bwork from anywhere\b/i,
      evidence: "work from anywhere",
    },
    {
      pattern: /\bworldwide remote\b|\bremote worldwide\b/i,
      evidence: "worldwide remote",
    },
  ];

  const employmentOnlyPatterns: Array<{
    pattern: RegExp;
    evidence: string;
  }> = [
    {
      pattern: /\bemployment only\b/i,
      evidence: "employment only",
    },
    {
      pattern: /\bemployees? only\b/i,
      evidence: "employees only",
    },
    {
      pattern: /\bno (?:independent )?contractors?\b/i,
      evidence: "contractors not accepted",
    },
    {
      pattern: /\bcontractors? (?:are|is) not (?:accepted|eligible|permitted|allowed)\b/i,
      evidence: "contractors not accepted",
    },
    {
      pattern: /\bmust (?:be|join as) (?:a |an )?(?:full[- ]time )?employee\b/i,
      evidence: "employee status required",
    },
  ];

  const b2bEvidence = b2bPatterns
    .filter(({ pattern }) =>
      pattern.test(text)
    )
    .map(({ evidence }) => evidence);

  const employmentEvidence =
    employmentOnlyPatterns
      .filter(({ pattern }) =>
        pattern.test(text)
      )
      .map(({ evidence }) => evidence);

  if (
    b2bEvidence.length > 0 &&
    employmentEvidence.length === 0
  ) {
    return {
      type: "b2b_possible",
      evidence: b2bEvidence,
    };
  }

  if (
    employmentEvidence.length > 0 &&
    b2bEvidence.length === 0
  ) {
    return {
      type: "employment_only",
      evidence: employmentEvidence,
    };
  }

  return {
    type: "unknown",
    evidence: [
      ...b2bEvidence,
      ...employmentEvidence,
    ],
  };
}

export type ExplicitWorkAuthorizationRestriction = {
  text: string;
  country: "united states" | null;
};

export function detectExplicitWorkAuthorizationRestriction(
  description: string | null
): ExplicitWorkAuthorizationRestriction | null {
  if (!description) {
    return null;
  }

  const text = stripHtml(description);

  const usPatterns = [
    /must (?:be )?(?:currently )?authorized to work in (?:the )?(?:united states|u\.s\.|us)/i,
    /(?:united states|u\.s\.|us) work authorization (?:is )?required/i,
    /must have (?:the )?right to work in (?:the )?(?:united states|u\.s\.|us)/i,
    /must be legally authorized to work in (?:the )?(?:united states|u\.s\.|us)/i,
  ];

  if (
    usPatterns.some((pattern) =>
      pattern.test(text)
    )
  ) {
    return {
      text:
        "US work authorization is explicitly required",
      country: "united states",
    };
  }

  return null;
}

export function extractRequiredYears(
  description: string | null
): number | null {
  if (!description) {
    return null;
  }

  const text = stripHtml(description)
    .toLowerCase()
    .replace(/[–—]/g, "-");

  const patterns: RegExp[] = [
    // "4+ years", "1.5+ years"
    /\b(\d+(?:\.\d+)?)\s*\+\s*years?\b/i,

    // "at least 4 years"
    /\bat least\s+(\d+(?:\.\d+)?)\s+years?\b/i,

    // "minimum of 4 years"
    /\bminimum\s+(?:of\s+)?(\d+(?:\.\d+)?)\s+years?\b/i,

    // "minimum 4 years"
    /\bminimum\s+(\d+(?:\.\d+)?)\s+years?\b/i,
  ];

  const matches: number[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(
      new RegExp(pattern.source, "gi")
    )) {
      const rawValue = match[1];

      if (!rawValue) {
        continue;
      }

      const value = Number.parseFloat(
        rawValue
      );

      if (
        Number.isFinite(value) &&
        value >= 0
      ) {
        matches.push(value);
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  return Math.max(...matches);
}

/**
 * Apply deterministic corrections after the LLM response.
 *
 * LLM:
 *   semantic interpretation
 *
 * Code:
 *   invariants and facts that should never randomly change
 */
export function postProcessAnalysis(
  analysis: JobAnalysis,
  job: Job,
  profile: CandidateProfile
): JobAnalysis {
  const result: JobAnalysis = {
    ...analysis,

    skills: {
      ...analysis.skills,

      matched: sanitizeMatchedSkills(
        analysis.skills.matched,
        profile
      ),
    },

    experience: {
      ...analysis.experience,

      // This comes from our profile, not from the model.
      candidateYears:
        profile.yearsOfExperience,
    },

    seniority: {
      ...analysis.seniority,

      // This also comes from our profile.
      candidate: profile.seniority,
    },

    workArrangement: {
      ...analysis.workArrangement,

      restrictions: [
        ...analysis.workArrangement
          .restrictions,
      ],
    },

    blockers: [
      ...analysis.blockers,
    ],
  };

  /*
   * -----------------------------------------
   * Required years of experience
   * -----------------------------------------
   *
   * Explicit numeric requirements in the JD
   * take precedence over LLM extraction.
   */

  const deterministicRequiredYears =
    extractRequiredYears(
      job.description
    );

  if (
    deterministicRequiredYears !== null
  ) {
    result.experience.requiredYears =
      deterministicRequiredYears;
  }

  /*
   * -----------------------------------------
   * Seniority
   * -----------------------------------------
   */

  const titleSeniority =
    inferSeniorityFromTitle(job.title);

  if (titleSeniority) {
    result.seniority.required =
      titleSeniority;

    result.seniority.match =
      ACCEPTED_SENIORITY.includes(
        titleSeniority
      );
  }

  /*
   * -----------------------------------------
   * Explicit location restrictions
   * -----------------------------------------
   */

  const explicitLocationRestriction =
    detectExplicitLocationRestriction(job);

  let locationRequirementSatisfied:
    boolean | null = null;

  if (explicitLocationRestriction) {
    addUnique(
      result.workArrangement.restrictions,
      explicitLocationRestriction.text
    );

    locationRequirementSatisfied =
      candidateSatisfiesLocationRestriction(
        explicitLocationRestriction,
        job,
        profile
      );

    if (
      locationRequirementSatisfied === false
    ) {
      addUnique(
        result.blockers,
        [
          "Explicit location/residency requirement",
          "is not satisfied:",
          explicitLocationRestriction.text,
        ].join(" ")
      );
    }
  }

  /*
   * -----------------------------------------
   * Deterministic work arrangement
   * -----------------------------------------
   */

  const deterministicWorkArrangement =
    detectWorkArrangement(
      job.description
    );

  /*
   * The deterministic classifier is authoritative.
   *
   * Positive B2B/employment classifications require
   * explicit evidence in the job description. If no such
   * evidence exists, an optimistic LLM classification must
   * be downgraded to unknown.
   */
  result.workArrangement.type =
    deterministicWorkArrangement.type;

  for (
    const evidence
    of deterministicWorkArrangement.evidence
  ) {
    addUnique(
      result.workArrangement.restrictions,
      `Work-arrangement evidence: ${evidence}`
    );
  }

  /*
   * -----------------------------------------
   * Explicit work authorization
   * -----------------------------------------
   */

  const authorizationRestriction =
    detectExplicitWorkAuthorizationRestriction(
      job.description
    );

  if (authorizationRestriction) {
    addUnique(
      result.workArrangement.restrictions,
      authorizationRestriction.text
    );

    if (
      authorizationRestriction.country ===
        "united states" &&
      !profile.workPreferences
        .hasUSWorkAuthorization
    ) {
      addUnique(
        result.blockers,
        authorizationRestriction.text
      );
    }
  }

  /*
   * -----------------------------------------
   * Unknown work-arrangement reasoning guard
   * -----------------------------------------
   *
   * If eligibility is unknown, absence of an
   * explicit restriction must not be rewritten
   * as positive evidence of eligibility.
   */

  if (
    result.workArrangement.type === "unknown"
  ) {
    result.reasoning =
      sanitizeUnknownWorkReasoning(
        result.reasoning
      );

    const uncertaintySentence =
      explicitLocationRestriction &&
      locationRequirementSatisfied === false
        ? [
            "The posting contains an explicit",
            "location or residency requirement",
            "that the candidate does not satisfy.",
          ].join(" ")
        : explicitLocationRestriction &&
            locationRequirementSatisfied === true
          ? [
              "The candidate satisfies the explicit",
              "location or residency requirement,",
              "but the posting does not explicitly confirm",
              "international B2B or contractor eligibility,",
              "so work-arrangement eligibility remains uncertain.",
            ].join(" ")
          : explicitLocationRestriction
            ? [
                "The posting contains an explicit",
                "location or residency requirement,",
                "and the available location data is not",
                "sufficient to verify whether the candidate",
                "satisfies it.",
              ].join(" ")
            : [
                "The posting does not explicitly confirm",
                "international B2B or contractor eligibility,",
                "so work-arrangement eligibility remains uncertain.",
              ].join(" ");

    const normalizedReasoning =
      result.reasoning.toLowerCase();

    if (
      !normalizedReasoning.includes(
        "eligibility remains uncertain"
      ) &&
      !normalizedReasoning.includes(
        "eligibility depends"
      ) &&
      !normalizedReasoning.includes(
        "does not satisfy"
      ) &&
      !normalizedReasoning.includes(
        "not sufficient to verify"
      )
    ) {
      result.reasoning =
        `${result.reasoning} ${uncertaintySentence}`
          .trim();
    }
  }

  /*
   * -----------------------------------------
   * Recommendation
   * -----------------------------------------
   */

  result.recommendation =
    recommendationFromScore(
      result.overallScore
    );

  /*
   * -----------------------------------------
   * LLM sanity checks
   * -----------------------------------------
   */

  if (
    result.skills.matched.length > 0 &&
    result.skills.score === 0
  ) {
    throw new Error(
      [
        "Inconsistent Bedrock analysis:",
        "skills.score is 0",
        `but ${result.skills.matched.length}`,
        "matched skills were returned.",
      ].join(" ")
    );
  }

  if (
    result.experience.candidateYears > 0 &&
    result.experience.score === 0
  ) {
    throw new Error(
      [
        "Inconsistent Bedrock analysis:",
        "experience.score is 0",
        "but candidate has",
        `${result.experience.candidateYears}`,
        "years of experience.",
      ].join(" ")
    );
  }

  if (!result.reasoning.trim()) {
    throw new Error(
      "Inconsistent Bedrock analysis: reasoning is empty"
    );
  }

  return result;
}

export async function analyzeJob(
  job: Job,
  profile: CandidateProfile
): Promise<JobAnalysis> {
  const prompt = buildPrompt(
    job,
    profile
  );

  const response =
    await askBedrock(prompt);

  const parsed =
    parseModelJson(response.text);

  const validated =
    validateAnalysis(parsed);

  return postProcessAnalysis(
    validated,
    job,
    profile
  );
}