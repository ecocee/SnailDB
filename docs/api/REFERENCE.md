# API Reference

## Connection

### SnailDBClient

Main client class for connecting to SNAILDB server.

```typescript
import SnailDBClient from './src/client/snaildb-client';

const client = new SnailDBClient(options: ConnectionOptions);
```

#### ConnectionOptions

```typescript
interface ConnectionOptions {
  uri: string;              // Connection string: snaildb://host:port
  timeout?: number;         // Command timeout in milliseconds (default: 5000)
  retryAttempts?: number;   // Max retry attempts (default: 3)
  retryDelay?: number;      // Delay between retries in ms (default: 1000)
}
```

#### Methods

##### connect()
```typescript
await client.connect(): Promise<void>
```
Establish connection to server. Throws on connection failure.

##### disconnect()
```typescript
await client.disconnect(): Promise<void>
```
Close connection to server.

##### isConnected()
```typescript
client.isConnected(): boolean
```
Check if currently connected.

---

## String Operations

### set()
```typescript
await client.set(key: string, value: any, ttl?: number): Promise<any>
```
Store a value. Optional TTL in seconds.

**Example:**
```typescript
await client.set('user:1', { name: 'Alice', email: 'alice@example.com' });
await client.set('temp:cache', data, 3600); // 1 hour TTL
```

### get()
```typescript
await client.get(key: string): Promise<any>
```
Retrieve a value.

**Example:**
```typescript
const user = await client.get('user:1');
```

### del()
```typescript
await client.del(...keys: string[]): Promise<number>
```
Delete one or more keys. Returns number of deleted keys.

**Example:**
```typescript
const deleted = await client.del('user:1', 'user:2', 'user:3');
console.log(`Deleted ${deleted} keys`);
```

### exists()
```typescript
await client.exists(...keys: string[]): Promise<number>
```
Check if keys exist. Returns count of existing keys.

**Example:**
```typescript
const count = await client.exists('user:1', 'user:2', 'non-existent');
console.log(`${count} keys exist`); // Outputs: 2 keys exist
```

### keys()
```typescript
await client.keys(pattern: string = '*'): Promise<string[]>
```
Find keys matching pattern (glob syntax).

**Example:**
```typescript
const allKeys = await client.keys('*');
const userKeys = await client.keys('user:*');
const sessionKeys = await client.keys('session:*:*');
```

### type()
```typescript
await client.type(key: string): Promise<string>
```
Get the data type of a key.

**Example:**
```typescript
const type = await client.type('user:1');
console.log(type); // 'string', 'list', 'hash', 'set', 'zset'
```

---

## List Operations

### lpush()
```typescript
await client.lpush(key: string, ...values: any[]): Promise<number>
```
Push values to the left of list. Returns new list length.

**Example:**
```typescript
await client.lpush('queue', 'job:1', 'job:2');
```

### rpush()
```typescript
await client.rpush(key: string, ...values: any[]): Promise<number>
```
Push values to the right of list. Returns new list length.

**Example:**
```typescript
await client.rpush('messages', 'hello', 'world');
```

### lpop()
```typescript
await client.lpop(key: string): Promise<any>
```
Remove and return the leftmost element.

**Example:**
```typescript
const item = await client.lpop('queue');
```

### rpop()
```typescript
await client.rpop(key: string): Promise<any>
```
Remove and return the rightmost element.

**Example:**
```typescript
const lastMessage = await client.rpop('messages');
```

### lrange()
```typescript
await client.lrange(key: string, start: number, end: number): Promise<any[]>
```
Get range of elements from list.

**Example:**
```typescript
const items = await client.lrange('messages', 0, 10);
const allItems = await client.lrange('messages', 0, -1);
```

### llen()
```typescript
await client.llen(key: string): Promise<number>
```
Get list length.

**Example:**
```typescript
const length = await client.llen('messages');
```

---

## Hash Operations

### hset()
```typescript
await client.hset(key: string, ...pairs: any[]): Promise<number>
```
Set field values in hash. Returns number of new fields.

**Example:**
```typescript
await client.hset('user:1', 
  'name', 'Alice',
  'email', 'alice@example.com',
  'age', 30
);
```

### hget()
```typescript
await client.hget(key: string, field: string): Promise<any>
```
Get a field from hash.

**Example:**
```typescript
const email = await client.hget('user:1', 'email');
```

### hgetall()
```typescript
await client.hgetall(key: string): Promise<Record<string, any>>
```
Get all fields from hash.

**Example:**
```typescript
const user = await client.hgetall('user:1');
// { name: 'Alice', email: 'alice@example.com', age: 30 }
```

### hdel()
```typescript
await client.hdel(key: string, ...fields: string[]): Promise<number>
```
Delete fields from hash. Returns number of deleted fields.

**Example:**
```typescript
await client.hdel('user:1', 'age', 'phone');
```

### hexists()
```typescript
await client.hexists(key: string, field: string): Promise<number>
```
Check if field exists in hash (1 = exists, 0 = not exists).

**Example:**
```typescript
const exists = await client.hexists('user:1', 'email');
```

---

## Set Operations

### sadd()
```typescript
await client.sadd(key: string, ...members: any[]): Promise<number>
```
Add members to set. Returns number of added members.

**Example:**
```typescript
await client.sadd('tags', 'javascript', 'typescript', 'nodejs');
```

### srem()
```typescript
await client.srem(key: string, ...members: any[]): Promise<number>
```
Remove members from set. Returns number of removed members.

**Example:**
```typescript
await client.srem('tags', 'javascript');
```

