import { test, after } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { initializeChatSession } from "../src/lib/ai/orchestrator";
import { ConversationRepository } from "../src/lib/db/repositories/conversation.repository";
import { MessageRepository } from "../src/lib/db/repositories/message.repository";
import { closeDatabaseConnection, getDatabase } from "../src/lib/db/mongodb";

const testConvIds: ObjectId[] = [];

test("initializeChatSession creates conversation, sets title and persists user message", async () => {
  const session = await initializeChatSession({
    message: "Explain the difference between synchronous and asynchronous I/O",
  });

  assert.ok(session.conversation._id instanceof ObjectId);
  testConvIds.push(session.conversation._id);

  assert.ok(session.conversation.title.startsWith("Explain the difference"));
  assert.equal(session.userMessageDoc.role, "user");
  assert.equal(
    session.userMessageDoc.content,
    "Explain the difference between synchronous and asynchronous I/O"
  );

  // Verify message in MongoDB
  const savedMessages = await MessageRepository.findByConversationId(
    session.conversation._id
  );
  assert.equal(savedMessages.length, 1);
  assert.equal(savedMessages[0]._id.toHexString(), session.userMessageDoc._id.toHexString());
});

test("initializeChatSession binds to existing conversation and reconstructs context", async () => {
  // Create conversation
  const conv = await ConversationRepository.create({
    title: "Multi-turn Persistence Test",
    model: "qwen3.5:9b",
  });
  testConvIds.push(conv._id);

  // Turn 1
  await MessageRepository.create({
    conversationId: conv._id,
    role: "user",
    content: "What is Redis?",
  });
  await MessageRepository.create({
    conversationId: conv._id,
    role: "assistant",
    content: "Redis is an in-memory key-value data store.",
    model: "qwen3.5:9b",
    status: "complete",
  });
  await ConversationRepository.incrementMessageCount(conv._id, 2);

  // Turn 2 via initializeChatSession
  const session = await initializeChatSession({
    conversationId: conv._id.toHexString(),
    message: "Does it support pub/sub?",
  });

  assert.equal(session.conversation._id.toHexString(), conv._id.toHexString());
  // Context should include system prompt + previous turn + current turn
  assert.ok(session.preparedMessages.length >= 4);

  const roles = session.preparedMessages.map((m) => m.role);
  assert.deepEqual(roles, ["system", "user", "assistant", "user"]);
  assert.equal(session.preparedMessages[1].content, "What is Redis?");
  assert.equal(session.preparedMessages[3].content, "Does it support pub/sub?");
});

after(async () => {
  if (testConvIds.length > 0) {
    const db = await getDatabase();
    await db.collection("conversations").deleteMany({ _id: { $in: testConvIds } });
    await db.collection("messages").deleteMany({ conversationId: { $in: testConvIds } });
  }
  await closeDatabaseConnection();
});
