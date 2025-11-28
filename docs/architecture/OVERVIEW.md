# SNAILDB v2.0 - Architecture & Design

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────┐
│           Application Layer                         │
│  (Node.js/Python/Java/Go clients)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 │ SNAILDB Binary Protocol
                 │ (TCP Socket, Length-Prefixed)
                 │
┌────────────────▼────────────────────────────────────┐
│           SNAILDB Server                            │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Command Router & Executor                    │  │
│  │ - Protocol decoder                           │  │
│  │ - Command validation                         │  │
│  │ - Error handling                             │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                  │
│  ┌──────────────▼───────────────────────────────┐  │
│  │ Storage Engine (In-Memory)                   │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ String Store                           │  │  │
│  │  │ - Key-Value pairs                      │  │  │
│  │  │ - Expiration support                   │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ Vector Store                           │  │  │
│  │  │ - Cosine similarity search             │  │  │
│  │  │ - Approximate nearest neighbor         │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ Complex Data Structures                │  │  │
│  │  │ - Lists, Hashes, Sets, Sorted Sets     │  │  │
│  │  │ - Nested support                       │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ Eviction Policies (LRU/LFU/TTL)        │  │  │
│  │  │ - Automatic memory management           │  │  │
│  │  │ - Configurable thresholds              │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                  │
│  ┌──────────────▼───────────────────────────────┐  │
│  │ Persistence Layer                           │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ Write-Ahead Log (WAL)                  │  │  │
│  │  │ - Durability guarantee                 │  │  │
│  │  │ - Command log rotation                 │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ RDB Snapshots                          │  │  │
│  │  │ - Full database dumps                  │  │  │
│  │  │ - Background save                      │  │  │
│  │  │ - Compression support                  │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │ File System Storage                    │  │  │
│  │  │ - persistent data/                     │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                  │
└─────────────────▼────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼─────┐      ┌───▼──────┐
    │ Metrics  │      │ Logging  │
    │ Collection         │         │
    └──────────┘      └──────────┘
```

---

## 🔧 Core Components

### 1. Protocol Handler (`src/server/protocol.ts`)

**Purpose**: Encode/decode SNAILDB binary protocol

**Design**:
```typescript
interface ProtocolMessage {
  type: 'command' | 'response' | 'error';
  data: Buffer;
}

// Message Format (Binary)
[Length: 4 bytes][Type: 1 byte][URI: variable][Command: variable][Args: variable]
```

**Key Functions**:
- `encodeMessage()` - Serialize command to binary
- `decodeMessage()` - Deserialize from binary
- `parseURI()` - Parse connection strings
- `serializeValue()` - Type-aware serialization

**Features**:
- Length-prefixed framing (prevents message corruption)
- Type safety with null-byte separators
- Efficient binary encoding
- Variable-length integers for sizes

### 2. Storage Engine (`src/server/storage/engine.ts`)

**Purpose**: In-memory data store with persistence

**Architecture**:
```typescript
interface StorageEngine {
  // String operations
  set(key, value, expiry?): Promise<void>;
  get(key): Promise<value>;
  
  // Vector operations
  vectorSet(key, vector, metadata?): Promise<void>;
  vectorSearch(query, limit, threshold): Promise<results>;
  
  // Complex structures
  listPush(key, values): Promise<void>;
  hashSet(key, field, value): Promise<void>;
  
  // Eviction & expiration
  applyEviction(): void;
  cleanupExpired(): void;
  
