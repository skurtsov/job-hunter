import { collectGreenhouseJobs } from "./collectors/greenhouse.js";
import { filterJobs } from "./filters/job-filter.js";
import { deduplicateJobs } from "./processors/job-deduplicator.js";
import { createShortlist } from "./processors/job-shortlist.js";

async function main() {
  const jobs = await collectGreenhouseJobs(
    "affirm",
    "Affirm"
  );

  const roleMatched = filterJobs(jobs);
  const logicalJobs = deduplicateJobs(roleMatched);
  const shortlist = createShortlist(logicalJobs);

  console.log(`Total jobs: ${jobs.length}`);
  console.log(`Role matched: ${roleMatched.length}`);
  console.log(`Logical vacancies: ${logicalJobs.length}`);
  console.log(`Shortlisted: ${shortlist.length}`);

  console.log("================================");

  for (const item of shortlist) {
    console.log(item.job.title);
    console.log(`Company: ${item.job.company}`);

    console.log(
      `Locations: ${item.job.locations.join(", ")}`
    );

    console.log(
      `Technologies: ${item.jobTechnologies.join(", ") || "none"}`
    );

    console.log(
      `Matched: ${item.matchedSkills.join(", ") || "none"}`
    );

    console.log(
      `Missing: ${item.missingSkills.join(", ") || "none"}`
    );

    console.log(`Preliminary score: ${item.techScore}%`);

    for (const job of item.job.jobs) {
      console.log(
        `Apply [${job.location ?? "Unknown"}]: ${job.applyUrl}`
      );
    }

    console.log("--------------------------------");
  }
}

main().catch(console.error);