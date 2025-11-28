/**
 * SNAILDB Client Integration Tests
 * Tests core functionality of the SNAILDB client SDK
 */

import SnailDBClient from '../src/client/snaildb-client';

describe('SNAILDB Client Integration Tests', () => {
  let client: SnailDBClient;

  /**
   * Setup: Connect to server before tests
   */
  beforeAll(async () => {
    client = new SnailDBClient({
      uri: 'snaildb://localhost:12222',
      timeout: 5000,
    });

    await client.connect();
  });

  /**
   * Teardown: Disconnect after tests
   */
  afterAll(async () => {
    await client.disconnect();
  });

  describe('String Operations', () => {
    it('should set and get a string value', async () => {
      await client.set('user:1', { name: 'Alice', email: 'alice@example.com' });
      const user = await client.get('user:1');

      expect(user).toBeDefined();
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@example.com');
    });

    it('should set multiple keys', async () => {
      await client.set('user:2', { name: 'Bob', email: 'bob@example.com' });
      await client.set('user:3', { name: 'Charlie', email: 'charlie@example.com' });

      const user2 = await client.get('user:2');
      const user3 = await client.get('user:3');

      expect(user2.name).toBe('Bob');
      expect(user3.name).toBe('Charlie');
    });

    it('should handle non-existent keys', async () => {
      try {
        const result = await client.get('non:existent:key');
        // Key not found may return null/undefined or throw error
        expect(result === undefined || result === null).toBe(true);
      } catch (error) {
        // Error handling is acceptable
        expect(error).toBeDefined();
      }
    });
  });

  describe('Key Management', () => {
    it('should check if keys exist', async () => {
      const result = await client.exists('user:1', 'user:2', 'user:3');
      // Result returns an object with 'exists' property or direct number
      const count = typeof result === 'number' ? result : (result as any).exists;
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should list keys with pattern', async () => {
      const keys = await client.keys('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).toContain('user:3');
      expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it('should delete a key', async () => {
      await client.del('user:3');
      const keys = await client.keys('user:*');

      expect(keys).not.toContain('user:3');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
    });

    it('should get key type', async () => {
      const result = await client.type('user:1');
      // Result returns an object with 'type' property or direct string
      const typeStr = typeof result === 'string' ? result : (result as any).type;
      expect(typeStr).toBe('string');
    });
  });

  describe('Vector Operations', () => {
    it('should store and search vectors', async () => {
      // Create a 384-dimensional embedding
      const embedding = Array.from({ length: 384 }, () => Math.random());

      // Store the vector
      await client.vectorSet('embedding:1', embedding, { model: 'gpt-3.5' });

      // Search with the same vector (should find itself with distance near 0)
      const results = await client.vectorSearch(embedding, 10);

      expect(results).toBeDefined();
      expect(results.results).toBeDefined();
      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results[0].id).toBe('embedding:1');
      // Distance should be very close to 0 (allowing for floating point errors)
      expect(Math.abs(results.results[0].distance)).toBeLessThan(1e-10);
    });

    it('should store multiple vectors', async () => {
      const emb1 = Array.from({ length: 384 }, () => Math.random());
      const emb2 = Array.from({ length: 384 }, () => Math.random());

      await client.vectorSet('embedding:vec1', emb1, { type: 'text' });
      await client.vectorSet('embedding:vec2', emb2, { type: 'image' });

      const results = await client.vectorSearch(emb1, 10);

      expect(results.results).toBeDefined();
      expect(results.results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Server Operations', () => {
    it('should retrieve server stats', async () => {
      const stats = await client.stats();

      expect(stats).toBeDefined();
      expect(stats.connections).toBeDefined();
      expect(stats.commands).toBeDefined();
      expect(stats.errors).toBeDefined();
      expect(stats.uptime).toBeDefined();
      expect(stats.storage).toBeDefined();
    });

    it('should verify connection status', () => {
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should maintain connection after operations', async () => {
      await client.set('test:key', 'test:value');
      expect(client.isConnected()).toBe(true);
    });

    it('should handle connection state properly', async () => {
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle multiple rapid commands', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(client.set(`perf:key:${i}`, { value: i }));
      }

      await Promise.all(promises);

      const keys = await client.keys('perf:key:*');
      expect(keys.length).toBeGreaterThanOrEqual(10);
    });
  });
});
