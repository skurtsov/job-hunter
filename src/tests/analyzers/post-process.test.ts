import test from "node:test";
import assert from "node:assert/strict";

import {
  postProcessAnalysis,
  type JobAnalysis,
} from "../../analyzers/job-analyzer.js";
import {
  CANDIDATE_PROFILE,
} from "../../config/candidate-profile.js";
import type { Job } from "../../types.js";

function makeJob(
  overrides: Partial<Job> = {}
): Job {
  return {
    externalId: "test-job",
    company: "Example",
    title: "Senior Software Engineer",
    location: "Remote US",
    description:
      "Build backend systems with TypeScript.",
    applyUrl: "https://example.com/apply",
    source: "greenhouse",
    publishedAt: null,
    ...overrides,
  };
}

function makeAnalysis(
  overrides: Partial<JobAnalysis> = {}
): JobAnalysis {
  return {
    overallScore: 80,
    skills: {
      score: 80,
      matched: ["TypeScript"],
      missingRequired: [],
      missingPreferred: [],
    },
    experience: {
      score: 90,
      requiredYears: null,
      candidateYears: 999,
    },
    seniority: {
      required: "unknown",
      candidate: "junior",
      match: true,
    },
    workArrangement: {
      type: "unknown",
      restrictions: [],
    },
    blockers: [],
    recommendation: "weak_match",
    reasoning:
      "The candidate has relevant backend experience.",
    ...overrides,
  };
}

test(
  "post-processing downgrades unsupported LLM B2B claim to unknown",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis({
        workArrangement: {
          type: "b2b_possible",
          restrictions: [],
        },
        reasoning:
          "International B2B is supported and there are no authorization barriers.",
      }),
      makeJob({
        location: "Remote US",
        description:
          "Remote US software engineering role.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.workArrangement.type,
      "unknown"
    );
    assert.equal(
      result.blockers.length,
      0
    );
    assert.match(
      result.reasoning,
      /eligibility remains uncertain/i
    );
  }
);

test(
  "post-processing uses explicit B2B evidence",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis(),
      makeJob({
        description:
          "This role is available as an independent contractor.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.workArrangement.type,
      "b2b_possible"
    );
    assert.ok(
      result.workArrangement.restrictions.some(
        (value) =>
          /independent contractor/i.test(
            value
          )
      )
    );
  }
);

test(
  "post-processing uses explicit employment-only evidence",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis({
        workArrangement: {
          type: "b2b_possible",
          restrictions: [],
        },
      }),
      makeJob({
        description:
          "This position is employment only.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.workArrangement.type,
      "employment_only"
    );
  }
);

test(
  "explicit US authorization requirement becomes blocker",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis(),
      makeJob({
        location: "Remote US",
        description:
          "Must be authorized to work in the United States.",
      }),
      CANDIDATE_PROFILE
    );

    assert.ok(
      result.blockers.some(
        (value) =>
          /US work authorization is explicitly required/i.test(
            value
          )
      )
    );
    assert.ok(
      result.workArrangement.restrictions.some(
        (value) =>
          /US work authorization is explicitly required/i.test(
            value
          )
      )
    );
  }
);

test(
  "Remote US alone creates neither authorization blocker nor B2B evidence",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis({
        workArrangement: {
          type: "b2b_possible",
          restrictions: [],
        },
      }),
      makeJob({
        location: "Remote US",
        description:
          "Remote US software engineering role.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.workArrangement.type,
      "unknown"
    );
    assert.equal(
      result.blockers.length,
      0
    );
  }
);

test(
  "Spain based requirement is satisfied without blocker",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis(),
      makeJob({
        location: "Remote Spain",
        description:
          "Candidates must be based in Spain.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.blockers.length,
      0
    );
    assert.ok(
      result.workArrangement.restrictions.some(
        (value) =>
          /based in Spain/i.test(value)
      )
    );
  }
);

test(
  "Canada residency requirement becomes blocker for Spain candidate",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis(),
      makeJob({
        location: "Remote Canada",
        description:
          "Candidates must reside in Canada.",
      }),
      CANDIDATE_PROFILE
    );

    assert.ok(
      result.blockers.some(
        (value) =>
          /location\/residency requirement/i.test(
            value
          )
      )
    );
  }
);

test(
  "title and explicit years override incorrect LLM values",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis({
        experience: {
          score: 90,
          requiredYears: 2,
          candidateYears: 999,
        },
        seniority: {
          required: "junior",
          candidate: "junior",
          match: false,
        },
      }),
      makeJob({
        title:
          "Software Engineer II, Backend",
        description:
          "Requires 4+ years of software engineering experience.",
      }),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.experience.requiredYears,
      4
    );
    assert.equal(
      result.experience.candidateYears,
      CANDIDATE_PROFILE.yearsOfExperience
    );
    assert.equal(
      result.seniority.required,
      "mid"
    );
    assert.equal(
      result.seniority.candidate,
      CANDIDATE_PROFILE.seniority
    );
    assert.equal(
      result.seniority.match,
      true
    );
  }
);

test(
  "recommendation is derived from final score",
  () => {
    const result = postProcessAnalysis(
      makeAnalysis({
        overallScore: 91,
        recommendation:
          "weak_match",
      }),
      makeJob(),
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.recommendation,
      "strong_match"
    );
  }
);


test(
  "technical match stays strong while explicit location restriction marks role ineligible",
  () => {
    const job = makeJob({
      title: "Senior Software Engineer",
      location: "Remote Canada",
      description:
        "Candidates must reside in Canada.",
    });

    const result = postProcessAnalysis(
      makeAnalysis({
        overallScore: 91,
      }),
      job,
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.recommendation,
      "strong_match"
    );
    assert.equal(
      result.eligibility?.status,
      "ineligible"
    );
    assert.ok(
      result.eligibility?.reasons.some(
        (reason) =>
          reason.includes("Canada")
      )
    );
  }
);

test(
  "absence of deterministic eligibility blocker remains uncertain",
  () => {
    const job = makeJob({
      title: "Senior Software Engineer",
      location: "Remote",
      description:
        "Remote software engineering role.",
    });

    const result = postProcessAnalysis(
      makeAnalysis({
        overallScore: 90,
      }),
      job,
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.recommendation,
      "strong_match"
    );
    assert.deepEqual(
      result.eligibility,
      {
        status: "uncertain",
        reasons: [],
      }
    );
  }
);

test(
  "explicit US authorization requirement marks role ineligible without changing technical recommendation",
  () => {
    const job = makeJob({
      title: "Senior Software Engineer",
      location: "Remote US",
      description:
        "Must be authorized to work in the United States.",
    });

    const result = postProcessAnalysis(
      makeAnalysis({
        overallScore: 88,
      }),
      job,
      CANDIDATE_PROFILE
    );

    assert.equal(
      result.recommendation,
      "strong_match"
    );
    assert.equal(
      result.eligibility?.status,
      "ineligible"
    );
    assert.ok(
      result.eligibility?.reasons.includes(
        "US work authorization is explicitly required"
      )
    );
  }
);
