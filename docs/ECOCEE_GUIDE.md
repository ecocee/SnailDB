# ECOCEE v1.0 - Complete Architecture & API Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Storage Engine](#storage-engine)
5. [Vector Indexing](#vector-indexing)
6. [Query Processing](#query-processing)
7. [Network Protocol](#network-protocol)
8. [SuperMemory™](#supermemory)
9. [CLI Reference](#cli-reference)
10. [TypeScript SDK](#typescript-sdk)
11. [Performance Tuning](#performance-tuning)
12. [Examples](#examples)

---

## Overview

ECOCEE is a production-grade, AI-optimized custom database engine built with TypeScript-Go hybrid architecture. It features:

- **Custom Storage Engine**: Block-based LSM-tree with MVCC and WAL
- **Multiple Vector Indexes**: HNSW (hierarchical), IVF-Flat, Flat (brute-force), PQ (quantized)
- **Vector Metrics**: Cosine, Euclidean, Dot-product similarity
- **Custom SQL Parser**: EcoSQL with vector distance functions
- **Query Executor**: Cost-based optimization with streaming results
- **Network Protocol**: PostgreSQL-style TCP messages
- **SuperMemory™**: Four-tier AI memory system with semantic search
- **Type-Safe SDKs**: TypeScript and Go client libraries

### Key Features

| Feature | Details |
|---------|---------|
| **Storage** | 4KB page-based blocks, LSM-tree compaction, WAL recovery |
| **Indexing** | HNSW with hierarchical layers, IVF-Flat partitioning |
| **Concurrency** | MVCC for isolation, no read/write locks |
| **Memory** | Long-term persistent, short-term cache, episodic timeline, semantic embeddings |
| **Protocol** | Binary TCP with handshake, auth, streaming results |
| **Scalability** | Vector dimension-agnostic, configurable page size/cache |

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │ TypeScript SDK   │    │ Go SDK           │                │
│  └──────────────────┘    └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Network Protocol Server                   │
│  TCP/IP, Message Serialization, Authentication              │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Query Executor                          │
│  Parser → Planner → Optimizer → Executor → Results          │
└─────────────────────────────────────────────────────────────┘
          ▼                           ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ EcoSQL Parser    │    │ Vector Executor  │
    └──────────────────┘    └──────────────────┘
                              ▼
    ┌────────────────────────────────────────┐
    │       Vector Indexing Layer            │
    │  HNSW │ IVF-Flat │ Flat │ PQ          │
    └────────────────────────────────────────┘
                              ▼
    ┌────────────────────────────────────────┐
    │        Storage Engine Layer             │
    │  Block Manager │ Page Cache │ WAL      │
    └────────────────────────────────────────┘
                              ▼
    ┌────────────────────────────────────────┐
    │       Persistent Storage                │
    │  Disk Files │ Logs │ Indexes           │
    └────────────────────────────────────────┘

    ┌────────────────────────────────────────┐
    │     SuperMemory™ AI Module              │
    │  4-Tier Memory with Vector Search      │
    └────────────────────────────────────────┘
```

### Module Breakdown

```
cmd/ecoceedb/              # CLI application
internal/
  storage/
    engine.ts              # Block manager, LSM, WAL, MVCC, cache
  vector/
    index.ts               # HNSW, IVF-Flat, Flat, PQ indexes
  protocol/
    server.ts              # TCP server, message format
  query/
    (streaming, caching)
  parser/
    parser.ts              # Lexer, parser, AST builder
  planner/
    (cost-based optimization)
  executor/
    executor.ts            # Query operators, result generation
  memory/
    memory.ts              # SuperMemory™ four-tier system
  utils/
    (hashing, encoding)
pkg/
  sdk-ts/                  # TypeScript SDK
  sdk-go/                  # Go SDK (bindings)
```

---

## Getting Started

### Installation

```bash
npm install ecoceedb
```

### Starting the Server

```bash
# Start on default port 5432
ecoceedb start

# Start on custom port with password
ecoceedb start --port 5433 --password mypassword

# Start with custom data directory
ecoceedb start --data-dir /mnt/data/ecocee
```

### Connect from TypeScript

```typescript
import { createClient } from 'ecoceedb/sdk-ts';

const db = await createClient({
  host: 'localhost',
  port: 5432,
  password: 'ecocee',
});

// Execute query
const result = await db.query('SELECT * FROM users WHERE age > 18');
console.log(result.rows);

// Vector search
const matches = await db.vectorSearch({
  table: 'embeddings',
  column: 'embedding',
  query: [0.1, 0.2, 0.3, ...], // Your query vector
  limit: 10,
  metric: 'cosine',
});

// Cleanup
await db.disconnect();
```

### Interactive Shell

```bash
ecoceedb shell
```

---

## Storage Engine

### Architecture

The storage engine implements an LSM-tree (Log-Structured Merge Tree) with the following components:

#### Block Manager
- **Page Size**: Configurable (default 4KB)
- **Block Format**: Header (256 bytes) + Data + Checksum
- **Alignment**: 4KB aligned for disk efficiency

```typescript
interface StorageBlock {
  id: string;           // Unique block identifier
  data: Buffer;         // Serialized row/index data
  size: number;         // Data size in bytes
  offset: number;       // Position in file
  checksum: string;     // SHA256 for integrity
  version: number;      // MVCC version number
}
```

#### Write-Ahead Logging (WAL)
- Ensures durability before data writes
- Enables crash recovery
- Format: Timestamp | Operation | Data | Checksum

```typescript
interface WALEntry {
  id: string;              // Log entry ID
  timestamp: number;       // Unix timestamp
  operation: 'insert' | 'update' | 'delete';
  table: string;           // Table name
  data: Buffer;            // Serialized data
  checksum: string;        // Data integrity check
}
```

#### Multi-Version Concurrency Control (MVCC)
- Each write creates new version
- Readers see consistent snapshots
- No read/write lock contention
- Version cleanup during compaction

```typescript
// Version tracking
private mvccVersions: Map<string, Set<number>>;
// Allows multiple concurrent readers without locks
```

#### Page Cache (LRU)
- Configurable size (default 10,000 pages)
- Least-Recently-Used eviction
- Tracks access patterns for optimization

```typescript
class PageCache {
  get(key: string): Buffer | undefined
  set(key: string, value: Buffer): void
  clear(): void
  getStats(): { hits: number; size: number }
}
```

#### Compaction
- Merges sorted run files
- Removes deleted records
- Improves read performance
- Runs in background

```typescript
// LSM compaction strategy
async compact(): Promise<void> {
  // Merge sorted files
  // Remove tombstones (deleted records)
  // Rebuild indexes
  // Increment version
}
```

### B-Tree Index

Secondary index structure for range queries:

```typescript
class BTreeIndex {
  insert(key: string, value: unknown): void
  search(key: string): unknown | null
  rangeQuery(minKey: string, maxKey: string): Map<string, unknown>
}
```

**Order (M)**: 16 (configurable)

### Usage Example

```typescript
import { StorageEngine } from 'ecoceedb/internal/storage/engine';

const storage = new StorageEngine({
  dataDir: './data',
  pageSize: 4096,          // 4KB pages
  cacheSize: 10000,        // 10,000 cached pages
  driver: 'disk',          // or 'memory'
  walEnabled: true,
  mvccEnabled: true,
});

await storage.initialize();

// Write data
await storage.write('users', 'user_123', Buffer.from(JSON.stringify({
  id: 'user_123',
  name: 'Alice',
  email: 'alice@example.com',
})));

// Read data
const data = await storage.read('user_123');
const user = JSON.parse(data.toString());

// Get statistics
const stats = storage.getStats();
console.log(`Blocks: ${stats.totalBlocks}, Size: ${stats.totalSize} bytes`);

// Compact storage
await storage.compact();

// Flush to disk
await storage.flush();
```

---

## Vector Indexing

ECOCEE supports four vector indexing algorithms, each optimized for different use cases:

### 1. HNSW (Hierarchical Navigable Small World)

**Best for**: General-purpose vector search, high recall, balanced speed/accuracy

**Algorithm**:
- Multi-layer graph structure
- Efficient greedy search
- Adjustable parameters:
  - `maxConnections`: 16 (default)
  - `efConstruction`: 200 (index building)
  - `ef`: 100 (query execution)

**Complexity**:
- Insert: O(log N)
- Search: O(log N)
- Space: O(N * M)

```typescript
const index = new HNSWIndex('cosine');
index.insert({ id: 'v1', data: [1, 0, 0] });
index.insert({ id: 'v2', data: [0, 1, 0] });
const results = index.search([0.9, 0.1, 0], 10);
```

### 2. IVF-Flat (Inverted File + Flat)

**Best for**: Large-scale datasets, many centroids, GPU acceleration ready

**Algorithm**:
- K-means centroids (default 1000)
- Inverted lists per centroid
- Flat distance computation

**Complexity**:
- Insert: O(K) where K = number of centroids
- Search: O(K * M/K) = O(M) in worst case
- Space: O(N + K * D)

```typescript
const index = new IVFFlatIndex(1000, 'euclidean');
index.insert({ id: 'v1', data: [...] });
const results = index.search([...], 10);
```

### 3. Flat (Brute Force)

**Best for**: Small datasets, baseline accuracy, GPU parallelization

**Algorithm**:
- Linear scan all vectors
- Direct distance computation
- No indexing overhead

**Complexity**:
- Insert: O(1)
- Search: O(N * D)
- Space: O(N * D)

```typescript
const index = new FlatIndex('cosine');
// Best for < 1M vectors or when accuracy critical
const results = index.search([...], 10);
```

### 4. Product Quantization (PQ)

**Best for**: Memory-constrained environments, compression trade-offs

**Algorithm**:
- Split vectors into subvectors
- Quantize each to K centroids
- Approximate distance via lookups

**Compression**:
- 8 subvectors × 8 bits = 8 bytes per vector
- Reduction: 768-dim float32 (3KB) → 8 bytes (99.7% reduction)

```typescript
const index = new PQIndex(8, 8, 'cosine');
index.insert({ id: 'v1', data: [...] });
const results = index.search([...], 10);
```

### Distance Metrics

```typescript
// Cosine Similarity (angle-based, range [0, 2])
// Best for: text embeddings, normalized vectors
cosine([1, 0], [1, 0]) // = 0

// Euclidean Distance (L2 norm, range [0, ∞])
// Best for: spatial data, pixel embeddings
euclidean([0, 0], [3, 4]) // = 5

// Dot Product (range [-∞, ∞])
// Best for: pre-normalized vectors, inner product search
dot_product([1, 2], [3, 4]) // = 11
```

### Factory Function

```typescript
import { createVectorIndex } from 'ecoceedb/internal/vector/index';

const index = createVectorIndex('hnsw', 'cosine');
const index2 = createVectorIndex('ivf_flat', 'euclidean');
```

### Vector Search Example

```typescript
// Create index
const index = new HNSWIndex('cosine');

// Add vectors
const vectors = [
  { id: 'doc1', data: [1, 0, 0, 1] },
  { id: 'doc2', data: [0.9, 0.1, 0, 1] },
  { id: 'doc3', data: [0, 1, 0, 0] },
  { id: 'doc4', data: [0.1, 0.9, 0, 0] },
];

vectors.forEach(v => index.insert(v));

// Search
const query = [0.95, 0.05, 0, 0.95];
const results = index.search(query, 3);
// results = [
//   { id: 'doc1', distance: 0.01, data: [...] },
//   { id: 'doc2', distance: 0.04, data: [...] },
//   { id: 'doc4', distance: 0.85, data: [...] }
// ]
```

---

## Query Processing

### EcoSQL - Extended SQL with Vector Operations

ECOCEE implements EcoSQL, which extends standard SQL with vector distance functions:

```sql
-- Standard SQL operations
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  age INT
);

INSERT INTO users VALUES ('uuid-1', 'Alice', 'alice@example.com', 30);

SELECT * FROM users WHERE age > 25 ORDER BY name LIMIT 10;

UPDATE users SET age = 31 WHERE id = 'uuid-1';

DELETE FROM users WHERE id = 'uuid-1';

-- Vector operations (EcoSQL extensions)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  text TEXT,
  embedding VECTOR(768)
);

-- Vector distance in WHERE clause
SELECT * FROM embeddings
WHERE DISTANCE(embedding, [0.1, 0.2, ...], 'cosine') < 0.5
LIMIT 10;

-- Vector MATCH clause (approximate nearest neighbor)
SELECT * FROM embeddings
MATCH embedding WITH [0.1, 0.2, ...] USING 'cosine'
LIMIT 10;
```

### Query Parsing

The lexer and parser convert SQL strings to AST (Abstract Syntax Tree):

```typescript
import { parseSQL } from 'ecoceedb/internal/parser/parser';

const sql = 'SELECT * FROM users WHERE age > 18 ORDER BY name LIMIT 10';
const ast = parseSQL(sql);
// ast = {
//   type: 'SELECT',
//   columns: ['*'],
//   from: 'users',
//   where: { conditions: [...], operator: 'AND' },
//   orderBy: [{ column: 'name', direction: 'ASC' }],
//   limit: 10
// }
```

### Query Executor

The executor traverses the AST and executes operations:

```typescript
import { QueryExecutor } from 'ecoceedb/internal/executor/executor';

const executor = new QueryExecutor(storage);

// Execute parsed query
const context = await executor.execute(ast);
// Returns:
// {
//   id: 'query-uuid',
//   results: [...],
//   stats: {
//     rowsAffected: 10,
//     rowsScanned: 100,
//     executionTime: 45 // ms
//   }
// }
```

### Query Plan

Cost-based optimizer generates execution plans:

```typescript
const plan = executor.createQueryPlan(ast);
// plan = {
//   id: 'plan-uuid',
//   steps: [
//     { type: 'table_scan', table: 'users', estimatedRows: 1000 },
//     { type: 'filter', condition: 'age > 18', estimatedRows: 500 },
//     { type: 'sort', columns: ['name'], estimatedRows: 500 },
//     { type: 'limit', count: 10, estimatedRows: 10 }
//   ],
//   estimatedCost: 50
// }
```

### Supported Operators

| Operator | Example |
|----------|---------|
| Scan | Table full scan |
| Filter | WHERE clause evaluation |
| Project | SELECT column selection |
| Sort | ORDER BY |
| Limit | LIMIT clause |
| Join | (future) INNER/OUTER JOIN |
| Aggregate | (future) GROUP BY, COUNT, SUM |
| VectorSearch | Vector distance operations |

---

## Network Protocol

ECOCEE uses a binary protocol similar to PostgreSQL for client-server communication:

### Message Format

```
┌─────────┬──────────────────┬──────────────┐
│ Type    │ Length (4 bytes) │ Payload      │
│ (1 byte)│ (Big-endian)     │ (JSON data)  │
└─────────┴──────────────────┴──────────────┘
```

### Message Types

#### Handshake (0x48 'H')
Server sends to client on connection:
```typescript
{
  type: 'HANDSHAKE',
  id: 'msg-uuid',
  timestamp: 1704067200000,
  version: '1.0.0',
  serverName: 'ECOCEE'
}
```

#### Authentication (0x41 'A')
Client sends password for authentication:
```typescript
{
  type: 'AUTH',
  id: 'msg-uuid',
  timestamp: 1704067200000,
  password: 'ecocee'
}
```

#### Query (0x51 'Q')
Client sends SQL query:
```typescript
{
  type: 'QUERY',
  id: 'msg-uuid',
  timestamp: 1704067200000,
  query: 'SELECT * FROM users'
}
```

#### Result (0x52 'R')
Server sends query results:
```typescript
{
  type: 'RESULT',
  id: 'msg-uuid',
  timestamp: 1704067200000,
  queryId: 'query-uuid',
  rowCount: 10,
  rows: [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' }
  ],
  columns: ['id', 'name']
}
```

#### Error (0x45 'E')
Server sends error response:
```typescript
{
  type: 'ERROR',
  id: 'msg-uuid',
  timestamp: 1704067200000,
  code: 'QUERY_ERROR',
  message: 'Table not found: users'
}
```

### Server Setup

```typescript
import { ProtocolServer } from 'ecoceedb/internal/protocol/server';

const server = new ProtocolServer({
  port: 5432,
  host: 'localhost',
  maxConnections: 100,
  authRequired: true,
  defaultPassword: 'ecocee'
});

await server.start();
```

### Client Connection

```typescript
import { ProtocolClient } from 'ecoceedb/internal/protocol/server';

const client = new ProtocolClient('localhost', 5432);
await client.connect();
await client.authenticate('ecocee');

const result = await client.executeQuery('SELECT * FROM users');
console.log(result.rows);

client.close();
```

---

## SuperMemory™

The SuperMemory™ system provides AI agents with four integrated memory tiers for context awareness and knowledge management:

### Architecture

```
┌──────────────────────────────────────────────┐
│         SuperMemory™ Unified Interface       │
│  remember() | recall() | search() | analyze()│
└──────────────────────────────────────────────┘
       ▲           ▲           ▲           ▲
       │           │           │           │
┌──────┴──┐  ┌─────┴──┐  ┌────┴───┐  ┌────┴────┐
│ Long-   │  │ Short- │  │Episodic│  │Semantic │
│ Term    │  │ Term   │  │        │  │         │
│         │  │        │  │        │  │         │
│Store:   │  │Cache:  │  │Events: │  │Embeddings
│ +────── │  │+────── │  │+────── │  │+────────
│ HNSW    │  │LRU     │  │Timeline│  │Flat
│ Index   │  │EvictionIndex   │  │Vector Index
│         │  │        │  │        │  │
│ Large   │  │Recent  │  │History │  │Knowledge
│Capacity │  │Access  │  │Context │  │Semantic
└─────────┘  └────────┘  └────────┘  └─────────┘
```

### 1. Long-Term Memory

Persistent storage with HNSW semantic indexing:

```typescript
const ltm = new LongTermMemory();

// Store important fact
await ltm.store({
  id: uuid(),
  type: 'long_term',
  data: 'Alice works as a software engineer',
  embedding: [...],
  metadata: {
    source: 'conversation',
    importance: 'high',
    topic: 'employment'
  },
  createdAt: Date.now()
});

// Search by semantic similarity
const results = await ltm.search([0.1, 0.2, 0.3, ...], 5);

// Retrieve specific fact
const fact = await ltm.retrieve('fact-uuid');

// Update metadata
await ltm.updateMetadata('fact-uuid', {
  verified: true,
  confidence: 0.95
});

// Statistics
const stats = ltm.getStats();
console.log(`Stored facts: ${stats.totalEntries}`);
```

### 2. Short-Term Memory

High-speed LRU cache for active context:

```typescript
const stm = new ShortTermMemory(1000); // Max 1000 entries

// Store recent interaction
await stm.store({
  data: "User asked about weather",
  metadata: { conversationId: 'conv-123' }
});

// Retrieve (updates LRU order)
const entry = await stm.retrieve('entry-uuid');

// Search current context
const results = await stm.search({
  metadata: { conversationId: 'conv-123' }
});

// Clear when done
await stm.clear();

// Stats
const stats = stm.getStats();
console.log(`Cache hit rate: ${(stats.hits / 1000 * 100).toFixed(2)}%`);
```

### 3. Episodic Memory

Timeline-based event log for narrative context:

```typescript
const em = new EpisodicMemory();

// Record event
await em.record({
  data: 'User entered the room',
  metadata: { context: 'meeting' },
  createdAt: Date.now()
});

// Get timeline
const events = await em.getTimelineRange(
  Date.now() - 3600000, // Last hour
  Date.now()
);

// Search by context
const meetingEvents = await em.searchByContext('meeting');

// Recent N events
const recent = await em.getLastN(20);

// Stats
const stats = em.getStats();
console.log(`Total events: ${stats.totalEntries}`);
```

### 4. Semantic Memory

Embeddings-based knowledge representation:

```typescript
const sem = new SemanticMemory();

// Store knowledge with category
await sem.store({
  data: 'The capital of France is Paris',
  embedding: [0.1, 0.2, 0.3, ...], // From embedding model
  metadata: {
    category: 'geography',
    confidence: 0.98
  }
});

// Find similar knowledge
const similar = await sem.searchBySimilarity([0.1, 0.2, 0.3, ...], 5);

// Browse category
const geography = await sem.searchByCategory('geography');

// Get related facts
const related = await sem.getRelated('fact-uuid', 10);

// Stats
const stats = sem.getStats();
console.log(`Knowledge items: ${stats.totalEntries}`);
```

### Unified SuperMemory Interface

```typescript
const memory = new SuperMemory(1000); // Short-term size

// Single API for all memory types
await memory.remember({
  data: 'Important fact',
  embedding: [...],
  metadata: { importance: 'high' }
});

// Smart recall from closest tier
const fact = await memory.recall('fact-uuid');

// Cross-tier search
const results = await memory.search({
  embedding: [...],
  limit: 10,
  category: 'geography'
});

// Conversation tracking
const convId = await memory.startConversation(['user1', 'agent']);
await memory.addMessage(convId, {
  data: 'Hello!',
  metadata: { role: 'user' }
});

const conversation = await memory.getConversation(convId);

// Memory consolidation
await memory.consolidate(); // Move to long-term, clear short-term

// Statistics
const stats = memory.getStats();
```

### Use Cases

```typescript
// AI Agent Context Management
class ChatAgent {
  async processMessage(userId: string, message: string) {
    // Search relevant history
    const context = await this.memory.search({
      category: 'user_' + userId,
      limit: 5
    });

    // Store new interaction
    await this.memory.remember({
      data: message,
      metadata: {
        userId,
        role: 'user',
        timestamp: Date.now()
      }
    });

    // Generate response with context
    const response = await this.llm.generate({
      prompt: message,
      context: context.map(c => c.data).join('\n')
    });

    // Store response
    await this.memory.remember({
      data: response,
      metadata: {
        userId,
        role: 'agent',
        timestamp: Date.now()
      }
    });

    return response;
  }

  async consolidateMemory(userId: string) {
    // Move old conversations to long-term
    const recent = await this.memory.episodic.getLastN(100);
    for (const event of recent) {
      if (Date.now() - event.createdAt > 7 * 24 * 3600 * 1000) {
        // Generate embedding and store in semantic memory
        const emb = await this.embeddingModel.embed(event.data);
        await this.memory.semantic.store({
          ...event,
          embedding: emb
        });
      }
    }
    await this.memory.consolidate();
  }
}
```

---

## CLI Reference

### Commands

#### `ecoceedb start`

Start the ECOCEE server:

```bash
ecoceedb start [options]

Options:
  -p, --port <port>           Server port (default: 5432)
  -h, --host <host>           Server host (default: localhost)
  --data-dir <path>           Data directory (default: ./data)
  --password <password>       Server password (default: ecocee)
```

Example:
```bash
ecoceedb start --port 5433 --password secret123 --data-dir /mnt/ssd/ecocee
```

#### `ecoceedb shell`

Start interactive query shell:

```bash
ecoceedb shell [options]

Options:
  -h, --host <host>          Server host (default: localhost)
  -p, --port <port>          Server port (default: 5432)
  --password <password>       Server password (default: ecocee)
```

Example:
```bash
ecoceedb shell --host 192.168.1.100 --port 5432
```

Commands in shell:
```
ecocee> CREATE TABLE users (id UUID, name TEXT);
✓ OK (0 rows affected, 12ms)

ecocee> INSERT INTO users VALUES ('uuid-1', 'Alice');
✓ OK (1 rows affected, 5ms)

ecocee> SELECT * FROM users;
id                   | name
─────────────────────┼──────
uuid-1              | Alice

ecocee> STATUS
Storage Stats:
  Blocks: 2
  Size: 8.00 KB
  Cache Hit Rate: 75.00%

ecocee> EXIT
Goodbye!
```

#### `ecoceedb status`

Check server status:

```bash
ecoceedb status [options]

Options:
  -h, --host <host>   Server host (default: localhost)
  -p, --port <port>   Server port (default: 5432)
```

Output:
```
✓ Server is running on localhost:5432
  Uptime: 2h 15m
  Connections: 5
  Queries: 1,234
  Data size: 256 MB
```

#### `ecoceedb config`

Manage configuration:

```bash
ecoceedb config

# Creates/displays ecocee.config.json
```

#### `ecoceedb backup`

Create backup:

```bash
ecoceedb backup [options]

Options:
  -o, --output <path>   Output directory (default: ./backups)
```

#### `ecoceedb benchmark`

Run performance benchmark:

```bash
ecoceedb benchmark [options]

Options:
  -n, --rows <count>   Number of rows to benchmark (default: 10000)
```

Output:
```
Running ECOCEE Benchmark...

Writing 10000 rows...
✓ Write time: 245ms (40,816 ops/sec)

Reading 10000 rows...
✓ Read time: 156ms (64,103 ops/sec)

Running compaction...
✓ Compaction time: 89ms

Benchmark Results:
  Total time: 0.49s
  Write throughput: 40,816 ops/sec
  Read throughput: 64,103 ops/sec
```

---

## TypeScript SDK

### Installation

```bash
npm install ecoceedb
```

### Basic Usage

```typescript
import { createClient } from 'ecoceedb/sdk-ts';

// Connect
const db = await createClient({
  host: 'localhost',
  port: 5432,
  password: 'ecocee'
});

// Query
const users = await db.query(
  'SELECT * FROM users WHERE age > $1',
  [18]
);
console.log(users.rows);

// Insert
const result = await db.insert('users', {
  id: 'uuid-1',
  name: 'Alice',
  email: 'alice@example.com'
});
console.log(result.id);

// Update
await db.update('users', 'uuid-1', {
  email: 'alice.new@example.com'
});

// Delete
await db.delete('users', 'uuid-1');

// Close
await db.disconnect();
```

### Advanced Features

#### Type-Safe Query Builder

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

const builder = new QueryBuilder<User>();
const { sql, params } = builder
  .select('id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .and('email', 'LIKE', '%@example.com')
  .orderBy('name', 'ASC')
  .limit(10)
  .toSQL();

const result = await db.query(sql);
```

#### Transactions

```typescript
const transaction = await db.beginTransaction({
  isolation: 'serializable',
  timeout: 30000
});

try {
  await transaction.insert('accounts', { id: 'a1', balance: 1000 });
  await transaction.update('accounts', 'a1', { balance: 900 });
  await transaction.update('accounts', 'a2', { balance: 1100 });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

#### Vector Search

```typescript
const results = await db.vectorSearch({
  table: 'documents',
  column: 'embedding',
  query: [0.1, 0.2, 0.3, ...],
  limit: 10,
  metric: 'cosine'
});

console.log(results);
// [
//   { id: 'doc-1', score: 0.95, data: {...} },
//   { id: 'doc-2', score: 0.87, data: {...} },
//   ...
// ]
```

#### Table Management

```typescript
// Create table
await db.createTable({
  name: 'products',
  columns: [
    { name: 'id', type: 'UUID', primaryKey: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'embedding', type: 'VECTOR(768)', nullable: true }
  ]
});

// Get schema
const schema = await db.getTableSchema('products');
console.log(schema.columns);

// Drop table
await db.dropTable('products');
```

---

## Performance Tuning

### Storage Optimization

```typescript
// Larger pages for sequential workloads
const storage = new StorageEngine({
  pageSize: 16384,        // 16KB pages
  cacheSize: 50000,       // Larger cache
  dataDir: '/mnt/ssd',    // Fast storage
  walEnabled: true,
  mvccEnabled: true
});
```

### Vector Index Selection

| Workload | Best Index | Config |
|----------|-----------|--------|
| Exact recall needed | Flat | - |
| Real-time search | HNSW | ef=200, M=16 |
| Large-scale (1B+) | IVF-Flat | 10000 centroids |
| Low memory | PQ | (8, 8) compression |

```typescript
// Choose based on workload
const exactMatch = new FlatIndex('cosine');
const realTime = new HNSWIndex('cosine');
const largeScale = new IVFFlatIndex(10000, 'cosine');
const compressed = new PQIndex(8, 8, 'cosine');
```

### Query Optimization

```sql
-- Use indexes
CREATE INDEX idx_age ON users(age);

-- Add vector index
CREATE VECTOR INDEX idx_embedding ON documents(embedding) USING 'hnsw' WITH (m=16, ef=200);

-- Optimize WHERE clauses
SELECT * FROM users
WHERE age > 18           -- Index friendly
ORDER BY name            -- Indexed column preferred
LIMIT 100;

-- Vectorize where possible
SELECT * FROM docs
WHERE DISTANCE(embedding, query_vec, 'cosine') < 0.5
LIMIT 10;
```

### Monitoring

```typescript
// Storage stats
const stats = storage.getStats();
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);

// Memory stats
const memStats = memory.getStats();
console.log(JSON.stringify(memStats, null, 2));

// Performance tracking
const context = await executor.execute(ast);
console.log(`Execution time: ${context.stats.executionTime}ms`);
console.log(`Rows scanned: ${context.stats.rowsScanned}`);
```

---

## Examples

### Example 1: Document Search with Embeddings

```typescript
import { createClient } from 'ecoceedb/sdk-ts';
import { HNSWIndex } from 'ecoceedb/internal/vector/index';

// Setup
const db = await createClient({ host: 'localhost', port: 5432 });
const vectorIndex = new HNSWIndex('cosine');

// Create table
await db.createTable({
  name: 'documents',
  columns: [
    { name: 'id', type: 'UUID', primaryKey: true },
    { name: 'title', type: 'TEXT' },
    { name: 'content', type: 'TEXT' },
    { name: 'embedding', type: 'VECTOR(768)' }
  ]
});

// Add documents
const docs = [
  { id: 'doc-1', title: 'Python Basics', content: 'Learn Python...', embedding: [0.1, 0.2, ...] },
  { id: 'doc-2', title: 'Node.js Guide', content: 'Node.js tutorial...', embedding: [0.15, 0.25, ...] },
  { id: 'doc-3', title: 'Rust Intro', content: 'Rust programming...', embedding: [0.05, 0.1, ...] }
];

for (const doc of docs) {
  await db.insert('documents', doc);
  vectorIndex.insert({ id: doc.id, data: doc.embedding });
}

// Search for documents similar to "Learning programming languages"
const queryEmbedding = [0.12, 0.22, 0.32, ...]; // From embedding model

const searchResults = await db.vectorSearch({
  table: 'documents',
  column: 'embedding',
  query: queryEmbedding,
  limit: 5,
  metric: 'cosine'
});

console.log('Top search results:');
searchResults.forEach(result => {
  console.log(`- ${result.data.title} (score: ${result.score.toFixed(3)})`);
});
```

### Example 2: AI Agent with Memory

```typescript
import { SuperMemory } from 'ecoceedb/internal/memory/memory';
import { v4 as uuid } from 'uuid';

class AIAssistant {
  private memory: SuperMemory;

  constructor() {
    this.memory = new SuperMemory(1000);
  }

  async processUserMessage(userId: string, message: string, embedding: number[]) {
    // Retrieve relevant context
    const context = await this.memory.search({
      embedding,
      category: `user_${userId}`,
      limit: 5
    });

    // Store user message
    await this.memory.remember({
      data: message,
      embedding,
      metadata: {
        userId,
        role: 'user',
        timestamp: Date.now()
      }
    });

    // Generate response (simplified)
    const response = `Understood: ${message}`;

    // Store assistant response
    await this.memory.remember({
      data: response,
      embedding: this.generateEmbedding(response),
      metadata: {
        userId,
        role: 'assistant',
        timestamp: Date.now()
      }
    });

    return {
      response,
      context: context.map(c => c.data)
    };
  }

  private generateEmbedding(text: string): number[] {
    // Use embedding model
    return Array(768).fill(0).map(() => Math.random());
  }
}

// Usage
const assistant = new AIAssistant();
const result = await assistant.processUserMessage(
  'user-123',
  'What is machine learning?',
  Array(768).fill(0.5)
);
console.log(result);
```

### Example 3: Real-time Analytics

```typescript
import { StorageEngine } from 'ecoceedb/internal/storage/engine';
import { QueryExecutor } from 'ecoceedb/internal/executor/executor';
import { parseSQL } from 'ecoceedb/internal/parser/parser';

// Setup
const storage = new StorageEngine({
  dataDir: './analytics',
  pageSize: 4096,
  cacheSize: 10000,
  driver: 'disk',
  walEnabled: true,
  mvccEnabled: true
});

await storage.initialize();
const executor = new QueryExecutor(storage);

// Create analytics table
await executor.execute(parseSQL(`
  CREATE TABLE events (
    id INT,
    user_id TEXT,
    event_type TEXT,
    timestamp INT
  )
`));

// Insert events
for (let i = 0; i < 1000; i++) {
  await executor.execute(parseSQL(`
    INSERT INTO events VALUES (${i}, 'user-${Math.floor(i/10)}', 'click', ${Date.now()})
  `));
}

// Query analytics
const result = await executor.execute(parseSQL(`
  SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type
`));

console.log('Event distribution:', result.results);

// Performance report
const stats = storage.getStats();
console.log(`Performance:
  Total rows: 1000
  Storage used: ${(stats.totalSize / 1024).toFixed(2)} KB
  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%
`);
```

---

## Conclusion

ECOCEE v1.0 provides a complete, production-grade database engine optimized for AI applications. With custom storage, multiple vector indexing strategies, integrated memory systems, and comprehensive APIs, it's designed to power next-generation AI-driven applications.

For more information, visit: https://github.com/yourusername/ecocee
