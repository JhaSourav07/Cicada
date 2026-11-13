import { Collection, ObjectId, Filter } from "mongodb";
import { getDatabase, DatabaseError } from "../mongodb";
import { ConversationDocument } from "../types";
import { DEFAULT_MODEL_NAME } from "../../ai/model-config";

export const CONVERSATIONS_COLLECTION = "conversations";

export class ConversationRepository {
  private static async getCollection(): Promise<Collection<ConversationDocument>> {
    const db = await getDatabase();
    return db.collection<ConversationDocument>(CONVERSATIONS_COLLECTION);
  }

  /**
   * Creates a new conversation record.
   */
  static async create(data: {
    title?: string;
    model?: string;
  } = {}): Promise<ConversationDocument> {
    try {
      const collection = await this.getCollection();
      const now = new Date();

      const doc: Omit<ConversationDocument, "_id"> = {
        title: data.title?.trim() || "New Conversation",
        model: data.model?.trim() || DEFAULT_MODEL_NAME,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };

      const result = await collection.insertOne(doc as ConversationDocument);
      return {
        ...doc,
        _id: result.insertedId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to create conversation: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Finds a conversation by its ObjectId string or instance.
   */
  static async findById(id: string | ObjectId): Promise<ConversationDocument | null> {
    try {
      const collection = await this.getCollection();
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      return await collection.findOne({ _id: objectId });
    } catch (err: unknown) {
      if (err instanceof DatabaseError) throw err;
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to find conversation: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Lists conversations sorted by updatedAt descending.
   * Supports regex title search and pagination (limit/skip).
   */
  static async list(options: {
    search?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<ConversationDocument[]> {
    try {
      const collection = await this.getCollection();
      const { search, limit = 50, skip = 0 } = options;

      const filter: Filter<ConversationDocument> = {};
      if (search && search.trim().length > 0) {
        // Escaping regex special characters for safe case-insensitive search
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.title = { $regex: escaped, $options: "i" };
      }

      return await collection
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(Math.min(limit, 100))
        .toArray();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to list conversations: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Updates conversation metadata (title, model).
   */
  static async update(
    id: string | ObjectId,
    data: { title?: string; model?: string }
  ): Promise<ConversationDocument | null> {
    try {
      const collection = await this.getCollection();
      const objectId = typeof id === "string" ? new ObjectId(id) : id;

      const updateFields: Partial<ConversationDocument> = {
        updatedAt: new Date(),
      };
      if (data.title !== undefined) updateFields.title = data.title.trim();
      if (data.model !== undefined) updateFields.model = data.model.trim();

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updateFields },
        { returnDocument: "after" }
      );

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to update conversation: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Increments the message count and touches updatedAt timestamp.
   */
  static async incrementMessageCount(
    id: string | ObjectId,
    delta = 1
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      const objectId = typeof id === "string" ? new ObjectId(id) : id;

      await collection.updateOne(
        { _id: objectId },
        {
          $inc: { messageCount: delta },
          $set: { updatedAt: new Date() },
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to update message count: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Deletes a conversation by ID.
   */
  static async delete(id: string | ObjectId): Promise<boolean> {
    try {
      const collection = await this.getCollection();
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      const res = await collection.deleteOne({ _id: objectId });
      return res.deletedCount > 0;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to delete conversation: ${msg}`, "QUERY_ERROR", 500);
    }
  }
}
