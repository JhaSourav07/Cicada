import { Collection } from "mongodb";
import { getDatabase, DatabaseError } from "../mongodb";
import { SettingsDocument, UpdateSettingsInput } from "../types";
import { DEFAULT_MODEL_NAME } from "../../ai/model-config";

export const SETTINGS_COLLECTION = "settings";

const DEFAULT_SETTINGS = {
  defaultModel: DEFAULT_MODEL_NAME,
  temperature: 0.7,
  contextLength: 32768,
};

export class SettingsRepository {
  private static async getCollection(): Promise<Collection<SettingsDocument>> {
    const db = await getDatabase();
    return db.collection<SettingsDocument>(SETTINGS_COLLECTION);
  }

  /**
   * Retrieves user settings, initializing defaults if no document exists yet.
   */
  static async getSettings(): Promise<SettingsDocument> {
    try {
      const collection = await this.getCollection();
      const existing = await collection.findOne({});

      if (existing) {
        return existing;
      }

      // Seed default settings document
      const initialDoc: Omit<SettingsDocument, "_id"> = {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(initialDoc as SettingsDocument);
      return {
        ...initialDoc,
        _id: result.insertedId,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to fetch settings: ${msg}`, "QUERY_ERROR", 500);
    }
  }

  /**
   * Updates settings fields and records updatedAt.
   */
  static async updateSettings(data: UpdateSettingsInput): Promise<SettingsDocument> {
    try {
      const collection = await this.getCollection();
      const current = await this.getSettings();

      const updateFields: Partial<SettingsDocument> = {
        updatedAt: new Date(),
      };

      if (data.defaultModel !== undefined) updateFields.defaultModel = data.defaultModel;
      if (data.temperature !== undefined) updateFields.temperature = data.temperature;
      if (data.contextLength !== undefined) updateFields.contextLength = data.contextLength;

      const updated = await collection.findOneAndUpdate(
        { _id: current._id },
        { $set: updateFields },
        { returnDocument: "after" }
      );

      return updated || current;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      throw new DatabaseError(`Failed to update settings: ${msg}`, "QUERY_ERROR", 500);
    }
  }
}
