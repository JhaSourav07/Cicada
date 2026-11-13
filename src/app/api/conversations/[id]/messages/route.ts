import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { MessageRepository } from "@/lib/db/repositories/message.repository";
import { messageDocToDTO } from "@/lib/db/types";

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
 * GET /api/conversations/[id]/messages
 * Cursor-based message pagination endpoint.
 * Query params:
 * - limit: number of messages (default 20, max 100)
 * - before: ObjectId of the earliest currently loaded message (fetches older messages)
 * - after: ObjectId of the latest currently loaded message (fetches newer messages)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const objectId = parseValidObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20),
      100
    );

    const beforeParam = searchParams.get("before");
    const afterParam = searchParams.get("after");

    let beforeId: ObjectId | undefined;
    if (beforeParam) {
      const parsed = parseValidObjectId(beforeParam);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid before cursor" }, { status: 400 });
      }
      beforeId = parsed;
    }

    let afterId: ObjectId | undefined;
    if (afterParam) {
      const parsed = parseValidObjectId(afterParam);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid after cursor" }, { status: 400 });
      }
      afterId = parsed;
    }

    // Fetch limit + 1 to reliably determine hasMore boundary
    const docs = await MessageRepository.findByConversationId(objectId, {
      limit: limit + 1,
      beforeId,
      afterId,
    });

    const hasMore = docs.length > limit;
    let paginatedDocs = docs;

    if (hasMore) {
      if (beforeId) {
        // With beforeId, the array is reversed ascending. The 0th element is the extra oldest item.
        paginatedDocs = docs.slice(1);
      } else {
        paginatedDocs = docs.slice(0, limit);
      }
    }

    const messages = paginatedDocs.map(messageDocToDTO);

    return NextResponse.json({
      messages,
      hasMore,
      count: messages.length,
      oldestId: messages.length > 0 ? messages[0].id : null,
      newestId: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch paginated messages";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
