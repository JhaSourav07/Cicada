import { getDatabase, DatabaseError } from "./mongodb";
import { CONVERSATIONS_COLLECTION } from "./repositories/conversation.repository";
import { MESSAGES_COLLECTION } from "./repositories/message.repository";

export interface IndexDefinition {
  name: string;
  key: Record<string, 1 | -1 | "text">;
}

export interface CollectionIndexReport {
  collection: string;
  indexes: IndexDefinition[];
}

/**
 * Ensures required performance indexes exist on MongoDB collections.
 * MongoDB createIndex() is idempotent: if the index already exists with identical
 * keys and options, it is a no-op.
 */
export async function ensureDatabaseIndexes(): Promise<CollectionIndexReport[]> {
  try {
    const db = await getDatabase();
    const conversationsCol = db.collection(CONVERSATIONS_COLLECTION);
    const messagesCol = db.collection(MESSAGES_COLLECTION);

    // 1. Conversations Collection Indexes
    // - updatedAt: -1 -> fast sidebar listing sorted by recent activity
    // - createdAt: -1 -> secondary chronological sorting
    await conversationsCol.createIndex(
      { updatedAt: -1, _id: -1 },
      { name: "idx_conversations_updatedAt" }
    );
    await conversationsCol.createIndex(
      { createdAt: -1 },
      { name: "idx_conversations_createdAt" }
    );

    // 2. Messages Collection Indexes
    // - conversationId: 1, createdAt: 1, _id: 1 -> compound index for fast conversation retrieval & cursor pagination
    await messagesCol.createIndex(
      { conversationId: 1, createdAt: 1, _id: 1 },
      { name: "idx_messages_conversation_chronological" }
    );
    // - conversationId: 1, role: 1 -> compound index for role queries or filtering
    await messagesCol.createIndex(
      { conversationId: 1, role: 1 },
      { name: "idx_messages_conversation_role" }
    );

    return await listDatabaseIndexes();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Index creation failed";
    throw new DatabaseError(`Failed to ensure database indexes: ${msg}`, "INDEX_ERROR", 500);
  }
}

/**
 * Lists all active indexes on CICADA database collections.
 */
export async function listDatabaseIndexes(): Promise<CollectionIndexReport[]> {
  try {
    const db = await getDatabase();
    const reports: CollectionIndexReport[] = [];

    const collections = [CONVERSATIONS_COLLECTION, MESSAGES_COLLECTION];
    for (const name of collections) {
      const col = db.collection(name);
      const rawIndexes = await col.indexes();
      reports.push({
        collection: name,
        indexes: rawIndexes.map((idx) => ({
          name: idx.name || "unknown",
          key: (idx.key as Record<string, 1 | -1 | "text">) || {},
        })),
      });
    }

    return reports;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Index listing failed";
    throw new DatabaseError(`Failed to list indexes: ${msg}`, "INDEX_ERROR", 500);
  }
}
