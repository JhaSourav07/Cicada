import { NextRequest, NextResponse } from "next/server";
import { initializeChatSession } from "@/lib/ai/orchestrator";
import { ollamaClient, OllamaError } from "@/lib/ai/ollama";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { validateCitations } from "@/lib/search/citations";

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

  // 1. Initialize session: persist user message, execute search if indicated, build context
  let session;
  try {
    session = await initializeChatSession(body, { signal: req.signal });
  } catch (err: unknown) {
    if (err instanceof OllamaError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Failed to initialize chat session";
    return NextResponse.json(
      { error: msg, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  const { conversation, targetModel, preparedMessages, userMessageDoc, searchPlan } = session;
  const convIdStr = conversation._id.toHexString();
  const encoder = new TextEncoder();

  let accumulatedContent = "";
  let isSaved = false;

  const saveAssistantMessage = async (status: "complete" | "interrupted") => {
    if (isSaved) return;
    isSaved = true;

    try {
      if (accumulatedContent.length > 0) {
        // Validate citations against retrieved sources
        const validation = validateCitations(accumulatedContent, searchPlan.sources);

        const assistantDoc = await MessageRepository.create({
          conversationId: conversation._id,
          role: "assistant",
          content: accumulatedContent,
          model: targetModel,
          status,
          sources: validation.activeSources.length > 0 ? validation.activeSources : undefined,
          searchMetadata: {
            searched: searchPlan.searched,
            query: searchPlan.query,
            resultCount: searchPlan.sources.length,
            searchMode: searchPlan.searchMode,
            decisionReason: searchPlan.decision.reason,
          },
        });
        await ConversationRepository.incrementMessageCount(conversation._id, 2);
        return { assistantDoc, activeSources: validation.activeSources };
      } else {
        // Only user message was saved
        await ConversationRepository.incrementMessageCount(conversation._id, 1);
        return null;
      }
    } catch (saveErr) {
      console.error("Failed to persist assistant message to MongoDB:", saveErr);
      return null;
    }
  };

  // 2. Stream generation via Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial start event with DB conversationId and title
      controller.enqueue(
        encoder.encode(
          formatSSE("start", {
            conversationId: convIdStr,
            title: conversation.title,
            userMessageId: userMessageDoc._id.toHexString(),
            model: targetModel,
            timestamp: new Date().toISOString(),
          })
        )
      );

      // If search was executed, emit search lifecycle events
      if (searchPlan.searched && searchPlan.query) {
        controller.enqueue(
          encoder.encode(
            formatSSE("search_started", {
              query: searchPlan.query,
            })
          )
        );

        controller.enqueue(
          encoder.encode(
            formatSSE("search_completed", {
              resultCount: searchPlan.sources.length,
            })
          )
        );

        if (searchPlan.sources.length > 0) {
          controller.enqueue(
            encoder.encode(
              formatSSE("sources", {
                sources: searchPlan.sources,
              })
            )
          );
        }
      }

      try {
        const tokenStream = ollamaClient.chatStream({
          model: targetModel,
          messages: preparedMessages,
          signal: req.signal,
        });

        for await (const chunk of tokenStream) {
          if (req.signal.aborted) {
            await saveAssistantMessage("interrupted");
            break;
          }

          // Emit content tokens
          if (chunk.message?.content) {
            accumulatedContent += chunk.message.content;
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
            const saved = await saveAssistantMessage("complete");
            controller.enqueue(
              encoder.encode(
                formatSSE("done", {
                  conversationId: convIdStr,
                  messageId: saved?.assistantDoc ? saved.assistantDoc._id.toHexString() : null,
                  finishReason: chunk.done_reason || "stop",
                  evalCount: chunk.eval_count,
                  evalDuration: chunk.eval_duration,
                  totalDuration: chunk.total_duration,
                  sources: saved?.activeSources || [],
                })
              )
            );
            break;
          }
        }
      } catch (err: unknown) {
        if (req.signal.aborted) {
          await saveAssistantMessage("interrupted");
          return;
        }

        await saveAssistantMessage("interrupted");
        const errorCode = err instanceof OllamaError ? err.code : "STREAM_ERROR";
        const errorMessage = err instanceof Error ? err.message : "Streaming generation failure";

        controller.enqueue(
          encoder.encode(
            formatSSE("error", {
              code: errorCode,
              message: errorMessage,
            })
          )
        );
      } finally {
        // Ensure assistant message is saved if stream ended abnormally without done flag
        if (!isSaved) {
          await saveAssistantMessage("interrupted");
        }
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
