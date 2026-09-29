import {
  collectGreenhouseJobs,
} from "./collectors/greenhouse.js";

import {
  filterJobs,
} from "./filters/job-filter.js";

import {
  deduplicateJobs,
} from "./processors/job-deduplicator.js";

import {
  createShortlist,
} from "./processors/job-shortlist.js";

import {
  analyzeJob,
} from "./analyzers/job-analyzer.js";

import {
  CANDIDATE_PROFILE,
} from "./config/candidate-profile.js";

import {
  createAnalysisOutputPath,
  saveAnalyzedJobsToFile,
  type AnalyzedJob,
} from "./output/json-writer.js";

/**
 * Small delay between Bedrock requests.
 *
 * We don't need to hammer the API as fast as possible.
 * Later we can add controlled concurrency.
 */
const BEDROCK_DELAY_MS = 500;

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(
      resolve,
      milliseconds
    );
  });
}

export function isDryRun(
  args: string[] = process.argv.slice(2)
): boolean {
  return args.includes("--dry-run");
}

async function main(): Promise<void> {
  const dryRun = isDryRun();
  console.log(
    "================================"
  );

  console.log(
    "JOB HUNTER"
  );

  console.log(
    "================================"
  );

  /*
   * -----------------------------------------
   * 1. Collect
   * -----------------------------------------
   */

  console.log(
    "\nCollecting jobs..."
  );

  const jobs =
    await collectGreenhouseJobs(
      "affirm",
      "Affirm"
    );

  /*
   * -----------------------------------------
   * 2. Cheap deterministic processing
   * -----------------------------------------
   */

  const roleMatched =
    filterJobs(jobs);

  const logicalJobs =
    deduplicateJobs(
      roleMatched
    );

  const shortlist =
    createShortlist(
      logicalJobs
    );

  console.log(
    `Total jobs: ${jobs.length}`
  );

  console.log(
    `Role matched: ${roleMatched.length}`
  );

  console.log(
    `Logical vacancies: ${logicalJobs.length}`
  );

  console.log(
    `Shortlisted: ${shortlist.length}`
  );

  /*
   * -----------------------------------------
   * 3. Create ONE output file for this run
   * -----------------------------------------
   */

  if (dryRun) {
    console.log(
      "\n================================"
    );
    console.log("DRY RUN COMPLETE");
    console.log(
      "================================"
    );
    console.log("Bedrock requests: 0");
    console.log("Output files:     0");
    console.log(
      `Shortlisted:      ${shortlist.length}`
    );

    for (
      const [index, item]
      of shortlist.entries()
    ) {
      console.log(
        `\n#${index + 1} — ${item.techScore}%`
      );
      console.log(
        `${item.job.company} — ${item.job.title}`
      );
      console.log(
        `Locations: ${
          item.job.locations.join(", ") ||
          "Unknown"
        }`
      );
      console.log(
        `Apply: ${
          item.job.applyUrls.join(", ")
        }`
      );
    }

    return;
  }

  const outputPath =
    await createAnalysisOutputPath();

  const analyzedJobs: AnalyzedJob[] = [];

  /*
   * Create the file immediately.
   *
   * Even if the first Bedrock request fails,
   * we'll still have a valid [] JSON file.
   */

  await saveAnalyzedJobsToFile(
    outputPath,
    analyzedJobs
  );

  console.log(
    `\nOutput: ${outputPath}`
  );

  /*
   * -----------------------------------------
   * 4. AI batch analysis
   * -----------------------------------------
   */

  console.log(
    "\nStarting AI analysis..."
  );

  console.log(
    "================================"
  );

  let succeeded = 0;
  let failed = 0;

  for (
    const [index, item]
    of shortlist.entries()
  ) {
    const representativeJob =
      item.job.jobs[0];

    if (!representativeJob) {
      failed++;

      console.error(
        `[${index + 1}/${shortlist.length}] ` +
          `Skipped: ${item.job.title} — no representative job`
      );

      continue;
    }

    console.log(
      `\n[${index + 1}/${shortlist.length}] ` +
        `${item.job.company} — ${item.job.title}`
    );

    console.log(
      `Preliminary tech score: ${item.techScore}%`
    );

    try {
      /*
       * Expensive LLM analysis.
       */

      const analysis =
        await analyzeJob(
          representativeJob,
          CANDIDATE_PROFILE
        );

      const analyzedJob: AnalyzedJob = {
        job: representativeJob,

        analysis,

        preliminaryTechScore:
          item.techScore,

        analyzedAt:
          new Date().toISOString(),
      };

      analyzedJobs.push(
        analyzedJob
      );

      /*
       * Keep the best jobs at the top of the
       * JSON file even while the batch is running.
       */

      analyzedJobs.sort(
        (a, b) =>
          b.analysis.overallScore -
          a.analysis.overallScore
      );

      /*
       * CRASH-SAFE CHECKPOINT
       *
       * Save after EVERY successful job.
       */

      await saveAnalyzedJobsToFile(
        outputPath,
        analyzedJobs
      );

      succeeded++;

      console.log(
        `AI score: ${analysis.overallScore}%`
      );

      console.log(
        `Recommendation: ${analysis.recommendation}`
      );

      console.log(
        `Matched: ${
          analysis.skills.matched.join(", ") ||
          "none"
        }`
      );

      if (
        analysis.skills.missingRequired.length >
        0
      ) {
        console.log(
          `Missing required: ` +
            analysis.skills.missingRequired.join(
              ", "
            )
        );
      }

      if (
        analysis.blockers.length > 0
      ) {
        console.log(
          `Blockers: ${analysis.blockers.join(
            ", "
          )}`
        );
      }

      console.log(
        `Saved (${analyzedJobs.length} total)`
      );
    } catch (error) {
      failed++;

      /*
       * One bad vacancy must NOT kill
       * the whole batch.
       */

      console.error(
        `Analysis failed for: ${item.job.title}`
      );

      if (
        error instanceof Error
      ) {
        console.error(
          error.message
        );
      } else {
        console.error(
          String(error)
        );
      }
    }

    /*
     * Don't sleep after the last request.
     */

    if (
      index <
      shortlist.length - 1
    ) {
      await sleep(
        BEDROCK_DELAY_MS
      );
    }
  }

  /*
   * -----------------------------------------
   * 5. Final save
   * -----------------------------------------
   */

  analyzedJobs.sort(
    (a, b) =>
      b.analysis.overallScore -
      a.analysis.overallScore
  );

  await saveAnalyzedJobsToFile(
    outputPath,
    analyzedJobs
  );

  /*
   * -----------------------------------------
   * 6. Summary
   * -----------------------------------------
   */

  const strongMatches =
    analyzedJobs.filter(
      (item) =>
        item.analysis.recommendation ===
        "strong_match"
    ).length;

  const goodMatches =
    analyzedJobs.filter(
      (item) =>
        item.analysis.recommendation ===
        "good_match"
    ).length;

  const possibleMatches =
    analyzedJobs.filter(
      (item) =>
        item.analysis.recommendation ===
        "possible_match"
    ).length;

  const weakMatches =
    analyzedJobs.filter(
      (item) =>
        item.analysis.recommendation ===
        "weak_match"
    ).length;

  console.log(
    "\n================================"
  );

  console.log(
    "BATCH COMPLETE"
  );

  console.log(
    "================================"
  );

  console.log(
    `Shortlisted:      ${shortlist.length}`
  );

  console.log(
    `Analyzed:         ${succeeded}`
  );

  console.log(
    `Failed:           ${failed}`
  );

  console.log(
    `Strong matches:   ${strongMatches}`
  );

  console.log(
    `Good matches:     ${goodMatches}`
  );

  console.log(
    `Possible matches: ${possibleMatches}`
  );

  console.log(
    `Weak matches:     ${weakMatches}`
  );

  console.log(
    `\nSaved to:\n${outputPath}`
  );

  /*
   * -----------------------------------------
   * 7. Top matches
   * -----------------------------------------
   */

  const topMatches =
    analyzedJobs.slice(
      0,
      10
    );

  if (
    topMatches.length > 0
  ) {
    console.log(
      "\n================================"
    );

    console.log(
      "TOP MATCHES"
    );

    console.log(
      "================================"
    );

    for (
      const [index, item]
      of topMatches.entries()
    ) {
      console.log(
        `\n#${index + 1} — ${item.analysis.overallScore}%`
      );

      console.log(
        `${item.job.company} — ${item.job.title}`
      );

      console.log(
        `Location: ${
          item.job.location ??
          "Unknown"
        }`
      );

      console.log(
        `Recommendation: ${item.analysis.recommendation}`
      );

      console.log(
        `Work arrangement: ${item.analysis.workArrangement.type}`
      );

      console.log(
        `Apply: ${item.job.applyUrl}`
      );

      console.log(
        `Why: ${item.analysis.reasoning}`
      );
    }
  }
}

main().catch((error) => {
  console.error(
    "\nFatal Job Hunter error:"
  );

  console.error(
    error
  );

  process.exitCode = 1;
});