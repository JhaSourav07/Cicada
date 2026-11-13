import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getMongoConfig } from "../src/lib/db/config";
import { checkDbConnectivity, DatabaseError, closeDatabaseConnection } from "../src/lib/db/mongodb";

after(async () => {
  await closeDatabaseConnection();
});

test("getMongoConfig loads default loopback configuration", () => {
  const config = getMongoConfig();
  assert.equal(config.uri, "mongodb://127.0.0.1:27017");
  assert.equal(config.dbName, "cicada");
  assert.equal(config.maxPoolSize, 10);
});

test("DatabaseError preserves custom error code and status", () => {
  const err = new DatabaseError("Connection refused", "CONNECTION_ERROR", 503);
  assert.equal(err.code, "CONNECTION_ERROR");
  assert.equal(err.statusCode, 503);
  assert.equal(err.name, "DatabaseError");
});

test("checkDbConnectivity succeeds against local Podman MongoDB", async () => {
  const res = await checkDbConnectivity();
  assert.equal(res.connected, true);
  assert.equal(res.database, "cicada");
  assert.ok(typeof res.latencyMs === "number");
});
