import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeSSEStream } from "../src/lib/ai/sse-client";

test("consumeSSEStream parses tokens and aborts cleanly when stream closes", async () => {
  const encoder = new TextEncoder();
  const chunks = [
    'event: start\ndata: {"conversationId":"test-1","model":"qwen3.5:9b"}\n\n',
    'event: token\ndata: {"content":"Hello"}\n\n',
    'event: token\ndata: {"content":" World"}\n\n',
  ];

  let receivedTokens: string[] = [];
  let isDone = false;

  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });

  await consumeSSEStream(stream, {
    onToken: (t) => receivedTokens.push(t),
    onDone: () => {
      isDone = true;
    },
  });

  assert.equal(receivedTokens.join(""), "Hello World");
  assert.equal(isDone, false); // No done event in chunk, simulated interrupted stream
});
