import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = "eu-central-1";
const MODEL_ID = "openai.gpt-oss-20b-1:0";

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

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

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function isBedrockAuthenticationError(
  error: unknown
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes("expiredtoken") ||
    name.includes("unrecognizedclient") ||
    name.includes("invalidsignature") ||
    message.includes("session has expired") ||
    message.includes("token has expired") ||
    message.includes("expired token") ||
    message.includes("please reauthenticate") ||
    message.includes("security token included in the request is expired")
  );
}

export function isRetryableBedrockError(
  error: unknown
): boolean {
  if (
    !(error instanceof Error) ||
    isBedrockAuthenticationError(error)
  ) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes("throttl") ||
    name.includes("timeout") ||
    name.includes("serviceunavailable") ||
    name.includes("internalserver") ||
    message.includes("throttl") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("service unavailable") ||
    message.includes("temporarily unavailable") ||
    message.includes("bedrock returned no assistant text")
  );
}

function retryDelayMs(
  attempt: number
): number {
  return (
    RETRY_BASE_DELAY_MS *
    2 ** (attempt - 1)
  );
}

async function askBedrockOnce(
  prompt: string
): Promise<BedrockResponse> {
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

export async function askBedrock(
  prompt: string
): Promise<BedrockResponse> {
  if (!prompt.trim()) {
    throw new Error(
      "Bedrock prompt cannot be empty"
    );
  }

  let lastError: unknown;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      return await askBedrockOnce(
        prompt
      );
    } catch (error) {
      lastError = error;

      const shouldRetry =
        attempt < MAX_ATTEMPTS &&
        isRetryableBedrockError(
          error
        );

      if (!shouldRetry) {
        throw error;
      }

      const delay =
        retryDelayMs(attempt);

      console.warn(
        [
          `Bedrock attempt ${attempt}/${MAX_ATTEMPTS} failed.`,
          `Retrying in ${delay}ms...`,
          error instanceof Error
            ? error.message
            : String(error),
        ].join(" ")
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
