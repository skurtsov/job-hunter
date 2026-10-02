import type { Job } from "../types.js";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    allLocations?: string[];
    commitment?: string;
    team?: string;
  };
};

export async function collectLeverJobs(
  site: string,
  company: string
): Promise<Job[]> {
  const url =
    `https://api.lever.co/v0/postings/${site}?mode=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Lever request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as LeverPosting[];

  return data.map((posting) => {
    const locations =
      posting.categories?.allLocations?.length
        ? posting.categories.allLocations
        : posting.categories?.location
          ? [posting.categories.location]
          : [];

    const description = [
      posting.descriptionPlain,
      posting.additionalPlain,
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      externalId: posting.id,
      company,
      title: posting.text,
      location:
        locations.join(", ") || null,
      description:
        description || null,
      applyUrl: posting.hostedUrl,
      source: "lever",
      publishedAt:
        typeof posting.createdAt === "number"
          ? new Date(posting.createdAt)
          : null,
    };
  });
}
