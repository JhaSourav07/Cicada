import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ConversationRepository } from "@/lib/db/repositories/conversation.repository";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import {
  UpdateConversationSchema,
  conversationDocToDTO,
  messageDocToDTO,
} from "@/lib/db/types";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseValidObjectId(idStr: string): ObjectId | null {
  if (!ObjectId.isValid(idStr)) return null;
  const parsed = new ObjectId(idStr);
  if (parsed.toHexString() !== idStr) return null;
  return parsed;
}

/**
 * GET /api/conversations/[id]
 * Retrieves conversation metadata and chronological messages.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const objectId = parseValidObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const conversation = await ConversationRepository.findById(objectId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const messages = await MessageRepository.findByConversationId(objectId);

    return NextResponse.json({
      conversation: conversationDocToDTO(conversation),
      messages: messages.map(messageDocToDTO),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id]
 * Updates title or model of a conversation.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const objectId = parseValidObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateConversationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const updated = await ConversationRepository.update(objectId, parseResult.data);
    if (!updated) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: conversationDocToDTO(updated),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * Cascading delete: removes conversation document and all associated messages.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const objectId = parseValidObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const deleted = await ConversationRepository.delete(objectId);
    if (!deleted) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Cascade delete all messages
    const deletedMessagesCount = await MessageRepository.deleteByConversationId(objectId);

    return NextResponse.json({
      success: true,
      deletedId: id,
      deletedMessagesCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete conversation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
