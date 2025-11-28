# Real-World Usage Examples

## 1. AI-Powered Search Engine

Store document embeddings and search by semantic similarity:

```typescript
import SnailDBClient from './src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222' });

async function indexDocuments() {
  await client.connect();

  const documents = [
    { id: 1, title: 'Machine Learning Basics', content: '...' },
    { id: 2, title: 'Deep Learning with Python', content: '...' },
    { id: 3, title: 'Natural Language Processing', content: '...' },
  ];

  for (const doc of documents) {
    // Get embedding from ML model
    const embedding = await getEmbedding(doc.content);
    
    // Store vector with metadata
    await client.vectorSet(`doc:${doc.id}`, embedding, {
      title: doc.title,
      category: 'ML',
      indexed_at: Date.now(),
    });
  }

  console.log('📚 Documents indexed');
}

async function searchDocuments(query) {
  // Get query embedding
  const queryEmbedding = await getEmbedding(query);
  
  // Search for similar documents
  const results = await client.vectorSearch(queryEmbedding, 5);
  
  console.log(`🔍 Found ${results.results.length} results for: "${query}"`);
  results.results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.metadata.title} (similarity: ${result.distance})`);
  });

  return results.results;
}

await indexDocuments();
await searchDocuments('machine learning algorithms');
```

## 2. E-Commerce Product Recommendations

Find similar products based on embeddings:

```typescript
async function setupProductCatalog() {
  await client.connect();

  const products = [
    { id: 'prod:001', name: 'Winter Jacket', price: 99.99, category: 'Clothing' },
    { id: 'prod:002', name: 'Summer Shirt', price: 29.99, category: 'Clothing' },
    { id: 'prod:003', name: 'Running Shoes', price: 79.99, category: 'Footwear' },
  ];

  for (const product of products) {
    const embedding = await generateProductEmbedding(product);
    await client.vectorSet(`product:${product.id}:vector`, embedding, {
      name: product.name,
      price: product.price,
      category: product.category,
    });

    // Store product details in hash
    await client.hset(`product:${product.id}`,
      'name', product.name,
      'price', product.price,
      'category', product.category,
      'views', 0,
      'sales', 0,
    );
  }
}

async function getRecommendations(productId, topK = 5) {
  // Get product embedding
  const productVector = await client.get(`product:${productId}:vector`);
  
  // Find similar products
  const recommendations = await client.vectorSearch(productVector, topK + 1);
  
  // Filter out the product itself
  const results = recommendations.results
    .filter(r => !r.metadata.name.includes(productId))
    .slice(0, topK);

  return results;
}

// Usage
const similar = await getRecommendations('prod:001');
console.log('Recommended products:', similar);
```

## 3. LLM Conversation Memory

Cache conversation embeddings for context retrieval:

```typescript
async function storeConversation(userId, message, embedding) {
  const conversationId = `conversation:${userId}:${Date.now()}`;
  
  // Store conversation in multiple ways
  
  // 1. As vector for semantic search
  await client.vectorSet(conversationId, embedding, {
    user_id: userId,
    message_length: message.length,
    timestamp: Date.now(),
  });
  
  // 2. As hash for structured data
  await client.hset(`msg:${conversationId}`,
    'user_id', userId,
    'content', message,
    'timestamp', Date.now(),
    'tokens', countTokens(message),
  );
  
  // 3. In a list for conversation history
  await client.rpush(`history:${userId}`, conversationId);
}

async function getRelevantContext(userId, query, topK = 3) {
  const queryEmbedding = await getEmbedding(query);
  
  // Find similar messages in conversation
  const results = await client.vectorSearch(queryEmbedding, topK);
  
  // Retrieve full message content
  const context = [];
  for (const result of results.results) {
    const msg = await client.hgetall(result.id);
    context.push(msg);
  }

  return context;
}

async function generateResponseWithContext(userId, userMessage) {
  // Get relevant context from history
  const context = await getRelevantContext(userId, userMessage);
  
  // Build prompt with context
  const prompt = `
Context from previous conversations:
${context.map(c => c.content).join('\n')}

User: ${userMessage}
Assistant:`;

  // Generate response with LLM
  const response = await generateWithLLM(prompt);
  
  // Store conversation
  const embedding = await getEmbedding(userMessage);
  await storeConversation(userId, userMessage, embedding);
  
  return response;
}
```

## 4. Real-Time Analytics Dashboard

Store and query metrics with timestamps:

```typescript
async function recordMetric(metricName, value, tags = {}) {
  const timestamp = Date.now();
  const key = `metric:${metricName}:${timestamp}`;
  
  // Store in hash for structured data
  await client.hset(key,
    'value', value,
    'timestamp', timestamp,
    'host', tags.host || 'unknown',
    'service', tags.service || 'unknown',
  );

  // Also store in time-series set
  await client.zadd(`ts:${metricName}`, timestamp, key);
  
  // Set expiration (keep 30 days)
  await client.expire(key, 30 * 24 * 60 * 60);
}

async function getMetricsRange(metricName, startTime, endTime) {
  const pattern = `metric:${metricName}:*`;
  const keys = await client.keys(pattern);
  
  const metrics = [];
  for (const key of keys) {
    const data = await client.hgetall(key);
    const timestamp = parseInt(data.timestamp);
    
    if (timestamp >= startTime && timestamp <= endTime) {
      metrics.push({
        timestamp: new Date(timestamp),
        value: parseFloat(data.value),
        host: data.host,
        service: data.service,
      });
    }
  }

  return metrics.sort((a, b) => a.timestamp - b.timestamp);
}

