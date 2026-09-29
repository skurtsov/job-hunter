import {
  extractRequiredYears,
} from "../../analyzers/job-analyzer.js";

const tests = [
  {
    text: "Requires 4+ years of software engineering experience.",
    expected: 4,
  },
  {
    text: "You have 1.5+ years of professional experience.",
    expected: 1.5,
  },
  {
    text: "At least 5 years of backend development experience.",
    expected: 5,
  },
  {
    text: "Minimum of 3 years of experience with Node.js.",
    expected: 3,
  },
  {
    text: "Minimum 6 years of professional software development.",
    expected: 6,
  },
  {
    text: "Strong professional software engineering experience.",
    expected: null,
  },
  {
    text: "We are looking for an experienced engineer.",
    expected: null,
  },
  {
    text: "",
    expected: null,
  },
];

console.log(
  "\n================================"
);
console.log("REQUIRED YEARS TESTS");
console.log(
  "================================"
);

for (const test of tests) {
  const result =
    extractRequiredYears(
      test.text
    );

  const passed =
    result === test.expected;

  console.log(
    `\n${passed ? "✅" : "❌"} ${test.text}`
  );

  console.log(
    "Result:",
    result
  );

  console.log(
    "Expected:",
    test.expected
  );
}