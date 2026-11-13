import { MongoClient, Db } from "mongodb";
import { getMongoConfig } from "./config";

export type DatabaseErrorCode =
  | "CONNECTION_ERROR"
  | "NOT_FOUND"
  | "QUERY_ERROR"
  | "INDEX_ERROR"
  | "TRANSACTION_ERROR";

export class DatabaseError extends Error {
  public readonly code: DatabaseErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: DatabaseErrorCode = "QUERY_ERROR", statusCode = 500) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

function createClientPromise(): Promise<MongoClient> {
  const config = getMongoConfig();

  const client = new MongoClient(config.uri, {
    maxPoolSize: config.maxPoolSize,
    minPoolSize: config.minPoolSize,
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
    connectTimeoutMS: config.connectTimeoutMS,
  });

  return client.connect();
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so the connection is preserved across module reloads
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = createClientPromise();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  // In production mode, avoid global state
  clientPromise = createClientPromise();
}

/**
 * Returns the active MongoDB client promise.
 */
export async function getMongoClient(): Promise<MongoClient> {
  try {
    return await clientPromise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown connection failure";
    throw new DatabaseError(
      `Failed to connect to MongoDB at ${getMongoConfig().uri}: ${msg}`,
      "CONNECTION_ERROR",
      503
    );
  }
}

/**
 * Returns the scoped database instance for CICADA.
 */
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getMongoConfig().dbName);
}

/**
 * Closes the active MongoDB client connection (primarily for testing and graceful shutdown).
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    delete globalThis._mongoClientPromise;
  }
}
export async function checkDbConnectivity(): Promise<{
  connected: boolean;
  database: string;
  latencyMs?: number;
  error?: string;
}> {
  const config = getMongoConfig();
  const start = performance.now();

  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    const latencyMs = Math.round(performance.now() - start);

    return {
      connected: true,
      database: config.dbName,
      latencyMs,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database ping failed";
    return {
      connected: false,
      database: config.dbName,
      error: msg,
    };
  }
}
