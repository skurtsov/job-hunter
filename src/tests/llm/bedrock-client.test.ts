import test from "node:test";
import assert from "node:assert/strict";

import {
  isRetryableBedrockError,
} from "../../llm/bedrock-client.js";

const retryable = [
  Object.assign(
    new Error("Rate exceeded"),
    { name: "ThrottlingException" }
  ),
  Object.assign(
    new Error("Request timed out"),
    { name: "TimeoutError" }
  ),
  Object.assign(
    new Error("Service unavailable"),
    { name: "ServiceUnavailableException" }
  ),
  new Error(
    "Bedrock returned no assistant text. Stop reason: max_tokens"
  ),
];

for (const error of retryable) {
  test(
    `retries transient Bedrock error: ${error.name}`,
    () => {
      assert.equal(
        isRetryableBedrockError(error),
        true
      );
    }
  );
}

test(
  "does not retry validation-style errors",
  () => {
    const error = Object.assign(
      new Error(
        "The text field cannot be blank"
      ),
      {
        name: "ValidationException",
      }
    );

    assert.equal(
      isRetryableBedrockError(error),
      false
    );
  }
);

test(
  "does not retry non-Error values",
  () => {
    assert.equal(
      isRetryableBedrockError(
        "temporary failure"
      ),
      false
    );
  }
);
