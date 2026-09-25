import type { CandidateProfile } from "../analyzers/job-analyzer.js";

export const CANDIDATE_PROFILE: CandidateProfile = {
  title: "Senior Full-Stack Software Engineer",

  yearsOfExperience: 8,

  seniority: "senior",

  skills: [
    // Core
    "TypeScript",
    "JavaScript",
    "Node.js",
    "React",
    "Next.js",
    "Python",

    // Databases
    "PostgreSQL",
    "MongoDB",
    "SQL",

    // Backend / APIs
    "REST APIs",

    // Infrastructure / Cloud
    "Docker",
    "AWS",
    "GCP",

    // Development
    "Git",
    "GitHub",
  ],

  // Previous domain experience.
  // IMPORTANT:
  // These are NOT job-search restrictions.
  // Jobs from other industries must not be penalized
  // simply because their domain is not listed here.
  domains: [
    "FinTech",
    "BioTech",
    "AI",
    "Data Engineering",
    "Payment Processing",
  ],

  // Roles we are interested in.
  // Industry/domain does not matter.
  preferredRoles: [
    "Senior Software Engineer",
    "Senior Full-Stack Engineer",
    "Full-Stack Engineer",
    "Software Engineer",
    "Backend Engineer",
    "Frontend Engineer",
    "Node.js Engineer",
    "TypeScript Engineer",
    "JavaScript Engineer",
    "Python Engineer",
  ],

  workPreferences: {
    acceptsB2B: true,
    acceptsEmployment: true,
    acceptsRemote: true,
  },
};