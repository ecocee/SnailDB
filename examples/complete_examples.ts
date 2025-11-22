#!/usr/bin/env node
/**
 * ECOCEE Complete Examples & Demonstration
 * Showcases all major features and use cases
 */

// ============================================================================
// EXAMPLE 1: Basic Storage Operations
// ============================================================================

async function example_basicStorage() {
  console.log('\n=== EXAMPLE 1: Basic Storage ===\n');

  const { StorageEngine } = await import('./internal/storage/engine');

  const storage = new StorageEngine({
    dataDir: './examples-data/basic',
    pageSize: 4096,
    cacheSize: 100,
    driver: 'memory',
    walEnabled: true,
    mvccEnabled: true,
  });

  // Write data
  console.log('Writing data...');
  await storage.write('users', 'user-1', Buffer.from(JSON.stringify({ name: 'Alice', age: 30 })));
  await storage.write('users', 'user-2', Buffer.from(JSON.stringify({ name: 'Bob', age: 25 })));

  // Read data
  console.log('Reading data...');
  const data1 = await storage.read('user-1');
  console.log('User 1:', JSON.parse(data1!.toString()));

  // Get stats
  const stats = storage.getStats();
  console.log('\nStorage stats:');
  console.log(`  Blocks: ${stats.totalBlocks}`);
  console.log(`  Size: ${stats.totalSize} bytes`);
  console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
}

// ============================================================================
// EXAMPLE 2: Vector Indexing with All Algorithms
// ============================================================================

async function example_vectorIndexing() {
  console.log('\n=== EXAMPLE 2: Vector Indexing ===\n');

  const { HNSWIndex, FlatIndex, IVFFlatIndex, PQIndex, DISTANCE_METRICS } = await import(
    './internal/vector/index'
  );

  // Sample vectors
  const vectors = [
    { id: 'v1', data: [1, 0, 0, 0] },
    { id: 'v2', data: [0.9, 0.1, 0, 0] },
    { id: 'v3', data: [0, 1, 0, 0] },
    { id: 'v4', data: [0.1, 0.9, 0, 0] },
    { id: 'v5', data: [0, 0, 1, 0] },
  ];
  const query = [1, 0, 0, 0];

  // Test each index type
  const indexes = [
    { name: 'HNSW', idx: new HNSWIndex('cosine') },
    { name: 'Flat', idx: new FlatIndex('cosine') },
    { name: 'IVF-Flat', idx: new IVFFlatIndex(10, 'cosine') },
    { name: 'PQ', idx: new PQIndex(2, 4, 'cosine') },
  ];

  for (const { name, idx } of indexes) {
    vectors.forEach((v) => idx.insert(v));
    const results = idx.search(query, 3);
    console.log(`${name} top 3 results:`);
    results.forEach((r) => console.log(`  ${r.id}: distance=${r.distance.toFixed(3)}`));
  }

  // Test distance metrics
  console.log('\nDistance metrics:');
  console.log('  Cosine([1,0], [1,0]):', DISTANCE_METRICS['cosine'].compute([1, 0], [1, 0]).toFixed(3));
  console.log('  Euclidean([0,0], [3,4]):', DISTANCE_METRICS['euclidean'].compute([0, 0], [3, 4]).toFixed(3));
  console.log('  Dot-product([1,2], [3,4]):', DISTANCE_METRICS['dot_product'].compute([1, 2], [3, 4]));
}

// ============================================================================
// EXAMPLE 3: SQL Parsing
// ============================================================================

