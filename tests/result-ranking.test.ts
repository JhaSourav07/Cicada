import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreResult, rankAndSelectSources } from "../src/lib/search/result-ranking";
import { SearchSource } from "../src/lib/search/types";

test("scoreResult scores exact title match higher than partial match", () => {
  const query = "Next.js 15 App Router";

  const s1: SearchSource = {
    id: "1",
    title: "Next.js 15 App Router Official Guide",
    url: "https://nextjs.org/docs",
    domain: "nextjs.org",
    snippet: "Complete documentation for Next.js App Router.",
  };

  const s2: SearchSource = {
    id: "2",
    title: "Random Web Dev Tips",
    url: "https://example.com/tips",
    domain: "example.com",
    snippet: "Some random discussion mentioning router occasionally.",
  };

  const score1 = scoreResult(s1, query);
  const score2 = scoreResult(s2, query);

  assert.ok(score1 > score2);
  assert.ok(score1 >= 4.0);
});

test("rankAndSelectSources enforces domain diversity and bounds to maxContextResults", () => {
  const query = "RTX 4060 benchmark";
  const candidates: SearchSource[] = [
    {
      id: "a",
      title: "RTX 4060 Laptop Review 1",
      url: "https://techsite.com/art1",
      domain: "techsite.com",
      snippet: "Benchmark 1",
      score: 10,
    },
    {
      id: "b",
      title: "RTX 4060 Laptop Review 2",
      url: "https://techsite.com/art2",
      domain: "techsite.com",
      snippet: "Benchmark 2",
      score: 9,
    },
    {
      id: "c",
      title: "RTX 4060 Laptop Review 3",
      url: "https://techsite.com/art3",
      domain: "techsite.com",
      snippet: "Benchmark 3",
      score: 8,
    },
    {
      id: "d",
      title: "RTX 4060 Tom's Hardware",
      url: "https://tomshardware.com/review",
      domain: "tomshardware.com",
      snippet: "Tom's benchmark",
      score: 7,
    },
    {
      id: "e",
      title: "RTX 4060 AnandTech",
      url: "https://anandtech.com/review",
      domain: "anandtech.com",
      snippet: "AnandTech benchmark",
      score: 6,
    },
  ];

  const selected = rankAndSelectSources(candidates, query, {
    maxContextResults: 3,
    maxPerDomain: 2,
  });

  // Exactly 3 selected
  assert.equal(selected.length, 3);

  // Domains check: techsite.com should appear at most twice
  const techsiteCount = selected.filter((s) => s.domain === "techsite.com").length;
  assert.equal(techsiteCount, 2);

  // Sequential IDs reassigned 1, 2, 3
  assert.equal(selected[0].id, "1");
  assert.equal(selected[1].id, "2");
  assert.equal(selected[2].id, "3");
});