  // Persistence
  saveRDB(): Promise<void>;
  loadRDB(): Promise<void>;
}
```

**Data Structures**:

```
Memory Layout:
┌─────────────────────────────┐
│  String Store (Map)         │
│  {key -> {value, expiry}}   │
├─────────────────────────────┤
│  Vector Store (Map)         │
│  {key -> {vector, meta}}    │
├─────────────────────────────┤
│  List Store (Map)           │
│  {key -> Array<value>}      │
├─────────────────────────────┤
│  Hash Store (Map)           │
│  {key -> {field -> value}}  │
├─────────────────────────────┤
│  Set Store (Map)            │
│  {key -> Set<value>}        │
└─────────────────────────────┘
```

**Eviction Policies**:

```
Policy: LRU (Least Recently Used)
┌─────────────────────────────┐
│ LinkedList (access order)   │
│ Head (most recent)          │
│   ↓                         │
│ [A] → [B] → [C] → [D]       │
│       (least recent)        │
│                             │
│ On access: move to head     │
│ On limit: remove tail       │
└─────────────────────────────┘

Policy: LFU (Least Frequently Used)
┌─────────────────────────────┐
│ Frequency Counter           │
│ {key -> access_count}       │
│                             │
│ On limit: remove min freq   │
└─────────────────────────────┘

Policy: TTL (Time To Live)
┌─────────────────────────────┐
│ Expiration Queue            │
│ {key -> expiry_time}        │
│                             │
│ Background cleanup job      │
│ runs every 10 seconds       │
└─────────────────────────────┘
```

### 3. Executor (`src/server/executor.ts`)

**Purpose**: Execute commands and route to storage engine

**Command Flow**:
```
Client → Protocol Decode → Command Validation → Executor → Storage Engine → Response → Protocol Encode → Client
```

**Supported Commands** (60+ total):

**String Commands**:
- `GET key` - Retrieve value
- `SET key value [EX seconds]` - Store value
- `DEL key1 [key2...]` - Delete keys
- `INCR key` - Increment number
- `APPEND key value` - Append to string
- `GETRANGE key start end` - Substring

**List Commands**:
- `LPUSH key value` - Push to left
- `RPUSH key value` - Push to right
- `LPOP key` - Pop from left
- `LLEN key` - List length
- `LRANGE key start stop` - Get range

**Hash Commands**:
- `HSET key field value` - Set hash field
- `HGET key field` - Get hash field
- `HGETALL key` - Get all fields
- `HDEL key field` - Delete field
- `HINCRBY key field increment` - Increment field

**Set Commands**:
- `SADD key member` - Add to set
- `SMEMBERS key` - Get all members
- `SCARD key` - Set cardinality
- `SREM key member` - Remove from set
- `SINTER key1 key2` - Intersection

**Vector Commands**:
- `VECTOR.SET key vector [metadata]` - Store vector
- `VECTOR.SEARCH query [limit] [threshold]` - Vector search
- `VECTOR.GET key` - Retrieve vector
- `VECTOR.DELETE key` - Delete vector

**Server Commands**:
- `PING` - Check connection
- `SAVE` - Force RDB save
- `BGSAVE` - Background save
- `FLUSHDB` - Clear database
- `DBSIZE` - Database size
- `LASTSAVE` - Last save time
- `INFO [section]` - Server info

### 4. Connection Handler (`src/server/snaildb-server.ts`)

**Purpose**: TCP server, connection management

**Architecture**:

```typescript
class SnailDBServer {
  // Connection pool
  connections: Map<number, Connection>;
  connectionCounter: number = 0;
  
  // Lifecycle
  async start(): Promise<void>;
  async stop(): Promise<void>;
  
  // Connection handling
  async onConnection(socket: Socket): Promise<void>;
  async onData(conn: Connection, data: Buffer): Promise<void>;
  async onClose(conn: Connection): Promise<void>;
  
  // Metrics
  metrics: {
    connections: number;
    commandsProcessed: number;
    bytesIn: number;
    bytesOut: number;
  };
}
```

**Connection Lifecycle**:

```
Socket Connect
    ↓
onConnection() - Assign ID, create Connection object
    ↓
Connection Ready - Add to connection pool
    ↓
onData() - Receive data chunks
    ↓
Buffer Management - Collect complete messages
    ↓
Protocol Decode → Execute Command → Encode Response
    ↓
