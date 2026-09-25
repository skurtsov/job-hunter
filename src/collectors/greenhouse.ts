import type { Job } from "../types.js";

type GreenhouseJob = {
  id: number;
  title: string;
  location?: {
    name?: string;
  };
  absolute_url: string;
  content?: string;
  updated_at?: string;
};

type GreenhouseResponse = {
  jobs: GreenhouseJob[];
};

export async function collectGreenhouseJobs(
  boardToken: string,
  company: string
): Promise<Job[]> {
  const url =
    `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Greenhouse request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as GreenhouseResponse;

  return data.jobs.map((job) => ({
    externalId: String(job.id),
    company,
    title: job.title,
    location: job.location?.name ?? null,
    description: job.content ?? null,
    applyUrl: job.absolute_url,
    source: "greenhouse",
    publishedAt: job.updated_at ? new Date(job.updated_at) : null,
  }));
}