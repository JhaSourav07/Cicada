import { NextRequest, NextResponse } from "next/server";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import {
  CreateConversationSchema,
  conversationDocToDTO,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/conversations
 * Lists persistent conversations sorted by most recently updated.
 * Query params: ?search=...&limit=50&skip=0
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.has("limit")
      ? Math.max(1, parseInt(searchParams.get("limit")!, 10) || 50)
      : 50;
    const skip = searchParams.has("skip")
      ? Math.max(0, parseInt(searchParams.get("skip")!, 10) || 0)
      : 0;

    const conversations = await ConversationRepository.list({
      search,
      limit,
      skip,
    });

    return NextResponse.json({
      conversations: conversations.map(conversationDocToDTO),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list conversations";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * Creates a new conversation document.
 */
export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed, defaults will be used
    }

    const parseResult = CreateConversationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const conv = await ConversationRepository.create(parseResult.data);
    return NextResponse.json(
      { conversation: conversationDocToDTO(conv) },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