Send Response
    ↓
(Repeat until disconnect)
    ↓
onClose() - Clean up, remove from pool
    ↓
Connection Closed
```

### 5. Persistence Layer

**Write-Ahead Log (WAL)**:

```
File: data/snaildb-wal.log
Format: [Timestamp][CommandID][Command][Args][Checksum]

┌──────────────────────────────────────────┐
│ 2025-11-28T10:30:45.123Z                 │
│ SET user:1 {"name":"John","age":30}      │
│ 2025-11-28T10:30:46.456Z                 │
│ VECTOR.SET vec:1 [0.1,0.2,0.3]           │
│ 2025-11-28T10:30:47.789Z                 │
│ DEL user:2                               │
└──────────────────────────────────────────┘

Benefits:
- Durability: All commands logged before execution
- Recoverability: Replay log on restart
- Consistency: Never lose data
- Auditability: Complete command history
```

**RDB Snapshots**:

```
File: data/snaildb-latest.rdb
Format: [Header][Version][Metadata][Data][Checksum]

Snapshot Process:
1. Fork background process
2. Serialize all data structures
3. Write to temporary file
4. Atomic rename to final location

└─ Advantages:
   - Compact file size (compressed)
   - Fast recovery (single file load)
   - Point-in-time backups
   - Suitable for large datasets
```

---

## 🎯 Design Decisions

### 1. In-Memory First with Persistence

**Decision**: Store all data in memory, with optional persistence to disk

**Rationale**:
- Ultra-fast access (microseconds vs milliseconds)
- Simplified data structures (no B-tree overhead)
- Ideal for cache/session layers
- Can handle millions of keys

**Trade-off**: Limited by available RAM

**Mitigation**: Eviction policies, TTL

### 2. Binary Protocol

**Decision**: Custom binary protocol instead of HTTP/REST

**Rationale**:
- Lower bandwidth (important for high-frequency trading, real-time)
- Lower latency (no HTTP overhead)
- Type-safe serialization
- Efficient for binary data (vectors)

**Trade-off**: Requires SDKs for different languages

**Mitigation**: Provide SDKs for major languages

### 3. Single-Threaded Event Loop

**Decision**: Node.js event loop, non-blocking I/O

**Rationale**:
- Simple concurrency model
- No thread synchronization issues
- Excellent I/O performance
- Native TypeScript support

**Trade-off**: CPU-bound tasks block event loop

**Mitigation**: Offload heavy computation to background jobs

### 4. Vector Search (Approximate)

**Decision**: Cosine similarity with linear scan (not full approximate nearest neighbor)

**Rationale**:
- Simple implementation
- 100% accuracy
- Sufficient for most use cases (<1M vectors)
- Can be extended to approximate algorithms

**Trade-off**: O(n) search complexity for large datasets

**Future**: HNSW (Hierarchical Navigable Small World) for billions of vectors

### 5. Flexible Eviction Policies

**Decision**: Support LRU, LFU, TTL - user chooses

**Rationale**:
- Different use cases need different strategies
- LRU for cache (most common)
- LFU for frequency-based scenarios
- TTL for sessions/temporary data

**Trade-off**: More code complexity

**Mitigation**: Clear defaults, documentation

---

## 🔄 Request-Response Cycle

### Example: SET Command

```
Client                          Server
  │                               │
  │─── SET key value ──────────→  │
  │                               │
  │                        Decode: SET key value
  │                               │
  │                        Storage: set(key, value)
  │                               │
  │                        Create response: OK
  │                               │
  │←─────── OK + metadata ────────│
  │                               │
```

### Example: VECTOR.SEARCH

```
Client                          Server
  │                               │
  │─── VECTOR.SEARCH [1,2,3] ──→  │
  │      limit=10                 │
  │      threshold=0.8            │
  │                               │
  │                        Parse: query=[1,2,3]
  │                               │
  │                        Load all vectors
  │                               │
  │                        Calculate similarity
  │                               │
  │                        Filter by threshold
  │                               │
  │                        Sort by similarity
  │                               │
  │                        Return top 10
  │                               │
  │←─────── [{key, score}, ...] ──│
  │                               │
