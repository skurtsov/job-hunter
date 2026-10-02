import {
  collectGreenhouseJobs,
} from "./collectors/greenhouse.js";

import {
  GREENHOUSE_COMPANIES,
} from "./config/greenhouse-companies.js";

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
  detectDeterministicEligibility,
} from "./analyzers/job-analyzer.js";

import {
  CANDIDATE_PROFILE,
} from "./config/candidate-profile.js";

import {
  isBedrockAuthenticationError,
} from "./llm/bedrock-client.js";

import {
  createAnalysisOutputPath,
  saveAnalyzedJobsToFile,
  type AnalyzedJob,
} from "./output/json-writer.js";

import {
  saveAnalyzedJobsToExcel,
} from "./output/xlsx-writer.js";

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

  const collectionResults =
    await Promise.allSettled(
      GREENHOUSE_COMPANIES.map(
        ({ boardToken, company }) =>
          collectGreenhouseJobs(
            boardToken,
            company
          )
      )
    );

  const jobs = collectionResults.flatMap(
    (result, index) => {
      const source =
        GREENHOUSE_COMPANIES[index];

      if (result.status === "fulfilled") {
        console.log(
          `Collected ${result.value.length}: ${source?.company ?? "Unknown"}`
        );

        return result.value;
      }

      console.error(
        `Failed to collect ${source?.company ?? "Unknown"}: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`
      );

      return [];
    }
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

  const eligibleShortlist =
    shortlist.filter((item) => {
      const representativeJob =
        item.job.jobs[0];

      if (!representativeJob) {
        return true;
      }

      return (
        detectDeterministicEligibility(
          representativeJob,
          CANDIDATE_PROFILE
        ).status !== "ineligible"
      );
    });

  const prefilteredIneligible =
    shortlist.length -
    eligibleShortlist.length;

  console.log(
    `Pre-filtered ineligible: ${prefilteredIneligible}`
  );

  console.log(
    `Sending to Bedrock: ${eligibleShortlist.length}`
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
    console.log(
      `Would analyze:     ${eligibleShortlist.length}`
    );
    console.log(
      `Ineligible skipped: ${prefilteredIneligible}`
    );

    for (
      const [index, item]
      of shortlist.entries()
    ) {
      const representativeJob =
        item.job.jobs[0];

      const eligibility =
        representativeJob
          ? detectDeterministicEligibility(
              representativeJob,
              CANDIDATE_PROFILE
            )
          : { status: "uncertain" as const, reasons: [] };

      const dryRunStatus =
        eligibility.status === "ineligible"
          ? "SKIP"
          : "BEDROCK";

      console.log(
        `\n#${index + 1} — ${item.techScore}% — ${dryRunStatus}`
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
      if (eligibility.reasons.length > 0) {
        console.log(
          `Skip reason: ${eligibility.reasons.join("; ")}`
        );
      }
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
   * we'll still have a valid CSV with headers.
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
    of eligibleShortlist.entries()
  ) {
    const representativeJob =
      item.job.jobs[0];

    if (!representativeJob) {
      failed++;

      console.error(
        `[${index + 1}/${eligibleShortlist.length}] ` +
          `Skipped: ${item.job.title} — no representative job`
      );

      continue;
    }

    console.log(
      `\n[${index + 1}/${eligibleShortlist.length}] ` +
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
       * CSV file even while the batch is running.
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
        `Eligibility: ${
          analysis.eligibility?.status ??
          "uncertain"
        }`
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

      console.error(
        `Analysis failed for: ${item.job.title}`
      );

      if (
        isBedrockAuthenticationError(
          error
        )
      ) {
        console.error(
          error instanceof Error
            ? error.message
            : String(error)
        );

        console.error(
          "\nBedrock authentication failed. Stopping batch."
        );

        throw error;
      }

      /*
       * A vacancy-specific failure must NOT kill
       * the whole batch.
       */

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
      eligibleShortlist.length - 1
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

  const excelOutputPath =
    await saveAnalyzedJobsToExcel(
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
    `Pre-filtered:     ${prefilteredIneligible}`
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

  const ineligible =
    analyzedJobs.filter(
      (item) =>
        item.analysis.eligibility?.status ===
        "ineligible"
    ).length;

  console.log(
    `Weak matches:     ${weakMatches}`
  );

  console.log(
    `Ineligible:       ${ineligible}`
  );

  console.log(
    `\nRaw CSV:\n${outputPath}`
  );

  console.log(
    `\nExcel report:\n${excelOutputPath}`
  );

  /*
   * -----------------------------------------
   * 7. Top matches
   * -----------------------------------------
   */

  const topMatches =
    analyzedJobs
      .filter(
        (item) =>
          item.analysis.eligibility?.status !==
          "ineligible"
      )
      .slice(
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
        `Eligibility: ${
          item.analysis.eligibility?.status ??
          "uncertain"
        }`
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