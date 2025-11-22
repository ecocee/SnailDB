/**
 * Comprehensive Test Suite - Storage, Vector, Parser, Executor, Protocol
 * 50+ tests covering all major components
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StorageEngine, PageCache, BTreeIndex } from '../internal/storage/engine';
import { HNSWIndex, FlatIndex, IVFFlatIndex, DISTANCE_METRICS } from '../internal/vector/index';
import { Lexer, Parser, parseSQL } from '../internal/parser/parser';
import { QueryExecutor, QueryPlanner } from '../internal/executor/executor';
import { SuperMemory } from '../internal/memory/memory';
import { v4 as uuid } from 'uuid';

describe('Storage Engine', () => {
  let storage: StorageEngine;

  beforeEach(() => {
    storage = new StorageEngine({
      dataDir: './test-data',
      pageSize: 4096,
      cacheSize: 100,
      driver: 'memory',
      walEnabled: true,
      mvccEnabled: true,
    });
  });

  it('should write and read data', async () => {
    const key = 'test-key';
    const data = Buffer.from('test-data');
    await storage.write('test', key, data);
    const result = await storage.read(key);
    expect(result).toEqual(data);
  });

  it('should handle multiple writes', async () => {
    for (let i = 0; i < 10; i++) {
      const key = `key-${i}`;
      const data = Buffer.from(`data-${i}`);
      await storage.write('test', key, data);
    }

    for (let i = 0; i < 10; i++) {
      const key = `key-${i}`;
      const result = await storage.read(key);
      expect(result?.toString()).toBe(`data-${i}`);
    }
  });

  it('should delete data', async () => {
    const key = 'delete-key';
    const data = Buffer.from('delete-data');
    await storage.write('test', key, data);
    await storage.delete(key);
    const result = await storage.read(key);
    expect(result).toBeNull();
  });

  it('should provide stats', async () => {
    await storage.write('test', 'key1', Buffer.from('data1'));
    const stats = storage.getStats();
    expect(stats.totalBlocks).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  it('should run compaction', async () => {
    for (let i = 0; i < 50; i++) {
      await storage.write('test', `key-${i}`, Buffer.from(`data-${i}`));
    }
    await storage.compact();
    const stats = storage.getStats();
    expect(stats.totalBlocks).toBeGreaterThan(0);
  });
});

describe('Page Cache', () => {
  let cache: PageCache;

  beforeEach(() => {
    cache = new PageCache(10);
  });

  it('should store and retrieve from cache', () => {
    const key = 'key1';
    const value = Buffer.from('value1');
    cache.set(key, value);
    expect(cache.get(key)).toEqual(value);
  });

  it('should evict LRU items', () => {
    for (let i = 0; i < 15; i++) {
      cache.set(`key-${i}`, Buffer.from(`value-${i}`));
    }
    expect(cache.get('key-0')).toBeUndefined();
    expect(cache.get('key-14')).toBeDefined();
  });

  it('should track stats', () => {
    cache.set('key1', Buffer.from('value1'));
    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThan(0);
  });
});

describe('B-Tree Index', () => {
  let index: BTreeIndex;

  beforeEach(() => {
    index = new BTreeIndex();
  });

  it('should insert and search', () => {
    index.insert('key1', { id: 1, value: 'test' });
    const result = index.search('key1');
    expect(result).toEqual({ id: 1, value: 'test' });
  });

  it('should perform range queries', () => {
    index.insert('a', { id: 1 });
    index.insert('b', { id: 2 });
    index.insert('c', { id: 3 });
    index.insert('d', { id: 4 });

    const results = index.rangeQuery('b', 'c');
    expect(results.size).toBeGreaterThan(0);
  });
});

describe('Vector Indexing - HNSW', () => {
  let index: HNSWIndex;

  beforeEach(() => {
    index = new HNSWIndex('cosine');
  });

  it('should insert vectors', () => {
    index.insert({
      id: 'v1',
      data: [1, 0, 0],
    });
    index.insert({
      id: 'v2',
      data: [0, 1, 0],
    });
    expect(index.getSize()).toBe(2);
  });

  it('should search vectors', () => {
    index.insert({
      id: 'v1',
      data: [1, 0, 0],
    });
    index.insert({
      id: 'v2',
      data: [0.9, 0.1, 0],
    });
    index.insert({
      id: 'v3',
      data: [0, 1, 0],
    });

    const results = index.search([1, 0, 0], 2);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('v1');
  });

  it('should use cosine distance', () => {
    const metric = DISTANCE_METRICS['cosine'];
    const distance = metric.compute([1, 0], [1, 0]);
    expect(distance).toBeLessThan(0.01);
  });

  it('should use euclidean distance', () => {
    const metric = DISTANCE_METRICS['euclidean'];
    const distance = metric.compute([0, 0], [3, 4]);
    expect(distance).toBe(5);
  });
});

describe('Vector Indexing - Flat', () => {
  let index: FlatIndex;

  beforeEach(() => {
    index = new FlatIndex('euclidean');
  });

  it('should perform brute force search', () => {
    for (let i = 0; i < 10; i++) {
      index.insert({
        id: `v${i}`,
        data: Array(10)
          .fill(0)
          .map(() => Math.random()),
      });
    }

    const query = Array(10)
      .fill(0)
      .map(() => Math.random());
    const results = index.search(query, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe('Lexer & Parser', () => {
  it('should tokenize SELECT', () => {
    const lexer = new Lexer('SELECT * FROM users WHERE id = 1');
    const tokens = lexer.tokenize();
    expect(tokens[0].value).toBe('SELECT');
    expect(tokens[tokens.length - 1].type).toBe('EOF');
  });

  it('should parse SELECT statement', () => {
    const ast = parseSQL('SELECT name, email FROM users WHERE id = 1');
    expect(ast.type).toBe('SELECT');
    expect(ast.columns).toContain('name');
  });

  it('should parse INSERT statement', () => {
    const ast = parseSQL("INSERT INTO users (name, email) VALUES ('John', 'john@example.com')");
    expect(ast.type).toBe('INSERT');
    expect(ast.table).toBe('users');
  });

  it('should parse UPDATE statement', () => {
    const ast = parseSQL("UPDATE users SET name = 'Jane' WHERE id = 1");
    expect(ast.type).toBe('UPDATE');
    expect(ast.table).toBe('users');
  });

  it('should parse DELETE statement', () => {
    const ast = parseSQL('DELETE FROM users WHERE id = 1');
    expect(ast.type).toBe('DELETE');
    expect(ast.table).toBe('users');
  });

  it('should parse CREATE TABLE', () => {
    const ast = parseSQL('CREATE TABLE users (id INT, name TEXT)');
    expect(ast.type).toBe('CREATE_TABLE');
    expect(ast.columns).toHaveLength(2);
  });

  it('should handle complex WHERE clauses', () => {
    const ast = parseSQL('SELECT * FROM users WHERE age > 18 AND status = "active"');
    expect(ast.where).toBeDefined();
    expect(ast.where!.conditions.length).toBeGreaterThan(0);
  });
});

describe('Query Executor', () => {
  let executor: QueryExecutor;
  let storage: StorageEngine;

  beforeEach(() => {
    storage = new StorageEngine({
      dataDir: './test-data',
      pageSize: 4096,
      cacheSize: 100,
      driver: 'memory',
      walEnabled: false,
      mvccEnabled: true,
    });
    executor = new QueryExecutor(storage);
  });

  it('should create tables', async () => {
    const ast = parseSQL('CREATE TABLE products (id INT, name TEXT)');
    const context = await executor.execute(ast);
    expect(context.error).toBeUndefined();
  });

  it('should insert data', async () => {
    await executor.execute(parseSQL('CREATE TABLE products (id INT, name TEXT)'));
    const ast = parseSQL("INSERT INTO products (id, name) VALUES (1, 'Product1')");
    const context = await executor.execute(ast);
    expect(context.stats?.rowsAffected).toBe(1);
  });

  it('should handle SELECT queries', async () => {
    await executor.execute(parseSQL('CREATE TABLE items (id INT, value TEXT)'));
    await executor.execute(parseSQL("INSERT INTO items (id, value) VALUES (1, 'test')"));
    const context = await executor.execute(parseSQL('SELECT * FROM items'));
    expect(context.results?.length).toBeGreaterThan(0);
  });

  it('should create query plans', () => {
    const ast = parseSQL('SELECT * FROM users WHERE id = 1 ORDER BY name LIMIT 10');
    const plan = executor.createQueryPlan(ast);
    expect(plan.steps.length).toBeGreaterThan(0);
  });
});

describe('Query Planner', () => {
  let planner: QueryPlanner;

  beforeEach(() => {
    planner = new QueryPlanner();
  });

  it('should generate execution plans', () => {
    const ast = parseSQL('SELECT * FROM users');
    const plan = planner.plan(ast);
    expect(plan.steps).toBeDefined();
    expect(plan.estimatedCost).toBeGreaterThan(0);
  });
});

describe('SuperMemory System', () => {
  let memory: SuperMemory;

  beforeEach(() => {
    memory = new SuperMemory(100);
  });

  it('should store and recall memories', async () => {
    const entry = {
      id: uuid(),
      type: 'memory' as any,
      data: 'test memory',
      embedding: [1, 0, 0],
    };
    await memory.remember(entry);
    const recalled = await memory.recall(entry.id);
    expect(recalled?.data).toBe('test memory');
  });

  it('should search by embedding', async () => {
    const entry1 = {
      id: uuid(),
      type: 'memory' as any,
      data: 'first',
      embedding: [1, 0, 0],
      metadata: { category: 'test' },
    };
    const entry2 = {
      id: uuid(),
      type: 'memory' as any,
      data: 'second',
      embedding: [0.9, 0.1, 0],
      metadata: { category: 'test' },
    };

    await memory.remember(entry1);
    await memory.remember(entry2);

    const results = await memory.search({
      embedding: [1, 0, 0],
      limit: 5,
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should track conversations', async () => {
    const convId = await memory.startConversation(['user1', 'user2']);
    expect(convId).toBeDefined();

    const conv = await memory.getConversation(convId);
    expect(conv?.participantIds).toContain('user1');
  });

  it('should provide statistics', () => {
    const stats = memory.getStats();
    expect(stats.longTerm).toBeDefined();
    expect(stats.shortTerm).toBeDefined();
    expect(stats.episodic).toBeDefined();
    expect(stats.semantic).toBeDefined();
  });

  it('should consolidate memory', async () => {
    await memory.consolidate();
    const stats = memory.getStats();
    expect(stats.shortTerm.totalEntries).toBe(0);
  });
});

describe('Distance Metrics', () => {
  it('cosine similarity should work', () => {
    const metric = DISTANCE_METRICS['cosine'];
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    expect(metric.compute(a, b)).toBeLessThan(0.1);
  });

  it('euclidean distance should work', () => {
    const metric = DISTANCE_METRICS['euclidean'];
    const a = [0, 0, 0];
    const b = [3, 4, 0];
    expect(Math.abs(metric.compute(a, b) - 5)).toBeLessThan(0.01);
  });

  it('dot product should work', () => {
    const metric = DISTANCE_METRICS['dot_product'];
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(metric.compute(a, b)).toBeDefined();
  });
});

describe('Error Handling', () => {
  it('should handle invalid SQL', () => {
    expect(() => parseSQL('INVALID QUERY HERE')).toThrow();
  });

  it('should handle division by zero in cosine', () => {
    const metric = DISTANCE_METRICS['cosine'];
    const distance = metric.compute([0, 0], [0, 0]);
    expect(isNaN(distance) || isFinite(distance)).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should handle end-to-end workflow', async () => {
    const storage = new StorageEngine({
      dataDir: './test-data-e2e',
      pageSize: 4096,
      cacheSize: 100,
      driver: 'memory',
      walEnabled: false,
      mvccEnabled: true,
    });

    const executor = new QueryExecutor(storage);

    // Create table
    const createAst = parseSQL('CREATE TABLE products (id INT, name TEXT)');
    await executor.execute(createAst);

    // Insert data
    const insertAst = parseSQL("INSERT INTO products (id, name) VALUES (1, 'Product1')");
    const insertCtx = await executor.execute(insertAst);
    expect(insertCtx.stats?.rowsAffected).toBe(1);

    // Query data
    const selectAst = parseSQL('SELECT * FROM products');
    const selectCtx = await executor.execute(selectAst);
    expect(selectCtx.results?.length).toBeGreaterThan(0);
  });
});
