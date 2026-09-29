import {
  mkdir,
  rename,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import type { Job } from "../types.js";
import type { JobAnalysis } from "../analyzers/job-analyzer.js";

export type AnalyzedJob = {
  job: Job;

  analysis: JobAnalysis;

  /**
   * Preliminary deterministic tech score
   * calculated before the expensive LLM analysis.
   */
  preliminaryTechScore?: number;

  analyzedAt: string;
};

/**
 * Creates a unique output path for ONE batch run.
 *
 * Important:
 * this function should be called only once when
 * the batch starts.
 */
export async function createAnalysisOutputPath(): Promise<string> {
  const outputDirectory = path.resolve(
    process.cwd(),
    "output"
  );

  await mkdir(
    outputDirectory,
    {
      recursive: true,
    }
  );

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");

  return path.join(
    outputDirectory,
    `jobs-${timestamp}.json`
  );
}

/**
 * Saves the complete current batch state.
 *
 * We write to a temporary file first and then rename it.
 *
 * This prevents a partially-written JSON file if the
 * process crashes while writeFile() is running.
 */
export async function saveAnalyzedJobsToFile(
  outputPath: string,
  analyzedJobs: AnalyzedJob[]
): Promise<void> {
  const temporaryPath =
    `${outputPath}.tmp`;

  const json = JSON.stringify(
    analyzedJobs,
    null,
    2
  );

  await writeFile(
    temporaryPath,
    json,
    "utf8"
  );

  await rename(
    temporaryPath,
    outputPath
  );
}

/**
 * Compatibility helper for the existing single-job test.
 *
 * test-job-analyzer.ts can continue calling:
 *
 * saveAnalyzedJobs([...])
 *
 * without needing to be changed right now.
 */
export async function saveAnalyzedJobs(
  analyzedJobs: AnalyzedJob[]
): Promise<string> {
  const outputPath =
    await createAnalysisOutputPath();

  await saveAnalyzedJobsToFile(
    outputPath,
    analyzedJobs
  );

  return outputPath;
}