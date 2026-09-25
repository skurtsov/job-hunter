import { askBedrock } from "./bedrock-client.js";

async function main() {
  const response = await askBedrock(
    "Reply with exactly: NODE_BEDROCK_OK"
  );

  console.log("Response:", response.text);
  console.log("Input tokens:", response.inputTokens);
  console.log("Output tokens:", response.outputTokens);
  console.log("Total tokens:", response.totalTokens);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});