import { test } from "node:test";
import assert from "node:assert/strict";
import { OllamaClient, OllamaError } from "../src/lib/ai/ollama";

test("OllamaClient instantiates with default local URL", () => {
  const client = new OllamaClient();
  assert.equal(client.baseUrl, "http://127.0.0.1:11434");
  assert.equal(client.numCtx, 8192);
});

test("OllamaError captures custom error code and HTTP status", () => {
  const err = new OllamaError("Model not found", "MODEL_NOT_FOUND", 404);
  assert.equal(err.code, "MODEL_NOT_FOUND");
  assert.equal(err.statusCode, 404);
  assert.equal(err.message, "Model not found");
  assert.equal(err.name, "OllamaError");
});

test("OllamaClient queries local Ollama tags and detects installed models", async () => {
  const client = new OllamaClient();
  const models = await client.listModels();
  assert.ok(Array.isArray(models));
  assert.ok(models.length > 0, "Expected at least one installed Ollama model");

  // Verify model structure
  const first = models[0];
  assert.ok(first.name);
  assert.ok(first.size > 0);
  assert.ok(first.sizeFormatted);
});
