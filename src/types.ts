export type Job = {
  externalId: string;
  company: string;
  title: string;
  location: string | null;
  description: string | null;
  applyUrl: string;
  source: "greenhouse" | "lever";
  publishedAt: Date | null;
};