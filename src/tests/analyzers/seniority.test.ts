import {
  inferSeniorityFromTitle,
} from "../../analyzers/job-analyzer.js";

const tests = [
  {
    title: "Software Engineer II",
    expected: "mid",
  },
  {
    title: "Software Engineer II, Backend",
    expected: "mid",
  },
  {
    title: "Backend Engineer II",
    expected: "mid",
  },
  {
    title: "Frontend Engineer II",
    expected: "mid",
  },
  {
    title: "Full-Stack Engineer II",
    expected: "mid",
  },
  {
    title: "Senior Software Engineer",
    expected: "senior",
  },
  {
    title: "Principal Software Engineer",
    expected: "principal",
  },
  {
    title: "Lead Software Engineer",
    expected: "lead",
  },
  {
    title: "Software Engineer III",
    expected: null,
  },
];

console.log(
  "\n================================"
);
console.log("SENIORITY TESTS");
console.log(
  "================================"
);

for (const test of tests) {
  const result =
    inferSeniorityFromTitle(
      test.title
    );

  const passed =
    result === test.expected;

  console.log(
    `\n${passed ? "✅" : "❌"} ${test.title}`
  );
  console.log("Result:", result);
  console.log(
    "Expected:",
    test.expected
  );
}