import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchQuery } from "../src/lib/search/query-builder";

test("buildSearchQuery removes conversational prefixes and punctuation", () => {
  const q1 = buildSearchQuery("Can you please tell me what are the latest features in Next.js 15?");
  assert.equal(q1, "latest features in Next.js 15");

  const q2 = buildSearchQuery("Please search the web for Ollama release notes!");
  assert.equal(q2, "Ollama release notes");

  const q3 = buildSearchQuery("Google RTX 4060 laptop prices India.");
  assert.equal(q3, "RTX 4060 laptop prices India");
});

test("buildSearchQuery resolves conversational pronouns using history", () => {
  const history = [
    { role: "user", content: "Tell me about Ollama." },
    { role: "assistant", content: "Ollama is a local LLM runner." },
  ];

  const q1 = buildSearchQuery("What is its latest version?", { recentHistory: history });
  assert.ok(q1.includes("Ollama"));
  assert.ok(q1.includes("latest version"));

  const q2 = buildSearchQuery("How much does it cost?", { recentHistory: history });
  assert.ok(q2.includes("Ollama"));
});

test("buildSearchQuery bounds query length safely", () => {
  const longPrompt = "a ".repeat(200);
  const q = buildSearchQuery(longPrompt, { maxQueryLength: 50 });
  assert.ok(q.length <= 50);
});

test("buildSearchQuery strips email addresses to prevent PII leakage", () => {
  const q = buildSearchQuery("Search contact info for contact@example.com about pricing");
  assert.ok(!q.includes("contact@example.com"));
});
