import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeSSEStream } from "../src/lib/ai/sse-client";

test("consumeSSEStream correctly parses fragmented network chunks", async () => {
  const encoder = new TextEncoder();
  // Simulate fragmented network packets where a frame is split across chunks
  const packet1 = 'event: token\ndata: {"content":';
  const packet2 = '"Hello "}\n\nevent: token\ndata: {"content":"Cicada"}\n\n';
  const packet3 = 'event: done\ndata: {"finishReason":"stop"}\n\n';

  const collectedTokens: string[] = [];
  let finishReason = "";

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(packet1));
      controller.enqueue(encoder.encode(packet2));
      controller.enqueue(encoder.encode(packet3));
      controller.close();
    },
  });

  await consumeSSEStream(stream, {
    onToken: (t) => collectedTokens.push(t),
    onDone: (d) => {
      finishReason = d.finishReason;
    },
  });

  assert.equal(collectedTokens.join(""), "Hello Cicada");
  assert.equal(finishReason, "stop");
});

test("consumeSSEStream delivers error events", async () => {
  const encoder = new TextEncoder();
  const packet = 'event: error\ndata: {"code":"MODEL_NOT_FOUND","message":"Model not installed"}\n\n';

  let capturedErrorCode = "";
  let capturedErrorMessage = "";

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(packet));
      controller.close();
    },
  });

  await consumeSSEStream(stream, {
    onError: (err) => {
      capturedErrorCode = err.code;
      capturedErrorMessage = err.message;
    },
  });

  assert.equal(capturedErrorCode, "MODEL_NOT_FOUND");
  assert.equal(capturedErrorMessage, "Model not installed");
});
