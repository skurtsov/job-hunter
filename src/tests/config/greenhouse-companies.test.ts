import assert from "node:assert/strict";
import test from "node:test";

import {
  GREENHOUSE_COMPANIES,
} from "../../config/greenhouse-companies.js";

test("Greenhouse company config has unique board tokens", () => {
  const tokens = GREENHOUSE_COMPANIES.map(
    (source) => source.boardToken
  );

  assert.equal(
    new Set(tokens).size,
    tokens.length
  );
});

test("Greenhouse company config has unique company names", () => {
  const companies = GREENHOUSE_COMPANIES.map(
    (source) => source.company
  );

  assert.equal(
    new Set(companies).size,
    companies.length
  );
});

test("Greenhouse company config contains no blank values", () => {
  for (const source of GREENHOUSE_COMPANIES) {
    assert.ok(source.boardToken.trim());
    assert.ok(source.company.trim());
  }
});