async function example_sqlParsing() {
  console.log('\n=== EXAMPLE 3: SQL Parsing ===\n');

  const { parseSQL } = await import('./internal/parser/parser');

  const queries = [
    'SELECT * FROM users WHERE age > 18',
    'INSERT INTO users (id, name) VALUES (1, "Alice")',
    'UPDATE users SET age = 30 WHERE id = 1',
    'DELETE FROM users WHERE id = 1',
    'CREATE TABLE users (id INT, name TEXT)',
  ];

  for (const query of queries) {
    console.log(`Query: ${query}`);
    try {
      const ast = parseSQL(query);
      console.log(`Type: ${ast.type}`);
      if (ast.from) console.log(`  From: ${ast.from}`);
      if (ast.columns) console.log(`  Columns: ${ast.columns.join(', ')}`);
      console.log();
    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 4: Query Execution
// ============================================================================

async function example_queryExecution() {
  console.log('\n=== EXAMPLE 4: Query Execution ===\n');

  const { StorageEngine } = await import('./internal/storage/engine');
  const { QueryExecutor } = await import('./internal/executor/executor');
  const { parseSQL } = await import('./internal/parser/parser');

  const storage = new StorageEngine({
    dataDir: './examples-data/queries',
    pageSize: 4096,
    cacheSize: 100,
    driver: 'memory',
    walEnabled: false,
    mvccEnabled: true,
  });

  const executor = new QueryExecutor(storage);

  // Create table
  console.log('Creating table...');
  let ast = parseSQL('CREATE TABLE products (id INT, name TEXT, price FLOAT)');
  let context = await executor.execute(ast);
  console.log(`Status: ${context.error ? `Error: ${context.error}` : 'OK'}`);

  // Insert data
  console.log('\nInserting data...');
  const inserts = [
    'INSERT INTO products (id, name, price) VALUES (1, "Laptop", 999.99)',
    'INSERT INTO products (id, name, price) VALUES (2, "Mouse", 29.99)',
    'INSERT INTO products (id, name, price) VALUES (3, "Keyboard", 79.99)',
  ];

  for (const query of inserts) {
    ast = parseSQL(query);
    context = await executor.execute(ast);
    console.log(`  ${query.split('VALUES')[0].trim()} -> ${context.stats?.rowsAffected} rows`);
  }

  // Query data
  console.log('\nQuerying data...');
  ast = parseSQL('SELECT * FROM products');
  context = await executor.execute(ast);
  console.log(`Found ${context.results?.length} products:`);
  context.results?.slice(0, 3).forEach((row) => {
    console.log(`  ${JSON.stringify(row)}`);
  });
}

// ============================================================================
// EXAMPLE 5: SuperMemory System
// ============================================================================

async function example_superMemory() {
  console.log('\n=== EXAMPLE 5: SuperMemory System ===\n');

  const { SuperMemory } = await import('./internal/memory/memory');
  const { v4: uuid } = await import('uuid');

  const memory = new SuperMemory(100); // 100-item short-term cache

  // Store memories across tiers
  console.log('Storing memories...');
  const memories = [
    {
      id: uuid(),
      data: 'Alice is a software engineer at TechCorp',
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      metadata: { importance: 'high', category: 'person' },
    },
    {
      id: uuid(),
      data: 'Alice prefers Python and JavaScript',
      embedding: [0.15, 0.25, 0.35, 0.45, 0.5],
      metadata: { importance: 'medium', category: 'preferences' },
    },
    {
      id: uuid(),
      data: 'Alice attended ICML 2024 conference',
      embedding: [0.1, 0.25, 0.3, 0.4, 0.6],
      metadata: { importance: 'low', category: 'events' },
    },
  ];

  for (const mem of memories) {
    await memory.remember(mem);
    console.log(`  Stored: ${mem.data}`);
  }

  // Search across memories
  console.log('\nSearching memories...');
  const query = [0.12, 0.22, 0.32, 0.42, 0.52];
  const results = await memory.search({
    embedding: query,
    limit: 2,
  });
  console.log(`Found ${results.length} similar memories:`);
  results.forEach((r) => console.log(`  ${r.data}`));

  // Conversation tracking
  console.log('\nTracking conversation...');
  const convId = await memory.startConversation(['alice', 'agent']);
  await memory.addMessage(convId, {
    data: 'Hello! How can I help?',
    metadata: { role: 'agent' },
  });
  const conv = await memory.getConversation(convId);
  console.log(`Conversation: ${conv?.participantIds.join(', ')}`);
  console.log(`Messages: ${conv?.messages.length}`);

  // Statistics
  console.log('\nMemory statistics:');
  const stats = memory.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

// ============================================================================
// EXAMPLE 6: TypeScript SDK
// ============================================================================

async function example_sdk() {
  console.log('\n=== EXAMPLE 6: TypeScript SDK ===\n');

  const { EcoceeClient, QueryBuilder } = await import('./pkg/sdk-ts/client');

  console.log('SDK Examples:');
  console.log('\nCode:');
  console.log(`
  import { EcoceeClient } from 'ecoceedb/sdk-ts';

  const db = new EcoceeClient({
    host: 'localhost',
    port: 5432,
    password: 'ecocee'
  });

  // Query building
  const builder = new QueryBuilder();
  const { sql, params } = builder
    .select('id', 'name', 'email')
    .from('users')
    .where('age', '>', 18)
    .orderBy('name')
    .limit(10)
    .toSQL();

  // Vector search
  const results = await db.vectorSearch({
    table: 'embeddings',
    column: 'embedding',
    query: [0.1, 0.2, 0.3, ...],
    limit: 10,
    metric: 'cosine'
  });

  // Transactions
  const tx = await db.beginTransaction({ isolation: 'serializable' });
  await tx.insert('users', { id: '1', name: 'Alice' });
  await tx.commit();
  `);

  console.log('\nFeatures:');
  console.log('  ✓ Type-safe query building');
  console.log('  ✓ Connection pooling');
  console.log('  ✓ Transaction support');
  console.log('  ✓ Vector search integration');
  console.log('  ✓ Batch operations');
  console.log('  ✓ Async/await syntax');
}

// ============================================================================
// EXAMPLE 7: End-to-End Workflow
// ============================================================================

async function example_endToEnd() {
  console.log('\n=== EXAMPLE 7: End-to-End Workflow ===\n');

  const { StorageEngine } = await import('./internal/storage/engine');
  const { QueryExecutor } = await import('./internal/executor/executor');
  const { HNSWIndex } = await import('./internal/vector/index');
  const { parseSQL } = await import('./internal/parser/parser');
  const { SuperMemory } = await import('./internal/memory/memory');
  const { v4: uuid } = await import('uuid');

  console.log('Complete workflow demonstration:\n');

  // 1. Initialize storage
  console.log('1. Initializing storage engine...');
  const storage = new StorageEngine({
    dataDir: './examples-data/e2e',
    pageSize: 4096,
    cacheSize: 100,
    driver: 'memory',
    walEnabled: true,
    mvccEnabled: true,
  });

  // 2. Create executor
  console.log('2. Creating query executor...');
  const executor = new QueryExecutor(storage);

  // 3. Create table
  console.log('3. Creating table...');
  let ast = parseSQL('CREATE TABLE documents (id TEXT, title TEXT, embedding VECTOR)');
  await executor.execute(ast);

  // 4. Insert documents
  console.log('4. Inserting documents...');
  const docs = [
    { id: 'doc1', title: 'Machine Learning Basics', embedding: [0.1, 0.2, 0.3] },
    { id: 'doc2', title: 'Deep Learning Guide', embedding: [0.15, 0.25, 0.35] },
    { id: 'doc3', title: 'AI Ethics', embedding: [0.05, 0.15, 0.25] },
  ];

  for (const doc of docs) {
    ast = parseSQL(`INSERT INTO documents (id, title) VALUES ('${doc.id}', '${doc.title}')`);
    await executor.execute(ast);
  }

  // 5. Search documents
  console.log('5. Searching documents...');
  ast = parseSQL('SELECT * FROM documents');
  const context = await executor.execute(ast);
  console.log(`   Found ${context.results?.length} documents`);

  // 6. Vector indexing
  console.log('6. Building vector index...');
  const vectorIndex = new HNSWIndex('cosine');
  docs.forEach((doc) => vectorIndex.insert({ id: doc.id, data: doc.embedding }));

  // 7. Vector search
  console.log('7. Performing vector search...');
  const query = [0.12, 0.22, 0.32];
  const results = vectorIndex.search(query, 2);
  console.log('   Top 2 results:');
  results.forEach((r) => console.log(`     ${r.id}: distance=${r.distance.toFixed(3)}`));

  // 8. Memory system
  console.log('8. Storing in memory...');
  const memory = new SuperMemory(100);
  for (const doc of docs) {
    await memory.remember({
      data: doc.title,
      embedding: doc.embedding,
      metadata: { category: 'document' },
    });
  }

  // 9. Final stats
  console.log('9. Final statistics:');
  const stats = memory.getStats();
  console.log(`   Total memories: ${stats.longTerm.totalEntries + stats.shortTerm.totalEntries}`);

  console.log('\n✓ End-to-end workflow completed successfully!');
}

// ============================================================================
// EXAMPLE 8: Performance Characteristics
// ============================================================================

async function example_performance() {
  console.log('\n=== EXAMPLE 8: Performance Characteristics ===\n');

  const { StorageEngine } = await import('./internal/storage/engine');

  console.log('Storage Engine Performance:\n');

  const storage = new StorageEngine({
    dataDir: './examples-data/perf',
    pageSize: 4096,
    cacheSize: 1000,
    driver: 'memory',
    walEnabled: false,
    mvccEnabled: true,
  });

  // Write performance
  console.log('Write Performance (1000 operations):');
  const writeStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    await storage.write('perf', `key-${i}`, Buffer.from(`data-${i}`));
  }
  const writeTime = Date.now() - writeStart;
  console.log(`  Time: ${writeTime}ms`);
  console.log(`  Throughput: ${(1000 / (writeTime / 1000)).toFixed(0)} ops/sec`);

  // Read performance
  console.log('\nRead Performance (1000 operations):');
  const readStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    await storage.read(`key-${i}`);
  }
  const readTime = Date.now() - readStart;
  console.log(`  Time: ${readTime}ms`);
  console.log(`  Throughput: ${(1000 / (readTime / 1000)).toFixed(0)} ops/sec`);

  // Cache efficiency
  console.log('\nCache Efficiency:');
  const stats = storage.getStats();
  console.log(`  Total blocks: ${stats.totalBlocks}`);
  console.log(`  Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
}

// ============================================================================
// Main
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         ECOCEE v1.0 - Complete Examples Suite          ║');
  console.log('║  Production-Grade AI-Optimized Database Engine          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await example_basicStorage();
    await example_vectorIndexing();
    await example_sqlParsing();
    await example_queryExecution();
    await example_superMemory();
    await example_sdk();
    await example_endToEnd();
    await example_performance();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           ✅ All Examples Completed Successfully!       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run examples
runAllExamples();