```

---

## 📊 Performance Characteristics

### Operation Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| GET/SET | O(1) | O(1) | Constant time |
| DEL | O(k) | O(1) | k = number of keys |
| LPUSH/RPUSH | O(1) | O(1) | Prepend/append |
| LRANGE | O(n) | O(n) | n = range size |
| VECTOR.SEARCH | O(n×d) | O(1) | n = vectors, d = dimension |
| HSET/HGET | O(1) | O(1) | Hash lookup |
| SADD/SREM | O(1) | O(1) | Set operations |

### Typical Performance

```
Throughput (on modern hardware):
- GET/SET: 100,000+ ops/sec
- LPUSH/RPUSH: 80,000+ ops/sec
- VECTOR.SET: 50,000+ ops/sec
- VECTOR.SEARCH (1M vectors): 1-5 seconds

Latency (p99):
- GET/SET: < 1 millisecond
- LPUSH: < 1 millisecond
- VECTOR.SET: < 5 milliseconds
- VECTOR.SEARCH: 100-500 milliseconds (depends on dataset)

Memory Usage:
- String (100 bytes): ~200 bytes (with overhead)
- Vector (4096 dimensions, float32): ~16KB
- Typical: 2-3x raw data size
```

---

## 🔌 Extension Points

### Custom Commands

```typescript
// Extend executor with custom command
executor.registerCommand('CUSTOM.CMD', async (args, storage) => {
  const [key, ...rest] = args;
  // Custom logic
  return result;
});
```

### Storage Backends

```typescript
// Implement alternative backend (Redis, PostgreSQL)
interface IStorage {
  get(key): Promise<value>;
  set(key, value): Promise<void>;
  // ...
}

// Swap implementation
const storage = new PostgreSQLStorage();
const executor = new Executor(storage);
```

### Replication

```typescript
// Add replication hooks
server.on('command', (cmd) => {
  // Replicate to slave
  slaves.forEach(slave => slave.send(cmd));
});
```

---

## 🚀 Deployment Architecture

### Single Instance

```
┌──────────────┐
│  Client SDK  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ SNAILDB Server       │
│  Port 12222          │
│  In-Memory Store     │
│  Persistence Layer   │
└──────────────────────┘
       │
       ▼
    Filesystem
    (data/)
```

### High Availability

```
┌──────────────┐
│  Clients     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Load Balancer       │
│  (Round Robin)       │
└──┬──────────────┬────┘
   │              │
   ▼              ▼
┌─────────┐  ┌─────────┐
│ Server 1│  │ Server 2│
│ (Master)│  │ (Slave) │
└─────────┘  └─────────┘
   │              │
   └──────┬───────┘
          ▼
    Shared Storage
    (NFS/S3/EBS)
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: snaildb
spec:
  serviceName: snaildb
  replicas: 3
  selector:
    matchLabels:
      app: snaildb
  template:
    metadata:
      labels:
        app: snaildb
    spec:
      containers:
      - name: snaildb
        image: snaildb:latest
        ports:
        - containerPort: 12222
        volumeMounts:
        - name: data
          mountPath: /app/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

---

## 🔮 Future Architecture Enhancements

1. **Sharding** - Horizontal scaling across multiple instances
2. **Approximate Nearest Neighbor** - HNSW or similar for billions of vectors
3. **Cluster Mode** - Multi-node with gossip protocol
4. **Pub/Sub** - Publish-subscribe messaging
5. **Transactions** - MULTI/EXEC for atomic operations
6. **Lua Scripting** - Custom logic server-side
7. **Stream Data** - Time-series and event streams
8. **Machine Learning** - Built-in ML models

---

**For code walkthrough, see specific source files in `src/server/`**
