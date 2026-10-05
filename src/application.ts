import { CANDIDATE_PROFILE } from "./config/candidate-profile.js";
import { readGreenhouseApplication } from "./applications/greenhouse-form-reader.js";
import { analyzeApplication } from "./applications/application-analyzer.js";
import { writeApplicationHtml } from "./output/application-html-writer.js";

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    throw new Error(
      'Usage: npm run application -- "https://job-boards.greenhouse.io/company/jobs/123456"'
    );
  }

  console.log("Reading application form...");
  const form = await readGreenhouseApplication(url);

  console.log(
    `Found ${form.questions.length} questions for ${form.company} — ${form.title}`
  );

  console.log("Generating application strategy with Bedrock...");
  const analysis = await analyzeApplication(
    form,
    CANDIDATE_PROFILE
  );

  const output = await writeApplicationHtml(
    form,
    analysis
  );

  console.log(`Application report: ${output}`);
  if (analysis.aiRestrictionDetected) {
    console.log(
      "AI-content restriction detected: restricted answers are talking points only."
    );
  }
}

main().catch((error) => {
  console.error("\nApplication assistant failed:");
  console.error(error);
  process.exitCode = 1;
});
