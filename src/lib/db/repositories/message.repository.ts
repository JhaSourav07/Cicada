import { Collection, ObjectId, Filter } from "mongodb";
import { getDatabase, DatabaseError } from "../mongodb";
import { MessageDocument, MessageStatus } from "../types";
import { SearchSource, SearchMetadata } from "../../search/types";

export const MESSAGES_COLLECTION = "messages";

export class MessageRepository {
  private static async getCollection(): Promise<Collection<MessageDocument>> {
    const db = await getDatabase();
    return db.collection<MessageDocument>(MESSAGES_COLLECTION);
  }

  /**
   * Persists a new message document.
   */
  static async create(data: {
    conversationId: string | ObjectId;
    role: "user" | "assistant" | "system";
    content: string;
    model?: string | null;
    status?: MessageStatus;
    sources?: SearchSource[];
    searchMetadata?: SearchMetadata;
  }): Promise<MessageDocument> {
    try {
      const collection = await this.getCollection();
      const conversationObjectId =
        typeof data.conversationId === "string"
          ? new ObjectId(data.conversationId)
          : data.conversationId;

      const doc: Omit<MessageDocument, "_id"> = {
        conversationId: conversationObjectId,
        role: data.role,
        content: data.content,
        model: data.model ?? null,
        status: data.status ?? "complete",
        sources: data.sources,
        searchMetadata: data.searchMetadata,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(doc as MessageDocument);
      return {
        ...doc,
        _id: result.insertedId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to persist message: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Finds messages for a conversation in chronological order (createdAt: 1, _id: 1).
   * Supports cursor pagination using beforeId (for older messages) or afterId (for newer messages).
   */
  static async findByConversationId(
    conversationId: string | ObjectId,
    options: {
      limit?: number;
      beforeId?: string | ObjectId;
      afterId?: string | ObjectId;
    } = {}
  ): Promise<MessageDocument[]> {
    try {
      const collection = await this.getCollection();
      const convId =
        typeof conversationId === "string"
          ? new ObjectId(conversationId)
          : conversationId;

      const filter: Filter<MessageDocument> = {
        conversationId: convId,
      };

      if (options.beforeId) {
        const beforeObjId =
          typeof options.beforeId === "string"
            ? new ObjectId(options.beforeId)
            : options.beforeId;
        filter._id = { $lt: beforeObjId };
      } else if (options.afterId) {
        const afterObjId =
          typeof options.afterId === "string"
            ? new ObjectId(options.afterId)
            : options.afterId;
        filter._id = { $gt: afterObjId };
      }

      const limit = Math.min(options.limit ?? 50, 100);

      // If beforeId is specified (loading older messages above), sort descending to get the closest ones,
      // then reverse to restore chronological display order.
      if (options.beforeId) {
        const docs = await collection
          .find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit)
          .toArray();
        return docs.reverse();
      }

      return await collection
        .find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .limit(limit)
        .toArray();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to fetch messages: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Retrieves the most recent N messages for context building in chronological order.
   */
  static async findRecent(
    conversationId: string | ObjectId,
    limit = 20
  ): Promise<MessageDocument[]> {
    try {
      const collection = await this.getCollection();
      const convId =
        typeof conversationId === "string"
          ? new ObjectId(conversationId)
          : conversationId;

      const docs = await collection
        .find({ conversationId: convId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .toArray();

      return docs.reverse();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to fetch recent messages: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Updates the status and content of a message (e.g. on stream finish or abort).
   */
  static async updateContentAndStatus(
    id: string | ObjectId,
    content: string,
    status: MessageStatus
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      const objectId = typeof id === "string" ? new ObjectId(id) : id;

      await collection.updateOne(
        { _id: objectId },
        {
          $set: {
            content,
            status,
          },
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to update message: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Deletes all messages belonging to a conversation.
   */
  static async deleteByConversationId(conversationId: string | ObjectId): Promise<number> {
    try {
      const collection = await this.getCollection();
      const convId =
        typeof conversationId === "string"
          ? new ObjectId(conversationId)
          : conversationId;

      const result = await collection.deleteMany({ conversationId: convId });
      return result.deletedCount;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to delete messages: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Counts total messages in a conversation.
   */
  static async countByConversationId(conversationId: string | ObjectId): Promise<number> {
    try {
      const collection = await this.getCollection();
      const convId =
        typeof conversationId === "string"
          ? new ObjectId(conversationId)
          : conversationId;

      return await collection.countDocuments({ conversationId: convId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to count messages: ${msg}`, "QUERY_ERROR", 500);
    }
  }
}