### smembers()
```typescript
await client.smembers(key: string): Promise<any[]>
```
Get all members of set.

**Example:**
```typescript
const tags = await client.smembers('tags');
```

### scard()
```typescript
await client.scard(key: string): Promise<number>
```
Get set cardinality (size).

**Example:**
```typescript
const count = await client.scard('tags');
```

---

## Vector Operations

### vectorSet()
```typescript
await client.vectorSet(
  key: string, 
  vector: number[], 
  metadata?: Record<string, any>
): Promise<any>
```
Store a vector (embedding) with optional metadata.

**Example:**
```typescript
const embedding = [0.1, 0.2, 0.3, ...]; // 384-dim vector
await client.vectorSet('embedding:doc1', embedding, {
  title: 'Machine Learning Basics',
  model: 'sentence-transformers',
  timestamp: Date.now()
});
```

### vectorSearch()
```typescript
await client.vectorSearch(
  vector: number[], 
  topK: number = 10
): Promise<{
  results: Array<{
    id: string;
    distance: number;
    metadata?: Record<string, any>;
  }>
}>
```
Find top-k similar vectors. Returns results with similarity scores.

**Example:**
```typescript
const queryVector = [0.1, 0.2, 0.3, ...];
const results = await client.vectorSearch(queryVector, 10);

results.results.forEach(result => {
  console.log(`${result.id}: distance=${result.distance}`);
});
```

---

## Server Operations

### stats()
```typescript
await client.stats(): Promise<{
  connections: number;
  commands: number;
  errors: number;
  uptime: number;
  storage: {
    keys: number;
    memory: number;
    hits: number;
    misses: number;
    operations: number;
  };
}>
```
Get server statistics.

**Example:**
```typescript
const stats = await client.stats();
console.log(`Connected clients: ${stats.connections}`);
console.log(`Total commands: ${stats.commands}`);
console.log(`Memory used: ${stats.storage.memory} bytes`);
```

### info()
```typescript
await client.info(section?: string): Promise<any>
```
Get server information.

**Example:**
```typescript
const info = await client.info();
const serverInfo = await client.info('server');
```

### save()
```typescript
await client.save(): Promise<any>
```
Trigger manual snapshot save.

**Example:**
```typescript
await client.save();
console.log('Snapshot saved');
```

### compact()
```typescript
await client.compact(): Promise<any>
```
Compact storage (remove deleted keys).

**Example:**
```typescript
await client.compact();
console.log('Storage compacted');
```

---

## Batch Operations

### batch()
```typescript
await client.batch(operations: Array<{
  cmd: string;
  args: any[];
}>): Promise<any[]>
```
Execute multiple commands efficiently.

**Example:**
```typescript
const results = await client.batch([
  { cmd: 'SET', args: ['key1', 'value1'] },
  { cmd: 'SET', args: ['key2', 'value2'] },
  { cmd: 'GET', args: ['key1'] },
]);
console.log(results); // [ok, ok, 'value1']
```

---

## Transaction Operations

### transaction()
```typescript
await client.transaction(
  fn: (client: SnailDBClient) => Promise<void>
): Promise<void>
```
Execute operations in transaction (atomic).

**Example:**
```typescript
await client.transaction(async (tx) => {
  const balance = await tx.get('account:123:balance');
  if (balance > 100) {
    await tx.set('account:123:balance', balance - 100);
    await tx.set('account:456:balance', 
      (await tx.get('account:456:balance')) + 100
    );
  }
});
```

---

## Error Handling

### Error Types

```typescript
try {
  await client.get('key');
} catch (error) {
  // Error has: message, code, details, cause, timestamp
  console.error(`[${error.code}] ${error.message}`);
}
```

### Common Errors

- `CONNECTION_FAILED` - Cannot connect to server
- `CONNECTION_TIMEOUT` - Connection timeout
- `COMMAND_TIMEOUT` - Command execution timeout
- `NOT_CONNECTED` - Not connected to server
- `INVALID_ARGUMENT` - Invalid command argument
- `KEY_NOT_FOUND` - Key does not exist
- `TYPE_MISMATCH` - Wrong data type for operation
- `OUT_OF_MEMORY` - Server out of memory

---

## Connection String Format

```
snaildb://[username[:password]@]host:port[/database][?options]
```

### Examples

```typescript
// Local development
snaildb://localhost:12222

// Remote server with auth
snaildb://user:pass@db.example.com:12222

// With database
snaildb://localhost:12222/ai_cache

// With options
snaildb://localhost:12222?timeout=10000&retryAttempts=5
```

---

## Configuration Examples

### Development
```typescript
const client = new SnailDBClient({
  uri: 'snaildb://localhost:12222',
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
});
```

### Production
```typescript
const client = new SnailDBClient({
  uri: 'snaildb://db.production.internal:12222',
  timeout: 10000,
  retryAttempts: 5,
  retryDelay: 2000,
});
```

### Failover
```typescript
const primary = new SnailDBClient({
  uri: 'snaildb://db1.cluster.internal:12222',
  timeout: 5000,
});

const backup = new SnailDBClient({
  uri: 'snaildb://db2.cluster.internal:12222',
  timeout: 5000,
});
```

---

## Best Practices

1. **Reuse connections** - Create one client per application
2. **Handle errors** - Always use try-catch with async operations
3. **Set timeouts** - Use appropriate timeouts for your use case
4. **Batch operations** - Use batch() for multiple related commands
5. **Monitor metrics** - Call stats() periodically to monitor health
6. **Use transactions** - For multi-step atomic operations
