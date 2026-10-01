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
  preliminaryTechScore?: number;
  analyzedAt: string;
};

function csvCell(
  value: string | number | boolean | null | undefined
): string {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function joinValues(
  values: string[] | undefined
): string {
  return values?.join("; ") ?? "";
}

function toCsv(
  analyzedJobs: AnalyzedJob[]
): string {
  const headers = [
    "company",
    "title",
    "location",
    "overall_score",
    "preliminary_tech_score",
    "recommendation",
    "eligibility",
    "eligibility_reasons",
    "work_arrangement",
    "work_restrictions",
    "seniority_required",
    "seniority_candidate",
    "seniority_match",
    "required_years",
    "candidate_years",
    "skills_score",
    "matched_skills",
    "missing_required",
    "missing_preferred",
    "blockers",
    "reasoning",
    "apply_url",
    "source",
    "published_at",
    "analyzed_at",
  ];

  const rows = analyzedJobs.map(
    ({ job, analysis, preliminaryTechScore, analyzedAt }) => [
      job.company,
      job.title,
      job.location,
      analysis.overallScore,
      preliminaryTechScore,
      analysis.recommendation,
      analysis.eligibility?.status ?? "uncertain",
      joinValues(analysis.eligibility?.reasons),
      analysis.workArrangement.type,
      joinValues(analysis.workArrangement.restrictions),
      analysis.seniority.required,
      analysis.seniority.candidate,
      analysis.seniority.match,
      analysis.experience.requiredYears,
      analysis.experience.candidateYears,
      analysis.skills.score,
      joinValues(analysis.skills.matched),
      joinValues(analysis.skills.missingRequired),
      joinValues(analysis.skills.missingPreferred),
      joinValues(analysis.blockers),
      analysis.reasoning,
      job.applyUrl,
      job.source,
      job.publishedAt?.toISOString() ?? "",
      analyzedAt,
    ]
  );

  return [
    headers.map(csvCell).join(","),
    ...rows.map(
      (row) =>
        row.map(csvCell).join(",")
    ),
  ].join("\n") + "\n";
}

/**
 * Creates one CSV output path for the batch.
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
    `jobs-${timestamp}.csv`
  );
}

/**
 * Crash-safe CSV checkpoint.
 *
 * The complete current result set is rewritten after each
 * successful analysis so a stopped batch still leaves a
 * valid CSV with everything completed so far.
 */
export async function saveAnalyzedJobsToFile(
  outputPath: string,
  analyzedJobs: AnalyzedJob[]
): Promise<void> {
  const temporaryPath =
    `${outputPath}.tmp`;

  const csv =
    toCsv(analyzedJobs);

  await writeFile(
    temporaryPath,
    csv,
    "utf8"
  );

  await rename(
    temporaryPath,
    outputPath
  );
}

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
