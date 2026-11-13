import { test } from "node:test";
import assert from "node:assert/strict";
import { SearxngClient, SearchError } from "../src/lib/search/searxng";

test("SearxngClient rejects empty or whitespace queries", async () => {
  const client = new SearxngClient();
  await assert.rejects(
    async () => {
      await client.search("   ");
    },
    (err: unknown) => {
      assert.ok(err instanceof SearchError);
      assert.equal(err.code, "INVALID_QUERY");
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test("SearxngClient queries local SearXNG instance successfully", async () => {
  const client = new SearxngClient();
  const res = await client.search("Fedora Linux");

  assert.equal(res.query, "Fedora Linux");
  assert.ok(Array.isArray(res.results));
  assert.ok(res.results.length > 0);
  assert.ok(res.results[0].title);
  assert.ok(res.results[0].url);
});

test("SearxngClient respects caller AbortSignal immediately", async () => {
  const client = new SearxngClient();
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    async () => {
      await client.search("Next.js App Router", { signal: controller.signal });
    },
    (err: unknown) => {
      assert.ok(err instanceof SearchError);
      assert.equal(err.code, "ABORTED");
      return true;
    }
  );
});

test("SearxngClient handles unreachable server with SEARCH_UNAVAILABLE", async () => {
  // Use unused port to simulate unavailable server
  const client = new SearxngClient({ baseUrl: "http://127.0.0.1:59999", timeoutMs: 1000 });
  await assert.rejects(
    async () => {
      await client.search("test");
    },
    (err: unknown) => {
      assert.ok(err instanceof SearchError);
      assert.equal(err.code, "SEARCH_UNAVAILABLE");
      return true;
    }
  );
});

test("SearxngClient ping() reports latency and connectivity", async () => {
  const client = new SearxngClient();
  const ping = await client.ping();
  assert.equal(ping.connected, true);
  assert.ok(typeof ping.latencyMs === "number");
});
