import { test } from "node:test";
import assert from "node:assert/strict";
import { decideSearch } from "../src/lib/search/search-decision";

test("decideSearch skips foundational programming concepts", () => {
  const d1 = decideSearch("What is a closure in JavaScript?");
  assert.equal(d1.shouldSearch, false);

  const d2 = decideSearch("How to reverse a string in Python?");
  assert.equal(d2.shouldSearch, false);

  const d3 = decideSearch("Explain binary search algorithm.");
  assert.equal(d3.shouldSearch, false);
});

test("decideSearch skips math calculations and creative writing", () => {
  const d1 = decideSearch("Calculate 124 * 56 + 12");
  assert.equal(d1.shouldSearch, false);

  const d2 = decideSearch("Write a poem about autumn leaves");
  assert.equal(d2.shouldSearch, false);
});

test("decideSearch triggers on latest releases and temporal keywords", () => {
  const d1 = decideSearch("What are the latest features in Next.js 15?");
  assert.equal(d1.shouldSearch, true);
  assert.ok(d1.reason.includes("time-sensitive"));

  const d2 = decideSearch("What is the current version of Fedora Linux in 2026?");
  assert.equal(d2.shouldSearch, true);

  const d3 = decideSearch("Recent developments in quantum computing this month");
  assert.equal(d3.shouldSearch, true);
});

test("decideSearch triggers on prices and live market data", () => {
  const d1 = decideSearch("What is the price of an RTX 4060 laptop in India?");
  assert.equal(d1.shouldSearch, true);

  const d2 = decideSearch("Current stock price of NVIDIA");
  assert.equal(d2.shouldSearch, true);
});

test("decideSearch respects explicit search and no-search prompts", () => {
  const d1 = decideSearch("Please search the web for Ollama release notes");
  assert.equal(d1.shouldSearch, true);
  assert.ok(d1.reason.includes("explicitly requested"));

  const d2 = decideSearch("Explain Docker without searching the web");
  assert.equal(d2.shouldSearch, false);
  assert.ok(d2.reason.includes("instructed not to search"));
});

test("decideSearch respects searchMode overrides", () => {
  // Mode "off" overrides time-sensitive question
  const d1 = decideSearch("Latest Next.js features", { searchMode: "off" });
  assert.equal(d1.shouldSearch, false);

  // Mode "on" overrides simple math or coding explanation
  const d2 = decideSearch("What is a closure in JS?", { searchMode: "on" });
  assert.equal(d2.shouldSearch, true);
});
