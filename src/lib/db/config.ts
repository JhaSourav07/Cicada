import { z } from "zod";

/**
 * MongoDB Central Configuration Schema for CICADA
 * Strictly loopback bound to guarantee local data privacy.
 */
export const MongoConfigSchema = z.object({
  uri: z.string().default("mongodb://127.0.0.1:27017"),
  dbName: z.string().min(1).default("cicada"),
  maxPoolSize: z.number().int().positive().default(10),
  minPoolSize: z.number().int().nonnegative().default(2),
  serverSelectionTimeoutMS: z.number().int().positive().default(5000),
  connectTimeoutMS: z.number().int().positive().default(10000),
});

export type MongoConfig = z.infer<typeof MongoConfigSchema>;

export function getMongoConfig(): MongoConfig {
  return MongoConfigSchema.parse({
    uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
    dbName: process.env.MONGODB_DATABASE || "cicada",
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });
}
