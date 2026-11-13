import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import {
  generateConversationTitle,
  conversationDocToDTO,
  messageDocToDTO,
  ConversationDocument,
  MessageDocument,
} from "../src/lib/db/types";
import { ConversationRepository } from "../src/lib/db/repositories/conversation.repository";
import { MessageRepository } from "../src/lib/db/repositories/message.repository";
import { SettingsRepository } from "../src/lib/db/repositories/settings.repository";
import { closeDatabaseConnection, getDatabase } from "../src/lib/db/mongodb";

const testConvIds: ObjectId[] = [];

test("generateConversationTitle truncates cleanly at word boundaries", () => {
  const shortPrompt = "How do neural nets learn?";
  assert.equal(generateConversationTitle(shortPrompt), "How do neural nets learn?");

  const longPrompt =
    "Can you please explain how backpropagation and gradient descent work in deep learning models step by step?";
  const title = generateConversationTitle(longPrompt, 40);
  assert.ok(title.length <= 43); // 40 chars + "..."
  assert.ok(title.endsWith("..."));
  assert.ok(!title.includes("\n"));
});

test("DTO conversion helpers serialize ObjectIds and Dates to ISO strings", () => {
  const convDoc: ConversationDocument = {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    title: "Test Chat",
    model: "qwen3.5:9b",
    createdAt: new Date("2026-11-13T10:00:00.000Z"),
    updatedAt: new Date("2026-11-13T10:05:00.000Z"),
    messageCount: 2,
  };

  const convDTO = conversationDocToDTO(convDoc);
  assert.equal(convDTO.id, "507f1f77bcf86cd799439011");
  assert.equal(convDTO.title, "Test Chat");
  assert.equal(convDTO.createdAt, "2026-11-13T10:00:00.000Z");

  const msgDoc: MessageDocument = {
    _id: new ObjectId("507f1f77bcf86cd799439012"),
    conversationId: convDoc._id,
    role: "user",
    content: "Hello assistant",
    model: null,
    status: "complete",
    createdAt: new Date("2026-11-13T10:00:00.000Z"),
  };

  const msgDTO = messageDocToDTO(msgDoc);
  assert.equal(msgDTO.id, "507f1f77bcf86cd799439012");
  assert.equal(msgDTO.conversationId, "507f1f77bcf86cd799439011");
  assert.equal(msgDTO.role, "user");
});

test("ConversationRepository CRUD lifecycle", async () => {
  // Create
  const conv = await ConversationRepository.create({
    title: "Test Persistence",
    model: "qwen3.5:9b",
  });
  testConvIds.push(conv._id);

  assert.ok(conv._id instanceof ObjectId);
  assert.equal(conv.title, "Test Persistence");
  assert.equal(conv.messageCount, 0);

  // FindById
  const found = await ConversationRepository.findById(conv._id);
  assert.ok(found);
  assert.equal(found?.title, "Test Persistence");

  // Update
  const updated = await ConversationRepository.update(conv._id, {
    title: "Updated Title",
  });
  assert.equal(updated?.title, "Updated Title");

  // Increment message count
  await ConversationRepository.incrementMessageCount(conv._id, 2);
  const reloaded = await ConversationRepository.findById(conv._id);
  assert.equal(reloaded?.messageCount, 2);

  // List with search
  const list = await ConversationRepository.list({ search: "Updated" });
  assert.ok(list.some((c) => c._id.equals(conv._id)));
});

test("MessageRepository CRUD and cursor retrieval", async () => {
  const conv = await ConversationRepository.create({ title: "Message Test Conv" });
  testConvIds.push(conv._id);

  // Add user message
  const userMsg = await MessageRepository.create({
    conversationId: conv._id,
    role: "user",
    content: "What is quantum computing?",
  });
  assert.ok(userMsg._id instanceof ObjectId);
  assert.equal(userMsg.role, "user");

  // Add assistant message
  const assistantMsg = await MessageRepository.create({
    conversationId: conv._id,
    role: "assistant",
    content: "Quantum computing utilizes qubits...",
    model: "qwen3.5:9b",
    status: "complete",
  });
  assert.equal(assistantMsg.role, "assistant");
  assert.equal(assistantMsg.model, "qwen3.5:9b");

  // Find chronological
  const messages = await MessageRepository.findByConversationId(conv._id);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "assistant");

  // Update content and status (e.g. interruption)
  await MessageRepository.updateContentAndStatus(
    assistantMsg._id,
    "Quantum computing utilizes qubits [interrupted]",
    "interrupted"
  );
  const updated = await MessageRepository.findByConversationId(conv._id);
  assert.equal(updated[1].status, "interrupted");
  assert.ok(updated[1].content.includes("[interrupted]"));

  // Delete by conversation
  const deletedCount = await MessageRepository.deleteByConversationId(conv._id);
  assert.equal(deletedCount, 2);
  const remaining = await MessageRepository.countByConversationId(conv._id);
  assert.equal(remaining, 0);
});

test("SettingsRepository reads defaults and persists updates", async () => {
  const settings = await SettingsRepository.getSettings();
  assert.ok(settings._id);
  assert.ok(typeof settings.temperature === "number");
  assert.ok(typeof settings.contextLength === "number");

  const updated = await SettingsRepository.updateSettings({
    temperature: 0.8,
  });
  assert.equal(updated.temperature, 0.8);
});

after(async () => {
  // Clean up test conversations
  if (testConvIds.length > 0) {
    const db = await getDatabase();
    await db.collection("conversations").deleteMany({ _id: { $in: testConvIds } });
    await db.collection("messages").deleteMany({ conversationId: { $in: testConvIds } });
  }
  await closeDatabaseConnection();
});