async function getAggregatedMetrics(metricName, interval = 3600000) {
  const metrics = await getMetricsRange(metricName, Date.now() - 7 * 24 * 60 * 60 * 1000, Date.now());
  
  const aggregated = {};
  metrics.forEach(m => {
    const bucket = Math.floor(m.timestamp / interval);
    if (!aggregated[bucket]) {
      aggregated[bucket] = [];
    }
    aggregated[bucket].push(m.value);
  });

  return Object.entries(aggregated).map(([bucket, values]) => ({
    timestamp: new Date(parseInt(bucket) * interval),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  }));
}

// Usage
await recordMetric('cpu_usage', 45.2, { host: 'server-1', service: 'api' });
await recordMetric('memory_usage', 73.5, { host: 'server-1', service: 'api' });

const hourly = await getAggregatedMetrics('cpu_usage', 3600000);
console.log('📊 CPU metrics (hourly):', hourly);
```

## 5. Session Management

Store and retrieve user sessions efficiently:

```typescript
async function createSession(userId) {
  const sessionId = generateSessionId();
  const expiresIn = 24 * 60 * 60; // 24 hours

  await client.hset(`session:${sessionId}`,
    'user_id', userId,
    'created_at', Date.now(),
    'last_activity', Date.now(),
    'ip_address', getClientIP(),
    'user_agent', getUserAgent(),
  );

  // Set expiration
  await client.expire(`session:${sessionId}`, expiresIn);

  // Index for quick lookup
  await client.set(`user:${userId}:session`, sessionId, expiresIn);

  return sessionId;
}

async function getSession(sessionId) {
  return await client.hgetall(`session:${sessionId}`);
}

async function updateSessionActivity(sessionId) {
  await client.hset(`session:${sessionId}`, 'last_activity', Date.now());
}

async function destroySession(sessionId) {
  const session = await getSession(sessionId);
  await client.del(`session:${sessionId}`);
  if (session) {
    await client.del(`user:${session.user_id}:session`);
  }
}

// Express middleware example
app.use(async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    req.session = await getSession(sessionId);
    if (req.session) {
      await updateSessionActivity(sessionId);
    }
  }
  next();
});
```

## 6. Rate Limiting

Implement per-user rate limiting:

```typescript
async function checkRateLimit(userId, limit = 100, window = 3600) {
  const key = `rate_limit:${userId}`;
  const current = await client.get(key) || 0;

  if (current >= limit) {
    throw new Error(`Rate limit exceeded: ${current}/${limit} requests`);
  }

  // Increment counter
  await client.set(key, parseInt(current) + 1, window);

  return {
    limit,
    current: parseInt(current) + 1,
    remaining: limit - (parseInt(current) + 1),
  };
}

// Express middleware
app.use(async (req, res, next) => {
  try {
    const userId = req.user?.id || req.ip;
    const limit = await checkRateLimit(userId);
    res.set('X-RateLimit-Limit', limit.limit);
    res.set('X-RateLimit-Remaining', limit.remaining);
    next();
  } catch (error) {
    res.status(429).json({ error: error.message });
  }
});
```

## 7. Cache Layer

Implement caching with automatic expiration:

```typescript
const CACHE_TTL = 3600; // 1 hour

async function getOrCompute(key, computeFn, ttl = CACHE_TTL) {
  // Try to get from cache
  let cached = await client.get(key);
  if (cached) {
    return cached;
  }

  // Compute value
  const value = await computeFn();

  // Store in cache
  await client.set(key, value, ttl);

  return value;
}

// Usage
async function expensiveQuery(userId) {
  return getOrCompute(
    `user:${userId}:profile`,
    () => fetchUserProfile(userId),
    3600 // 1 hour TTL
  );
}

async function invalidateCache(pattern) {
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}
```

## 8. Queue System

Implement a simple job queue:

```typescript
async function enqueueJob(queue, job) {
  const jobId = `job:${generateId()}`;
  
  // Store job details
  await client.hset(jobId,
    'queue', queue,
    'status', 'pending',
    'created_at', Date.now(),
    'data', JSON.stringify(job),
  );

  // Add to queue
  await client.rpush(`queue:${queue}`, jobId);

  return jobId;
}

async function dequeueJob(queue) {
  const jobId = await client.lpop(`queue:${queue}`);
  
  if (jobId) {
    const job = await client.hgetall(jobId);
    return { ...job, id: jobId };
  }

  return null;
}

async function markJobComplete(jobId, result) {
  await client.hset(jobId,
    'status', 'completed',
    'completed_at', Date.now(),
    'result', JSON.stringify(result),
  );
}

// Worker loop
async function processJobs(queue) {
  while (true) {
    const job = await dequeueJob(queue);
    
    if (job) {
      try {
        const result = await processJob(job);
        await markJobComplete(job.id, result);
      } catch (error) {
        await client.hset(job.id,
          'status', 'failed',
          'error', error.message,
        );
      }
    } else {
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Best Practices for Production

1. **Connection Pooling** - Reuse single client instance
2. **Error Handling** - Always wrap in try-catch
3. **TTL Management** - Set appropriate TTLs
4. **Monitoring** - Track stats() regularly
5. **Backup** - Call save() periodically
6. **Rate Limiting** - Implement per-user limits
7. **Validation** - Validate all input data
8. **Logging** - Log important operations

---

These examples demonstrate production-ready patterns for common use cases!
