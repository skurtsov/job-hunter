import { z } from "zod";
import { askBedrock } from "../llm/bedrock-client.js";
import type { CandidateProfile } from "../analyzers/job-analyzer.js";
import type { ApplicationForm } from "./greenhouse-form-reader.js";

const answerSchema = z.object({
  question: z.string(),
  category: z.enum([
    "ready_to_use",
    "needs_input",
    "select_option",
    "sensitive_or_voluntary",
    "write_in_own_words",
  ]),
  recommendedAnswer: z.string(),
  talkingPoints: z.array(z.string()),
  evidence: z.array(z.string()),
  missingInformation: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  warning: z.string(),
});

const reportSchema = z.object({
  aiRestrictionDetected: z.boolean(),
  aiRestrictionEvidence: z.string(),
  strategySummary: z.string(),
  answers: z.array(answerSchema),
});

export type ApplicationAnswer = z.infer<typeof answerSchema>;
export type ApplicationAnalysis = z.infer<typeof reportSchema>;

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/, "")
    .trim();
}

export async function analyzeApplication(
  form: ApplicationForm,
  profile: CandidateProfile
): Promise<ApplicationAnalysis> {
  const prompt = `
You are an application-writing assistant.

Use ONLY facts supported by CANDIDATE PROFILE and the JOB/FORM.
Never invent education, grades, employers, dates, achievements,
metrics, salary expectations, authorization, nationality, identity,
or technical experience.

First detect whether the job or application explicitly prohibits
AI-generated answers, requires answers to be entirely in the
candidate's own words, or says AI use can disqualify the applicant.

If such a restriction exists:
- aiRestrictionDetected=true.
- For free-text questions that require original candidate writing,
  category MUST be "write_in_own_words".
- Do NOT provide prose intended to be submitted verbatim.
- recommendedAnswer must be empty.
- Provide concise factual talkingPoints, evidence, and a suggested
  answer structure through talkingPoints so the candidate can write
  the final response personally.

If no such restriction exists:
- "ready_to_use": enough verified information exists for a truthful
  polished answer.
- "needs_input": a factual answer needs information not present.
- "select_option": choose an option ONLY if supported by known facts.
- "sensitive_or_voluntary": demographic, disability, gender,
  ethnicity, veteran, health, or similar self-identification.
  Do not optimize these answers for hiring. Do not infer them.
  If a decline/prefer-not-to-say option exists, you may mention it
  without selecting it on the candidate's behalf.

STYLE FOR READY-TO-USE ANSWERS:
- natural professional English, approximately B2/C1;
- concise and specific;
- no fake enthusiasm;
- avoid generic AI phrases such as "I am thrilled", "Furthermore",
  "I am particularly excited", "leveraging my expertise";
- do not merely repeat the vacancy;
- prefer concrete relevant experience from the profile;
- never claim a skill merely because the job asks for it.

For every question return exactly one answer object, in the same
order as the input questions.

Return ONLY valid JSON matching:
{
  "aiRestrictionDetected": boolean,
  "aiRestrictionEvidence": string,
  "strategySummary": string,
  "answers": [{
    "question": string,
    "category": "ready_to_use"|"needs_input"|"select_option"|"sensitive_or_voluntary"|"write_in_own_words",
    "recommendedAnswer": string,
    "talkingPoints": string[],
    "evidence": string[],
    "missingInformation": string[],
    "confidence": "high"|"medium"|"low",
    "warning": string
  }]
}

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

JOB:
${JSON.stringify({
    company: form.company,
    title: form.title,
    location: form.location,
    description: form.description,
  }, null, 2)}

APPLICATION QUESTIONS:
${JSON.stringify(form.questions, null, 2)}
`;

  const response = await askBedrock(prompt);
  const parsed = JSON.parse(stripCodeFence(response.text));
  const validated = reportSchema.parse(parsed);

  if (validated.answers.length !== form.questions.length) {
    throw new Error(
      `Bedrock returned ${validated.answers.length} answers for ${form.questions.length} questions`
    );
  }

  return validated;
}
