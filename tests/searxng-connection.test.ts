import { test } from "node:test";
import assert from "node:assert/strict";
import { getSearchConfig, SearchConfigSchema } from "../src/lib/search/config";

test("getSearchConfig loads loopback defaults and validates boundaries", () => {
  const config = getSearchConfig();
  assert.equal(config.baseUrl, "http://127.0.0.1:8080");
  assert.equal(config.automaticSearch, true);
  assert.equal(config.timeoutMs, 10000);
  assert.equal(config.maxResults, 8);
  assert.equal(config.maxContextResults, 5);

  // Reject non-localhost/non-loopback URLs
  assert.throws(() => {
    SearchConfigSchema.parse({
      baseUrl: "https://google.com",
    });
  });
});

test("SearXNG local instance responds with valid JSON payload", async () => {
  const config = getSearchConfig();
  const url = `${config.baseUrl}/search?q=typescript&format=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  });
  clearTimeout(timeout);

  assert.equal(res.status, 200);
  const contentType = res.headers.get("content-type") || "";
  assert.ok(contentType.includes("json"));

  const data = await res.json();
  assert.equal(data.query, "typescript");
  assert.ok(Array.isArray(data.results));
  assert.ok(data.results.length > 0);

  const firstResult = data.results[0];
  assert.ok(typeof firstResult.url === "string");
  assert.ok(typeof firstResult.title === "string");
});
