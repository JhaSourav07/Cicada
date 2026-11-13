import { test, after } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";
import { GET as getMessages } from "../src/app/api/conversations/[id]/messages/route";
import { ConversationRepository } from "../src/lib/db/repositories/conversation.repository";
import { MessageRepository } from "../src/lib/db/repositories/message.repository";
import { closeDatabaseConnection, getDatabase } from "../src/lib/db/mongodb";

const testConvIds: ObjectId[] = [];

test("Cursor pagination /api/conversations/[id]/messages", async () => {
  // Create conversation
  const conv = await ConversationRepository.create({
    title: "Cursor Pagination Test",
    model: "qwen3.5:9b",
  });
  testConvIds.push(conv._id);
  const convIdStr = conv._id.toHexString();

  // Create 15 messages (indexed 0 to 14)
  const createdMsgIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const msg = await MessageRepository.create({
      conversationId: conv._id,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message #${i}`,
    });
    createdMsgIds.push(msg._id.toHexString());
  }

  // 1. Fetch first batch with limit=5
  const req1 = new NextRequest(
    `http://127.0.0.1:3000/api/conversations/${convIdStr}/messages?limit=5`
  );
  const res1 = await getMessages(req1, {
    params: Promise.resolve({ id: convIdStr }),
  });
  assert.equal(res1.status, 200);
  const data1 = await res1.json();

  assert.equal(data1.messages.length, 5);
  assert.equal(data1.hasMore, true);
  assert.equal(data1.messages[0].content, "Message #0");
  assert.equal(data1.messages[4].content, "Message #4");

  // 2. Fetch older messages before Message #10 with limit=5
  const beforeCursor = createdMsgIds[10];
  const req2 = new NextRequest(
    `http://127.0.0.1:3000/api/conversations/${convIdStr}/messages?limit=5&before=${beforeCursor}`
  );
  const res2 = await getMessages(req2, {
    params: Promise.resolve({ id: convIdStr }),
  });
  assert.equal(res2.status, 200);
  const data2 = await res2.json();

  assert.equal(data2.messages.length, 5);
  // Messages right before #10 are #5, #6, #7, #8, #9
  assert.equal(data2.messages[0].content, "Message #5");
  assert.equal(data2.messages[4].content, "Message #9");
  // There are messages before #5 (#0 through #4), so hasMore should be true
  assert.equal(data2.hasMore, true);

  // 3. Test invalid cursor parameter returns 400
  const reqInvalid = new NextRequest(
    `http://127.0.0.1:3000/api/conversations/${convIdStr}/messages?before=not-a-valid-cursor`
  );
  const resInvalid = await getMessages(reqInvalid, {
    params: Promise.resolve({ id: convIdStr }),
  });
  assert.equal(resInvalid.status, 400);
});

after(async () => {
  if (testConvIds.length > 0) {
    const db = await getDatabase();
    await db.collection("conversations").deleteMany({ _id: { $in: testConvIds } });
    await db.collection("messages").deleteMany({ conversationId: { $in: testConvIds } });
  }
  await closeDatabaseConnection();
});
