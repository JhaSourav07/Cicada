import { NextRequest, NextResponse } from "next/server";
import { prepareChatContext } from "@/lib/ai/orchestrator";
import { ollamaClient, OllamaError } from "@/lib/ai/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatSSE(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  // 1. Validate request and assemble context
  let context;
  try {
    context = await prepareChatContext(body);
  } catch (err: unknown) {
    if (err instanceof OllamaError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to prepare chat context", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  const { model, conversationId, preparedMessages } = context;
  const encoder = new TextEncoder();

  // 2. Stream generation via Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial start event
      controller.enqueue(
        encoder.encode(
          formatSSE("start", {
            conversationId,
            model,
            timestamp: new Date().toISOString(),
          })
        )
      );

      try {
        const tokenStream = ollamaClient.chatStream({
          model,
          messages: preparedMessages,
          signal: req.signal,
        });

        for await (const chunk of tokenStream) {
          if (req.signal.aborted) {
            break;
          }

          // Emit content tokens
          if (chunk.message?.content) {
            controller.enqueue(
              encoder.encode(
                formatSSE("token", {
                  content: chunk.message.content,
                })
              )
            );
          }

          // Emit completion event on final chunk
          if (chunk.done) {
            controller.enqueue(
              encoder.encode(
                formatSSE("done", {
                  finishReason: chunk.done_reason || "stop",
                  evalCount: chunk.eval_count,
                  evalDuration: chunk.eval_duration,
                  totalDuration: chunk.total_duration,
                })
              )
            );
            break;
          }
        }
      } catch (err: unknown) {
        if (req.signal.aborted) {
          // Client deliberately aborted the request
          return;
        }

        const errorCode = err instanceof OllamaError ? err.code : "STREAM_ERROR";
        const errorMessage = err instanceof Error ? err.message : "Unknown streaming error";

        controller.enqueue(
          encoder.encode(
            formatSSE("error", {
              code: errorCode,
              message: errorMessage,
            })
          )
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Stream consumer cancelled
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
