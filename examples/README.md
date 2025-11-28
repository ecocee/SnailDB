# SNAILDB Examples

This directory contains comprehensive TypeScript examples demonstrating real-world use cases for SNAILDB.

## Examples

### 1. AI-Powered Search Engine (`01-ai-search.ts`)
Build a semantic search engine using embeddings and vector similarity.

**Features:**
- Document indexing with embeddings
- Semantic search using vector similarity
- Metadata storage and retrieval
- Result ranking by distance

**Use Cases:**
- Search across document collections
- Semantic similarity matching
- Content recommendations

---

### 2. E-Commerce Recommendations (`02-ecommerce.ts`)
Product recommendation system using vector embeddings.

**Features:**
- Product catalog management
- Vector-based similarity matching
- Recommendation generation
- Product metadata storage

**Use Cases:**
- Product recommendations
- Related items discovery
- Personalized suggestions

---

### 3. LLM Conversation Memory (`03-llm-memory.ts`)
Store and retrieve conversation context for LLM applications.

**Features:**
- Conversation storage with embeddings
- Context retrieval via semantic search
- Message history management
- Token counting

**Use Cases:**
- LLM conversation context
- Chat memory systems
- Context-aware responses

---

### 4. Real-Time Analytics (`04-analytics.ts`)
Track and aggregate metrics in real-time.

**Features:**
- Metric recording with timestamps
- Time-window aggregation
- Statistical analysis (min, max, avg, sum)
- User-specific metrics tracking

**Use Cases:**
- API metrics tracking
- Performance monitoring
- Real-time dashboards
- Event analytics

---

### 5. Session Management (`05-session-management.ts`)
User session storage with TTL and expiration.

**Features:**
- Session creation and storage
- Session data updates
- Expiration handling
- Active session management

**Use Cases:**
- User session persistence
- Authentication tokens
- User preferences storage
- Multi-device sessions

---

### 6. Rate Limiting (`06-rate-limiting.ts`)
Per-user rate limiting with sliding window algorithm.

**Features:**
- Sliding window rate limiting
- Per-user limits
- Reset tracking
- Status monitoring

**Use Cases:**
- API rate limiting
- DDoS protection
- Usage quotas
- Fair resource allocation

---

### 7. Cache Layer (`07-cache-layer.ts`)
High-performance caching with TTL support.

**Features:**
- Key-value caching
- TTL and expiration
- Cache statistics (hits, misses, hit rate)
- Batch operations

**Use Cases:**
- Database query caching
- API response caching
- Session caching
- Computed value caching

---

### 8. Queue System (`08-queue-system.ts`)
Async job queue for background task processing.

**Features:**
- Job enqueueing and dequeueing
- Job status tracking (pending, processing, completed, failed)
- Job result storage
- Queue statistics

**Use Cases:**
- Background job processing
- Email sending queues
- Image processing
- Analytics aggregation
- Async workflows

---

## Prerequisites

1. **Node.js 18+** installed
2. **SNAILDB Server** running on `localhost:12222`
3. **Dependencies installed**:
   ```bash
   npm install
   ```

## Running Examples

### Build TypeScript
```bash
npm run build
```

### Run All Examples
```bash
npm run examples
```

### Run Individual Example
```bash
ts-node examples/src/01-ai-search.ts
```

or after building:

```bash
node dist/examples/src/01-ai-search.js
```

## Example Output

Each example demonstrates:
- ✅ Successful operations (green checkmarks)
- ❌ Errors and failures (red X marks)
- ℹ️ Information and status messages
- 📊 Statistics and results

Example output:
```
🚀 E-Commerce Product Recommendations Example

✅ Added product: Winter Jacket
✅ Added product: Summer Shirt
✅ Added product: Running Shoes
✅ Added product: Wool Sweater
🛒 Product catalog setup complete

📊 Getting recommendations for prod:001:

Found 2 similar products:

1. ID: product:prod:002:vector, Distance: 0.1234
2. ID: product:prod:003:vector, Distance: 0.2567

✅ Example completed successfully
```

## Testing

All examples include error handling and validation. They demonstrate:
- Proper connection management
- Error handling and recovery
- Data validation
- Graceful degradation

## Architecture Patterns

### Data Storage Patterns
- **Strings**: Simple key-value storage
- **Hashes**: Structured data with multiple fields
- **Lists**: Ordered sequences (queues, stacks)
- **Sets**: Unique collections
- **Vectors**: Embeddings for semantic search

### Key Naming Conventions
- `doc:{id}` - Document storage
- `user:{id}:*` - User-related data
- `cache:{key}` - Cached values
- `session:{token}` - Session data
- `metric:{type}:{period}` - Metrics
- `job:{timestamp}:{id}` - Job entries
- `ratelimit:{userId}` - Rate limit counters

## Performance Tips

1. **Batch Operations**: Group related operations together
2. **Key Design**: Use hierarchical key naming for easy filtering
3. **TTL Management**: Implement cleanup for expired data
4. **Indexing**: Use secondary indexes for fast lookups
5. **Connection Pooling**: Reuse client connections

## Troubleshooting

### Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:12222
```
**Solution**: Ensure SNAILDB server is running on port 12222

### Type Errors
```
Property 'methodName' does not exist on type 'SnailDBClient'
```
**Solution**: Check the available client methods in `src/client/snaildb-client.ts`

### Timeout Errors
```
Error: Request timeout after 5000ms
```
**Solution**: Increase timeout or check server performance

## Further Reading

- See `docs/guides/EXAMPLES.md` for detailed use case descriptions
- Check `docs/api/REFERENCE.md` for API documentation
- Review `src/client/snaildb-client.ts` for available methods
- Explore `tests/snaildb.test.ts` for unit test examples

## Contributing

To add new examples:
1. Create a new file in `examples/src/` following the naming convention
2. Follow the structure of existing examples
3. Include comprehensive comments
4. Add error handling
5. Update this README

## License

These examples are part of the SNAILDB project. See LICENSE for details.
