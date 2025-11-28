/**
 * Example 7: Cache Layer
 * Implement a caching layer with TTL and expiration
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

interface CacheEntry {
  value: any;
  expiresAt?: number;
  createdAt: number;
  hits: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  avgHitTime: number;
}

class Cache {
  private stats = {
    hits: 0,
    misses: 0,
    totalHitTime: 0,
  };

  async set(key: string, value: any, ttlMs?: number) {
    const now = Date.now();
    const expiresAt = ttlMs ? now + ttlMs : undefined;

    const entry: CacheEntry = {
      value,
      expiresAt,
      createdAt: now,
      hits: 0,
    };

    await client.hset(`cache:${key}`,
      'value', JSON.stringify(value),
      'expires_at', String(expiresAt || 0),
      'created_at', String(now),
      'hits', '0',
    );

    // Track in cache index
    await client.lpush('cache:index', key);
    console.log(`✅ Cached: ${key}${ttlMs ? ` (TTL: ${ttlMs / 1000}s)` : ''}`);
  }

  async get(key: string): Promise<any> {
    const startTime = Date.now();

    try {
      const entry = await client.hgetall(`cache:${key}`);

      if (!entry) {
        this.stats.misses++;
        console.log(`❌ Cache miss: ${key}`);
        return null;
      }

      // Check expiration
      const expiresAt = parseInt(String(entry.expires_at || 0), 10);
      if (expiresAt && Date.now() > expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        console.log(`❌ Cache expired: ${key}`);
        return null;
      }

      // Increment hits
      const hits = parseInt(String(entry.hits || 0), 10);
      await client.hset(`cache:${key}`, 'hits', String(hits + 1));

      this.stats.hits++;
      const hitTime = Date.now() - startTime;
      this.stats.totalHitTime += hitTime;

      console.log(`✅ Cache hit: ${key} (${hitTime}ms)`);
      return JSON.parse(String(entry.value));
    } catch (error) {
      this.stats.misses++;
      console.error(`❌ Cache retrieval error: ${error}`);
      return null;
    }
  }

  async delete(key: string) {
    try {
      await client.del(`cache:${key}`);
      console.log(`🗑️ Deleted: ${key}`);
    } catch (error) {
      console.error(`❌ Error deleting cache: ${error}`);
    }
  }

  async clear() {
    try {
      const keys = await client.lrange('cache:index', 0, -1);
      if (Array.isArray(keys)) {
        for (const key of keys) {
          await client.del(`cache:${key}`);
        }
      }
      await client.del('cache:index');
      console.log(`✅ Cache cleared`);
    } catch (error) {
      console.error(`❌ Error clearing cache: ${error}`);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const keys = await client.lrange('cache:index', 0, -1);
      const size = Array.isArray(keys) ? keys.length : 0;

      return {
        size,
        hits: this.stats.hits,
        misses: this.stats.misses,
        avgHitTime: this.stats.hits > 0 ? this.stats.totalHitTime / this.stats.hits : 0,
      };
    } catch (error) {
      console.error(`❌ Error getting cache stats: ${error}`);
      return {
        size: 0,
        hits: 0,
        misses: 0,
        avgHitTime: 0,
      };
    }
  }
}

async function mockDatabaseCall(key: string): Promise<any> {
  // Simulate slow database operation
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: key,
    data: `Database result for ${key}`,
    timestamp: Date.now(),
  };
}

async function getWithCache(cache: Cache, key: string, ttlMs: number = 60000): Promise<any> {
  let value = await cache.get(key);

  if (!value) {
    console.log(`⏳ Fetching from database...`);
    value = await mockDatabaseCall(key);
    await cache.set(key, value, ttlMs);
  }

  return value;
}

async function runExample() {
  try {
    console.log('🚀 Cache Layer Example\n');

    await client.connect();

    const cache = new Cache();

    // Example 1: Cache with TTL
    console.log('═══ Example 1: Caching with TTL ═══\n');

    const key1 = 'user:123:profile';
    const value1 = await getWithCache(cache, key1, 30000);
    console.log(`Retrieved: ${JSON.stringify(value1)}\n`);

    // Cache hit
    console.log('Fetching again (should hit cache):\n');
    const cached1 = await getWithCache(cache, key1, 30000);
    console.log(`Retrieved: ${JSON.stringify(cached1)}\n`);

    // Example 2: Multiple cache operations
    console.log('═══ Example 2: Multiple Operations ═══\n');

    const keys = ['product:001', 'product:002', 'product:003'];
    for (const key of keys) {
      await getWithCache(cache, key, 45000);
    }

    // Example 3: Cache statistics
    console.log('\n═══ Cache Statistics ═══\n');
    const stats = await cache.getStats();
    console.log(`Cache Size: ${stats.size}`);
    console.log(`Hits: ${stats.hits}`);
    console.log(`Misses: ${stats.misses}`);
    console.log(`Avg Hit Time: ${stats.avgHitTime.toFixed(2)}ms`);
    console.log(`Hit Rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`);

    // Example 4: Cache expiration simulation
    console.log('\n═══ Example 4: Short TTL Expiration ═══\n');
    const expireKey = 'temp:session:456';
    await cache.set(expireKey, { session: '456' }, 1000); // 1 second TTL
    console.log('Waiting 1.5 seconds for expiration...\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const expiredValue = await cache.get(expireKey);
    console.log(`Value after expiration: ${expiredValue}`);

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
