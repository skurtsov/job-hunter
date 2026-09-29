import { collectGreenhouseJobs } from "../collectors/greenhouse.js";
import { filterJobs } from "../filters/job-filter.js";
import { analyzeJob } from "./job-analyzer.js";
import { CANDIDATE_PROFILE } from "../config/candidate-profile.js";

import {
  saveAnalyzedJobs,
  type AnalyzedJob,
} from "../output/json-writer.js";

async function main() {
  console.log("Collecting jobs...");

  const jobs = await collectGreenhouseJobs(
    "affirm",
    "Affirm"
  );

  const filteredJobs = filterJobs(jobs);

  console.log(`Total jobs: ${jobs.length}`);
  console.log(
    `Role matched: ${filteredJobs.length}`
  );

  const job = filteredJobs.find((job) =>
    job.title.includes(
      "Lake Analytics Platform"
    )
  );

  if (!job) {
    throw new Error(
      "Test vacancy not found"
    );
  }

  console.log("");
  console.log("================================");
  console.log("JOB");
  console.log("================================");

  console.log(`Title: ${job.title}`);
  console.log(`Company: ${job.company}`);
  console.log(
    `Location: ${job.location ?? "Unknown"}`
  );
  console.log(`Apply: ${job.applyUrl}`);

  console.log("");
  console.log("================================");
  console.log("BEDROCK ANALYSIS");
  console.log("================================");
  console.log("");

  const startedAt = Date.now();

  const analysis = await analyzeJob(
    job,
    CANDIDATE_PROFILE
  );

  const elapsed = Date.now() - startedAt;

  console.log(
    JSON.stringify(
      analysis,
      null,
      2
    )
  );

  // ================================================
  // SAVE RESULT
  // ================================================

  const analyzedJob: AnalyzedJob = {
    job,
    analysis,
    analyzedAt: new Date().toISOString(),
  };

  const outputPath =
    await saveAnalyzedJobs([
      analyzedJob,
    ]);

  console.log("");
  console.log("================================");
  console.log(
    `Analysis time: ${elapsed} ms`
  );
  console.log(
    `Saved to: ${outputPath}`
  );
  console.log("================================");
}

main().catch((error) => {
  console.error("");
  console.error(
    "Job analyzer test failed:"
  );

  console.error(error);

  process.exit(1);
});