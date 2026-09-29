import type {
  Job,
} from "../types.js";

export type DeduplicatedJob = {
  company: string;
  title: string;
  locations: string[];
  applyUrls: string[];
  jobs: Job[];
};

/**
 * Normalize a job title only for deduplication.
 *
 * Important:
 * We do NOT modify the title displayed to the user.
 *
 * Examples:
 *
 * "Software Engineer II , Backend, (Furnishing Platform)"
 *
 * and
 *
 * "Software Engineer II, Backend (Furnishing Platform)"
 *
 * both become:
 *
 * "software engineer ii backend furnishing platform"
 */
function normalizeTitle(
  title: string
): string {
  return title
    .toLowerCase()

    /*
     * Normalize common role spelling variants.
     */
    .replace(
      /\bback[\s-]?end\b/g,
      "backend"
    )
    .replace(
      /\bfront[\s-]?end\b/g,
      "frontend"
    )
    .replace(
      /\bfull[\s-]?stack\b/g,
      "fullstack"
    )

    /*
     * Punctuation should not make two otherwise
     * identical job titles different.
     *
     * We replace punctuation with spaces instead
     * of deleting it so words cannot accidentally
     * become concatenated.
     */
    .replace(
      /[(),\-–—]/g,
      " "
    )

    /*
     * Collapse duplicate whitespace.
     */
    .replace(
      /\s+/g,
      " "
    )

    .trim();
}

function createKey(
  job: Job
): string {
  const normalizedCompany =
    job.company
      .toLowerCase()
      .trim();

  const normalizedTitle =
    normalizeTitle(
      job.title
    );

  return (
    `${normalizedCompany}::` +
    normalizedTitle
  );
}

export function deduplicateJobs(
  jobs: Job[]
): DeduplicatedJob[] {
  const groups =
    new Map<
      string,
      DeduplicatedJob
    >();

  for (const job of jobs) {
    const key =
      createKey(job);

    const existing =
      groups.get(key);

    if (existing) {
      /*
       * Preserve every location where this
       * logical vacancy was published.
       */
      if (
        job.location &&
        !existing.locations.includes(
          job.location
        )
      ) {
        existing.locations.push(
          job.location
        );
      }

      /*
       * Preserve every application URL.
       */
      if (
        !existing.applyUrls.includes(
          job.applyUrl
        )
      ) {
        existing.applyUrls.push(
          job.applyUrl
        );
      }

      /*
       * Keep the original jobs too.
       *
       * This gives us access to all source records
       * later if we need them.
       */
      existing.jobs.push(
        job
      );

      continue;
    }

    groups.set(
      key,
      {
        company:
          job.company,

        /*
         * Keep the original human-readable title.
         */
        title:
          job.title.trim(),

        locations:
          job.location
            ? [job.location]
            : [],

        applyUrls: [
          job.applyUrl,
        ],

        jobs: [
          job,
        ],
      }
    );
  }

  return [
    ...groups.values(),
  ];
}