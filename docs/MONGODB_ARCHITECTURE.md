# CICADA — MongoDB Architecture & Integration

## 1. Overview & Architectural Philosophy

CICADA employs **MongoDB Community Server 7.0** running as a rootless Podman container strictly bound to `127.0.0.1:27017`.

Unlike cloud-dependent platforms, CICADA follows a **zero-cloud, local-first database paradigm**:
1. **Loopback Boundary**: The database port is bound exclusively to IPv4 loopback (`127.0.0.1`). Network packets never traverse physical or wireless interfaces.
2. **Official Node.js Driver**: We deliberately omit heavy ORMs (such as Prisma, Mongoose, or TypeORM). The official `mongodb` driver provides zero abstraction overhead, native BSON binary types, precise index optimization, and predictable connection pool behavior.
3. **Hardware Efficiency**: Running on Fedora Linux with 16GB RAM and an RTX 4060 GPU, the MongoDB daemon utilizes ~37MB of resident memory, preserving maximum RAM and VRAM for Ollama LLM execution (`qwen3.5:9b`).

---

## 2. Containerized Deployment (Rootless Podman Quadlet)

To guarantee clean, unprivileged execution without root privileges or manual process management, MongoDB is orchestrated via a systemd user Quadlet:

```ini
# ~/.config/containers/systemd/cicada-mongodb.container
[Unit]
Description=CICADA Local MongoDB Server
After=network-online.target

[Container]
Image=docker.io/library/mongo:7.0
ContainerName=cicada-mongodb
PublishPort=127.0.0.1:27017:27017
Volume=cicada-mongodb-data:/data/db:Z
Environment=MONGO_INITDB_DATABASE=cicada

[Service]
Restart=always

[Install]
WantedBy=default.target
```

Key features:
- **Pinned Image**: `mongo:7.0` (Community Edition).
- **Persistent Storage**: Named container volume `cicada-mongodb-data` located in unprivileged user storage (`~/.local/share/containers/storage/volumes/cicada-mongodb-data`).
- **SELinux Relabeling**: The `:Z` mount flag ensures Fedora SELinux permits container read/write access.
- **Systemd User Service**: Managed via `systemctl --user {status,start,stop} cicada-mongodb.service`.

---

## 3. Connection Management & Hot Module Replacement (HMR)

In Next.js App Router development mode (`next dev`), code files are frequently evaluated upon change. If each evaluation created a new `MongoClient`, the application would rapidly exhaust MongoDB's connection pool.

To prevent connection leaks, `src/lib/db/mongodb.ts` implements a singleton pattern with global caching:

```typescript
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = createClientPromise();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}
```

### Pool Configuration
- `maxPoolSize`: 10 (tuned for local developer workloads).
- `minPoolSize`: 1.
- `serverSelectionTimeoutMS`: 5000ms (fast failover if container is down).
- `connectTimeoutMS`: 5000ms.

---

## 4. Error Handling Hierarchy

All database operations map raw driver errors to typed `DatabaseError` instances:

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `CONNECTION_ERROR` | 503 | MongoDB server selection timeout or socket connection refused |
| `NOT_FOUND` | 404 | Target conversation or message ID does not exist |
| `QUERY_ERROR` | 500 | Driver query failure or BSON parsing error |
| `INDEX_ERROR` | 500 | Index creation or synchronization conflict |
| `TRANSACTION_ERROR` | 500 | Multi-document transaction rollback |
