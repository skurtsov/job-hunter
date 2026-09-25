import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = "eu-central-1";
const MODEL_ID = "openai.gpt-oss-20b-1:0";

const client = new BedrockRuntimeClient({
  region: REGION,
});

export type BedrockResponse = {
  text: string;

  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;

  stopReason: string | null;
};

export async function askBedrock(
  prompt: string
): Promise<BedrockResponse> {
  if (!prompt.trim()) {
    throw new Error(
      "Bedrock prompt cannot be empty"
    );
  }

  const command = new ConverseCommand({
    modelId: MODEL_ID,

    messages: [
      {
        role: "user",

        content: [
          {
            text: prompt,
          },
        ],
      },
    ],

    inferenceConfig: {
      // GPT OSS uses output tokens for reasoning too.
      // Job descriptions + structured analysis may require
      // substantially more than the simple test prompt.
      maxTokens: 5000,

      temperature: 0.1,

      topP: 0.9,
    },
  });

  const response = await client.send(
    command
  );

  const content =
    response.output?.message?.content ?? [];

  // GPT OSS may return reasoningContent blocks
  // before the final assistant text.
  //
  // We only want actual assistant text here.
  const textBlocks = content.filter(
    (
      block
    ): block is typeof block & {
      text: string;
    } =>
      "text" in block &&
      typeof block.text === "string"
  );

  const text = textBlocks
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    console.error("");
    console.error(
      "================================"
    );
    console.error(
      "BEDROCK RETURNED NO TEXT"
    );
    console.error(
      "================================"
    );

    console.error(
      "Stop reason:",
      response.stopReason
    );

    console.error(
      "Usage:",
      response.usage
    );

    console.error(
      "Raw content:"
    );

    console.dir(
      content,
      {
        depth: null,
      }
    );

    console.error(
      "================================"
    );

    throw new Error(
      `Bedrock returned no assistant text. Stop reason: ${
        response.stopReason ?? "unknown"
      }`
    );
  }

  return {
    text,

    inputTokens:
      response.usage?.inputTokens ?? null,

    outputTokens:
      response.usage?.outputTokens ?? null,

    totalTokens:
      response.usage?.totalTokens ?? null,

    stopReason:
      response.stopReason ?? null,
  };
}