import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as createConv, GET as listConvs } from "../src/app/api/conversations/route";
import {
  GET as getConv,
  PATCH as patchConv,
  DELETE as deleteConv,
} from "../src/app/api/conversations/[id]/route";
import { MessageRepository } from "../src/lib/db/repositories/message.repository";
import { closeDatabaseConnection } from "../src/lib/db/mongodb";

const createdConvIds: string[] = [];

test("POST /api/conversations creates a new conversation", async () => {
  const req = new NextRequest("http://127.0.0.1:3000/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "API Test Chat", model: "qwen3.5:9b" }),
  });

  const res = await createConv(req);
  assert.equal(res.status, 201);
  const data = await res.json();

  assert.ok(data.conversation?.id);
  assert.equal(data.conversation.title, "API Test Chat");
  assert.equal(data.conversation.model, "qwen3.5:9b");
  createdConvIds.push(data.conversation.id);
});

test("GET /api/conversations returns list of conversations", async () => {
  const req = new NextRequest("http://127.0.0.1:3000/api/conversations?limit=10");
  const res = await listConvs(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.conversations));
  assert.ok(data.conversations.length > 0);
});

test("GET /api/conversations/[id] validates ID and returns conversation with messages", async () => {
  // Test invalid hex id returns 400
  const invalidReq = new NextRequest("http://127.0.0.1:3000/api/conversations/not-valid");
  const invalidRes = await getConv(invalidReq, {
    params: Promise.resolve({ id: "not-valid" }),
  });
  assert.equal(invalidRes.status, 400);

  // Test non-existent id returns 404
  const nonExistentReq = new NextRequest(
    "http://127.0.0.1:3000/api/conversations/000000000000000000000000"
  );
  const notFoundRes = await getConv(nonExistentReq, {
    params: Promise.resolve({ id: "000000000000000000000000" }),
  });
  assert.equal(notFoundRes.status, 404);

  // Test valid created conversation
  const testId = createdConvIds[0];
  // Add a test message to it
  await MessageRepository.create({
    conversationId: testId,
    role: "user",
    content: "Testing API message retrieval",
  });

  const validReq = new NextRequest(`http://127.0.0.1:3000/api/conversations/${testId}`);
  const validRes = await getConv(validReq, {
    params: Promise.resolve({ id: testId }),
  });
  assert.equal(validRes.status, 200);
  const data = await validRes.json();
  assert.equal(data.conversation.id, testId);
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].content, "Testing API message retrieval");
});

test("PATCH /api/conversations/[id] updates conversation metadata", async () => {
  const testId = createdConvIds[0];
  const req = new NextRequest(`http://127.0.0.1:3000/api/conversations/${testId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Renamed Title" }),
  });

  const res = await patchConv(req, {
    params: Promise.resolve({ id: testId }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.conversation.title, "Renamed Title");
});

test("DELETE /api/conversations/[id] cascade deletes conversation and messages", async () => {
  const testId = createdConvIds[0];
  const req = new NextRequest(`http://127.0.0.1:3000/api/conversations/${testId}`, {
    method: "DELETE",
  });

  const res = await deleteConv(req, {
    params: Promise.resolve({ id: testId }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.deletedMessagesCount >= 1);

  // Subsequent GET must return 404
  const getReq = new NextRequest(`http://127.0.0.1:3000/api/conversations/${testId}`);
  const getRes = await getConv(getReq, {
    params: Promise.resolve({ id: testId }),
  });
  assert.equal(getRes.status, 404);
});

after(async () => {
  await closeDatabaseConnection();
});
