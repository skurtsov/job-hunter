export type ApplicationQuestion = {
  label: string;
  required: boolean;
  fieldType: string;
  options: string[];
};

export type ApplicationForm = {
  company: string;
  jobId: string;
  title: string;
  location: string | null;
  description: string;
  questions: ApplicationQuestion[];
  sourceUrl: string;
};

type GreenhouseField = {
  type?: string;
  values?: Array<{ label?: string; value?: unknown }>;
};

type GreenhouseQuestion = {
  label?: string;
  required?: boolean;
  fields?: GreenhouseField[];
};

type GreenhouseJob = {
  title?: string;
  content?: string;
  location?: { name?: string };
  questions?: GreenhouseQuestion[];
};

export function parseGreenhouseJobUrl(url: string): {
  company: string;
  jobId: string;
} {
  const parsed = new URL(url);
  const match = parsed.pathname.match(
    /^\/([^/]+)\/jobs\/(\d+)\/?$/
  );

  if (!match?.[1] || !match[2]) {
    throw new Error(
      "Expected Greenhouse URL like https://job-boards.greenhouse.io/company/jobs/123456"
    );
  }

  return {
    company: match[1],
    jobId: match[2],
  };
}

export async function readGreenhouseApplication(
  sourceUrl: string
): Promise<ApplicationForm> {
  const { company, jobId } =
    parseGreenhouseJobUrl(sourceUrl);

  const apiUrl =
    `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}?questions=true`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `Greenhouse application request failed: ${response.status} ${response.statusText}`
    );
  }

  const job = (await response.json()) as GreenhouseJob;

  const questions = (job.questions ?? []).map(
    (question): ApplicationQuestion => {
      const fields = question.fields ?? [];
      const options = fields.flatMap((field) =>
        (field.values ?? [])
          .map((value) => value.label?.trim())
          .filter((value): value is string => Boolean(value))
      );

      return {
        label: question.label?.trim() || "Unnamed question",
        required: question.required === true,
        fieldType:
          fields.map((field) => field.type).filter(Boolean).join(", ") ||
          "unknown",
        options: [...new Set(options)],
      };
    }
  );

  return {
    company,
    jobId,
    title: job.title?.trim() || "Unknown position",
    location: job.location?.name?.trim() || null,
    description: job.content ?? "",
    questions,
    sourceUrl,
  };
}
