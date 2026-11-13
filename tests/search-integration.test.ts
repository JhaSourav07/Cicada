import { test, after } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { initializeChatSession } from "../src/lib/ai/orchestrator";
import { ConversationRepository } from "../src/lib/db/repositories/conversation.repository";
import { MessageRepository } from "../src/lib/db/repositories/message.repository";
import { closeDatabaseConnection, getDatabase } from "../src/lib/db/mongodb";
import { SearxngClient } from "../src/lib/search/searxng";
import { SearchSource } from "../src/lib/search/types";

const testConvIds: ObjectId[] = [];

test("initializeChatSession triggers search when query contains temporal keywords", async () => {
  const session = await initializeChatSession({
    message: "What is the current version and release status of Fedora Linux?",
    searchMode: "auto",
  });

  assert.ok(session.conversation._id instanceof ObjectId);
  testConvIds.push(session.conversation._id);

  // Decision should trigger search
  assert.equal(session.searchPlan.decision.shouldSearch, true);
  assert.ok(session.searchPlan.searched, "Search should have been executed");
  assert.ok(session.searchPlan.query && session.searchPlan.query.length > 0);

  // Should have retrieved sources from local SearXNG
  assert.ok(session.searchPlan.sources.length > 0, "Should have retrieved ranked sources");
  assert.ok(session.searchPlan.sources[0].url.startsWith("http"));
  assert.ok(session.searchPlan.sources[0].domain.length > 0);

  // System prompt in preparedMessages must contain the search context block
  const systemPrompt = session.preparedMessages[0].content;
  assert.ok(systemPrompt.includes("[SEARCH RESULTS - EVIDENCE ONLY]"));
  assert.ok(systemPrompt.includes(session.searchPlan.sources[0].title));
});

test("initializeChatSession skips search for foundational programming questions", async () => {
  const session = await initializeChatSession({
    message: "How does a binary search algorithm work in TypeScript?",
    searchMode: "auto",
  });

  assert.ok(session.conversation._id instanceof ObjectId);
  testConvIds.push(session.conversation._id);

  assert.equal(session.searchPlan.decision.shouldSearch, false);
  assert.equal(session.searchPlan.searched, false);
  assert.equal(session.searchPlan.sources.length, 0);

  // System prompt must NOT contain search evidence block
  const systemPrompt = session.preparedMessages[0].content;
  assert.ok(!systemPrompt.includes("[SEARCH RESULTS - EVIDENCE ONLY]"));
});

test("initializeChatSession respects searchMode manual overrides", async () => {
  // searchMode: "off" should suppress search even with temporal words
  const offSession = await initializeChatSession({
    message: "What is the latest news and updates today?",
    searchMode: "off",
  });
  testConvIds.push(offSession.conversation._id);

  assert.equal(offSession.searchPlan.decision.shouldSearch, false);
  assert.equal(offSession.searchPlan.searched, false);

  // searchMode: "on" should force search even for basic algorithms
  const onSession = await initializeChatSession({
    message: "How to reverse a linked list?",
    searchMode: "on",
  });
  testConvIds.push(onSession.conversation._id);

  assert.equal(onSession.searchPlan.decision.shouldSearch, true);
  assert.equal(onSession.searchPlan.searched, true);
});

test("searxngClient offline fallback handles unreachable host gracefully", async () => {
  const badClient = new SearxngClient({ baseUrl: "http://127.0.0.1:59999", timeoutMs: 500 });

  await assert.rejects(
    async () => {
      await badClient.search("test offline fallback query");
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test("MessageRepository correctly stores and retrieves sources and searchMetadata", async () => {
  const conv = await ConversationRepository.create({
    title: "Citation Storage Test",
    model: "qwen3.5:9b",
  });
  testConvIds.push(conv._id);

  const mockSources: SearchSource[] = [
    {
      id: "1",
      title: "Fedora Project Home",
      url: "https://fedoraproject.org/index.html",
      domain: "fedoraproject.org",
      snippet: "Fedora Linux is an innovative, free, open-source Linux platform.",
      score: 1.8,
    },
    {
      id: "2",
      title: "Fedora 41 Release Notes",
      url: "https://docs.fedoraproject.org/release-notes/f41",
      domain: "docs.fedoraproject.org",
      snippet: "Fedora 41 features updated packages including GCC 14 and GNOME 47.",
      score: 1.5,
    },
  ];

  const assistantMsg = await MessageRepository.create({
    conversationId: conv._id,
    role: "assistant",
    content: "Fedora Linux [1] has released Fedora 41 with GNOME 47 [2].",
    model: "qwen3.5:9b",
    status: "complete",
    sources: mockSources,
    searchMetadata: {
      searched: true,
      query: "Fedora Linux 41 release notes",
      resultCount: 2,
    },
  });

  assert.ok(assistantMsg._id instanceof ObjectId);

  const fetchedMessages = await MessageRepository.findByConversationId(conv._id);
  assert.equal(fetchedMessages.length, 1);

  const stored = fetchedMessages[0];
  assert.equal(stored.role, "assistant");
  assert.ok(stored.sources && stored.sources.length === 2);
  assert.equal(stored.sources[0].title, "Fedora Project Home");
  assert.equal(stored.sources[0].domain, "fedoraproject.org");
  assert.equal(stored.sources[1].id, "2");
  assert.ok(stored.searchMetadata?.searched);
  assert.equal(stored.searchMetadata?.query, "Fedora Linux 41 release notes");
  assert.equal(stored.searchMetadata?.resultCount, 2);
});

after(async () => {
  if (testConvIds.length > 0) {
    const db = await getDatabase();
    await db.collection("conversations").deleteMany({ _id: { $in: testConvIds } });
    await db.collection("messages").deleteMany({ conversationId: { $in: testConvIds } });
  }
  await closeDatabaseConnection();
});
