import { test, after } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { ensureDatabaseIndexes, listDatabaseIndexes } from "../src/lib/db/indexes";
import { getDatabase, closeDatabaseConnection } from "../src/lib/db/mongodb";
import { CONVERSATIONS_COLLECTION } from "../src/lib/db/repositories/conversation.repository";
import { MESSAGES_COLLECTION } from "../src/lib/db/repositories/message.repository";

test("ensureDatabaseIndexes creates required indexes idempotently", async () => {
  const reports = await ensureDatabaseIndexes();
  assert.ok(Array.isArray(reports));

  const convReport = reports.find((r) => r.collection === CONVERSATIONS_COLLECTION);
  assert.ok(convReport, "Conversations collection report missing");
  const convIndexNames = convReport.indexes.map((idx) => idx.name);
  assert.ok(convIndexNames.includes("idx_conversations_updatedAt"));
  assert.ok(convIndexNames.includes("idx_conversations_createdAt"));

  const msgReport = reports.find((r) => r.collection === MESSAGES_COLLECTION);
  assert.ok(msgReport, "Messages collection report missing");
  const msgIndexNames = msgReport.indexes.map((idx) => idx.name);
  assert.ok(msgIndexNames.includes("idx_messages_conversation_chronological"));
  assert.ok(msgIndexNames.includes("idx_messages_conversation_role"));

  // Second run must be idempotent and succeed without errors
  const secondReports = await ensureDatabaseIndexes();
  assert.equal(secondReports.length, reports.length);
});

test("listDatabaseIndexes returns verified active index structures", async () => {
  const reports = await listDatabaseIndexes();
  assert.ok(reports.length >= 2);
});

test("Index query plan uses IXSCAN for conversation message lookups", async () => {
  const db = await getDatabase();
  const testConvId = new ObjectId();

  // Explain query for chronological message retrieval
  const explainResult = await db
    .collection(MESSAGES_COLLECTION)
    .find({ conversationId: testConvId })
    .sort({ createdAt: 1, _id: 1 })
    .explain("executionStats");

  const queryPlanner = explainResult.queryPlanner as {
    winningPlan?: {
      stage?: string;
      inputStage?: {
        stage?: string;
        indexName?: string;
      };
    };
  };

  const winningStage = queryPlanner?.winningPlan?.stage;
  const inputStage = queryPlanner?.winningPlan?.inputStage?.stage;
  const indexName = queryPlanner?.winningPlan?.inputStage?.indexName;

  // Either stage is FETCH with inputStage IXSCAN, or directly IXSCAN
  const usesIndexScan =
    winningStage === "IXSCAN" ||
    inputStage === "IXSCAN" ||
    indexName === "idx_messages_conversation_chronological";

  assert.ok(
    usesIndexScan,
    `Expected IXSCAN, got winningStage=${winningStage}, inputStage=${inputStage}`
  );
});

after(async () => {
  await closeDatabaseConnection();
});
