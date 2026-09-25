import { collectGreenhouseJobs } from "../collectors/greenhouse.js";
import { filterJobs } from "../filters/job-filter.js";
import { analyzeJob } from "./job-analyzer.js";
import { CANDIDATE_PROFILE } from "../config/candidate-profile.js";

async function main() {
  console.log("Collecting jobs...");

  // 1. Получаем реальные вакансии Affirm
  const jobs = await collectGreenhouseJobs(
    "affirm",
    "Affirm"
  );

  // 2. Применяем наш базовый role filter
  const filteredJobs = filterJobs(jobs);

  console.log(`Total jobs: ${jobs.length}`);
  console.log(`Role matched: ${filteredJobs.length}`);

  // 3. Для первого теста берем конкретную реальную вакансию
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

  // 4. Отправляем полное описание вакансии
  // + профиль кандидата в Bedrock
  const analysis = await analyzeJob(
    job,
    CANDIDATE_PROFILE
  );

  const elapsed = Date.now() - startedAt;

  // 5. Выводим структурированный результат
  console.log(
    JSON.stringify(analysis, null, 2)
  );

  console.log("");
  console.log("================================");
  console.log(
    `Analysis time: ${elapsed} ms`
  );
  console.log("================================");
}

main().catch((error) => {
  console.error("");
  console.error("Job analyzer test failed:");
  console.error(error);

  process.exit(1);
});