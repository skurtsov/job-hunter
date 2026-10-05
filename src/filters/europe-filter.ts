import type { Job } from "../types.js";

const EUROPE_COUNTRIES = [
  "albania","andorra","austria","belarus","belgium","bosnia","bulgaria",
  "croatia","cyprus","czech","denmark","estonia","finland","france",
  "germany","greece","hungary","iceland","ireland","italy","kosovo",
  "latvia","liechtenstein","lithuania","luxembourg","malta","moldova",
  "monaco","montenegro","netherlands","north macedonia","norway","poland",
  "portugal","romania","san marino","serbia","slovakia","slovenia","spain",
  "sweden","switzerland","ukraine","united kingdom","uk","vatican",
];

const EUROPE_HINTS = [
  "europe",
  "european union",
  "eu",
  "eea",
  "emea",
  "worldwide",
  "global anywhere",
  "global remote",
  "remote worldwide",
  "work from anywhere",
];

const NON_EUROPE_ONLY_HINTS = [
  "americas",
  "north america",
  "south america",
  "united states",
  "usa",
  "u.s.",
  "remote us",
  "canada",
  "latin america",
  "apac",
  "asia pacific",
  "australia",
  "new zealand",
  "taiwan",
  "india",
];

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(text: string, phrase: string): boolean {
  const p = normalized(phrase);
  return (` ${text} `).includes(` ${p} `);
}

/**
 * Conservative Europe gate.
 *
 * Keep a vacancy when its structured location explicitly mentions
 * Europe/EU/EEA/EMEA, a European country, or truly global/worldwide
 * availability. Generic "Remote" is kept because it does not prove
 * a non-European restriction; the existing eligibility layer can
 * inspect the description afterwards.
 *
 * US/Canada/Americas/etc. are rejected only when there is no European
 * or worldwide alternative in the same logical vacancy.
 */
export function isEuropeRelevantJob(job: Job): boolean {
  if (!job.location?.trim()) {
    return true;
  }

  const text = normalized(job.location);

  const europeEvidence =
    EUROPE_HINTS.some((hint) => hasPhrase(text, hint)) ||
    EUROPE_COUNTRIES.some((country) => hasPhrase(text, country));

  if (europeEvidence) {
    return true;
  }

  if (text === "remote" || text === "home based") {
    return true;
  }

  const nonEuropeEvidence =
    NON_EUROPE_ONLY_HINTS.some((hint) => hasPhrase(text, hint));

  return !nonEuropeEvidence;
}

export function filterEuropeJobs(jobs: Job[]): Job[] {
  return jobs.filter(isEuropeRelevantJob);
}
