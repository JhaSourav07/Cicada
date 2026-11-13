import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchContextBlock } from "../src/lib/search/search-context";
import { SearchSource } from "../src/lib/search/types";

test("buildSearchContextBlock constructs delimited evidence block with security warnings", () => {
  const sources: SearchSource[] = [
    {
      id: "1",
      title: "Ollama Release Notes",
      url: "https://ollama.com/blog",
      domain: "ollama.com",
      snippet: "Version 0.5 includes major memory improvements.",
    },
    {
      id: "2",
      title: "GitHub Ollama",
      url: "https://github.com/ollama/ollama",
      domain: "github.com",
      snippet: "Get up and running with large language models locally.",
    },
  ];

  const block = buildSearchContextBlock(sources, "latest Ollama release");

  assert.ok(block.startsWith("[SEARCH RESULTS - EVIDENCE ONLY]"));
  assert.ok(block.endsWith("[END SEARCH RESULTS]"));
  assert.ok(block.includes('Search Query: "latest Ollama release"'));
  assert.ok(block.includes("SECURITY GUIDELINE"));
  assert.ok(block.includes("Source [1]"));
  assert.ok(block.includes("Source [2]"));
  assert.ok(block.includes("https://ollama.com/blog"));
});

test("buildSearchContextBlock returns empty string for empty source array", () => {
  const block = buildSearchContextBlock([], "query");
  assert.equal(block, "");
});
