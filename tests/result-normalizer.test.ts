import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchResults } from "../src/lib/search/result-normalizer";
import { RawSearxngResult } from "../src/lib/search/types";

test("normalizeSearchResults sanitizes URLs, decodes HTML entities and deduplicates", () => {
  const rawResults: RawSearxngResult[] = [
    {
      title: "Next.js &amp; React 19 Guide",
      url: "https://nextjs.org/docs?utm_source=twitter&utm_medium=social#intro",
      content: "Learn all about Next.js &lt;features&gt; &amp; enhancements.",
      score: 1.0,
      engine: "google",
    },
    // Duplicate URL with different tracking params
    {
      title: "Next.js &amp; React 19 Duplicate",
      url: "https://nextjs.org/docs?utm_source=facebook",
      content: "Duplicate content",
      score: 0.9,
    },
    // Unsafe URL scheme (javascript:)
    {
      title: "Malicious Link",
      url: "javascript:alert(1)",
      content: "Should be dropped",
    },
    // Unsafe URL scheme (file:)
    {
      title: "Local File",
      url: "file:///etc/passwd",
      content: "Should be dropped",
    },
    // Valid distinct second URL
    {
      title: "React Official Docs",
      url: "https://www.react.dev/blog/react-19",
      content: "React 19 release announcement.",
      score: 0.8,
    },
  ];

  const normalized = normalizeSearchResults(rawResults);

  // Unsafe links dropped, duplicate dropped -> only 2 items remain
  assert.equal(normalized.length, 2);

  // Check 1st item
  assert.equal(normalized[0].id, "1");
  assert.equal(normalized[0].title, "Next.js & React 19 Guide");
  assert.equal(normalized[0].url, "https://nextjs.org/docs");
  assert.equal(normalized[0].domain, "nextjs.org");
  assert.equal(normalized[0].snippet, "Learn all about Next.js <features> & enhancements.");

  // Check 2nd item
  assert.equal(normalized[1].id, "2");
  assert.equal(normalized[1].domain, "react.dev");
});

test("normalizeSearchResults respects maxSnippetLength and maxResults", () => {
  const rawResults: RawSearxngResult[] = [
    {
      title: "Item 1",
      url: "https://example.com/1",
      content: "A very long snippet that will be truncated ".repeat(10),
    },
    {
      title: "Item 2",
      url: "https://example.com/2",
      content: "Short snippet",
    },
    {
      title: "Item 3",
      url: "https://example.com/3",
      content: "Third snippet",
    },
  ];

  const normalized = normalizeSearchResults(rawResults, {
    maxSnippetLength: 40,
    maxResults: 2,
  });

  assert.equal(normalized.length, 2);
  assert.ok(normalized[0].snippet.length <= 45);
  assert.ok(normalized[0].snippet.endsWith("..."));
});
