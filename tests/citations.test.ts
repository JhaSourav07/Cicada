import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCitations } from "../src/lib/search/citations";
import { SearchSource } from "../src/lib/search/types";

const mockSources: SearchSource[] = [
  {
    id: "1",
    title: "Next.js Docs",
    url: "https://nextjs.org/docs",
    domain: "nextjs.org",
    snippet: "Next.js documentation.",
  },
  {
    id: "2",
    title: "React Docs",
    url: "https://react.dev",
    domain: "react.dev",
    snippet: "React documentation.",
  },
];

test("validateCitations preserves valid citation markers", () => {
  const text = "Next.js 15 features async request handling [1] and React 19 support [2].";
  const result = validateCitations(text, mockSources);

  assert.deepEqual(result.validMarkers, [1, 2]);
  assert.deepEqual(result.invalidMarkers, []);
  assert.equal(result.sanitizedContent, text);
  assert.equal(result.activeSources.length, 2);
});

test("validateCitations strips hallucinated citation markers", () => {
  const text = "According to an unverified report [99], quantum computers exist [1].";
  const result = validateCitations(text, mockSources);

  assert.deepEqual(result.validMarkers, [1]);
  assert.deepEqual(result.invalidMarkers, [99]);
  // Marker [99] should be removed, [1] preserved
  assert.ok(!result.sanitizedContent.includes("[99]"));
  assert.ok(result.sanitizedContent.includes("[1]"));
  assert.equal(result.activeSources.length, 1);
  assert.equal(result.activeSources[0].id, "1");
});

test("validateCitations filters multi-number markers correctly", () => {
  const text = "Cross-verified statement [1, 5, 2].";
  const result = validateCitations(text, mockSources);

  assert.deepEqual(result.validMarkers, [1, 2]);
  assert.deepEqual(result.invalidMarkers, [5]);
  assert.equal(result.sanitizedContent, "Cross-verified statement [1, 2].");
});

test("validateCitations removes all citations when source list is empty", () => {
  const text = "Claim with fake citation [1].";
  const result = validateCitations(text, []);

  assert.deepEqual(result.validMarkers, []);
  assert.equal(result.sanitizedContent, "Claim with fake citation .");
  assert.deepEqual(result.activeSources, []);
});
