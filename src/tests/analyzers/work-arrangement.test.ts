import test from "node:test";
import assert from "node:assert/strict";

import {
  detectExplicitWorkAuthorizationRestriction,
  detectWorkArrangement,
} from "../../analyzers/job-analyzer.js";

const arrangementCases = [
  {
    description:
      "This role is available as an independent contractor.",
    expected: "b2b_possible",
  },
  {
    description:
      "We work with international contractors across Europe.",
    expected: "b2b_possible",
  },
  {
    description:
      "The engagement is B2B.",
    expected: "b2b_possible",
  },
  {
    description:
      "Candidates may be hired through an Employer of Record (EOR).",
    expected: "b2b_possible",
  },
  {
    description:
      "This is a work from anywhere role.",
    expected: "b2b_possible",
  },
  {
    description:
      "This position is employment only.",
    expected: "employment_only",
  },
  {
    description:
      "You must be a full-time employee.",
    expected: "employment_only",
  },
  {
    description:
      "Remote US software engineering role.",
    expected: "unknown",
  },
  {
    description:
      "Remote Canada. Competitive salary and benefits.",
    expected: "unknown",
  },
  {
    description: null,
    expected: "unknown",
  },
] as const;

for (const testCase of arrangementCases) {
  test(
    `work arrangement -> ${testCase.expected}: ${testCase.description ?? "empty"}`,
    () => {
      assert.equal(
        detectWorkArrangement(
          testCase.description
        ).type,
        testCase.expected
      );
    }
  );
}

test(
  "conflicting work-arrangement evidence remains unknown",
  () => {
    const result =
      detectWorkArrangement(
        "B2B is mentioned, but this position is employment only."
      );

    assert.equal(
      result.type,
      "unknown"
    );

    assert.ok(
      result.evidence.length >= 2
    );
  }
);

const authorizationCases = [
  "Must be authorized to work in the United States.",
  "US work authorization required.",
  "Must have the right to work in the US.",
  "Must be legally authorized to work in the U.S.",
];

for (const description of authorizationCases) {
  test(
    `detects explicit US work authorization: ${description}`,
    () => {
      const result =
        detectExplicitWorkAuthorizationRestriction(
          description
        );

      assert.ok(result);
      assert.equal(
        result.country,
        "united states"
      );
    }
  );
}

test(
  "Remote US alone is not a work authorization restriction",
  () => {
    assert.equal(
      detectExplicitWorkAuthorizationRestriction(
        "Location: Remote US"
      ),
      null
    );
  }
);

test(
  "US salary and benefits do not imply work authorization",
  () => {
    assert.equal(
      detectExplicitWorkAuthorizationRestriction(
        "Remote role with USD compensation and US benefits."
      ),
      null
    );
  }
);
