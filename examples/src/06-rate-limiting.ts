/**
 * Example 6: Rate Limiting
 * Implement per-user rate limiting with sliding window
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
};

async function checkRateLimit(userId: string, config: RateLimitConfig = DEFAULT_CONFIG): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `ratelimit:${userId}`;

  try {
    // Get all requests in the current window
    const requests = await client.lrange(key, 0, -1);

    // Filter requests within the current window
    const validRequests = [];
    if (Array.isArray(requests)) {
      for (const req of requests) {
        try {
          const timestamp = parseInt(String(req), 10);
          if (timestamp > windowStart) {
            validRequests.push(timestamp);
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }

    const currentCount = validRequests.length;
    const allowed = currentCount < config.maxRequests;

    if (allowed) {
      // Add current request
      await client.lpush(key, String(now));

      // Set a TTL-like cleanup (store next reset time)
      const resetAt = windowStart + config.windowMs + 1000;
      await client.hset(`${key}:meta`,
        'reset_at', String(resetAt),
        'max_requests', String(config.maxRequests),
      );
    }

    const resetTime = windowStart + config.windowMs;

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0)),
      resetAt: resetTime,
    };
  } catch (error) {
    console.error(`❌ Rate limit check error: ${error}`);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + config.windowMs,
    };
  }
}

async function getRateLimitStatus(userId: string) {
  const key = `ratelimit:${userId}`;

  try {
    const requests = await client.lrange(key, 0, -1);
    const meta = await client.hgetall(`${key}:meta`);

    const requestCount = Array.isArray(requests) ? requests.length : 0;
    const maxRequests = parseInt(String(meta?.max_requests || 100), 10);
    const resetAt = parseInt(String(meta?.reset_at || Date.now()), 10);

    return {
      userId,
      requestCount,
      maxRequests,
      remaining: Math.max(0, maxRequests - requestCount),
      resetAt,
      resetInSeconds: Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error(`❌ Error getting rate limit status: ${error}`);
    return null;
  }
}

async function resetUserLimit(userId: string) {
  const key = `ratelimit:${userId}`;

  try {
    await client.del(key);
    await client.del(`${key}:meta`);
    console.log(`✅ Reset rate limit for ${userId}`);
  } catch (error) {
    console.error(`❌ Error resetting rate limit: ${error}`);
  }
}

async function runExample() {
  try {
    console.log('🚀 Rate Limiting Example\n');

    await client.connect();

    const userId = 'user:api:5678';
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    };

    console.log(`Testing rate limit: ${config.maxRequests} requests per ${config.windowMs / 1000}s\n`);

    // Simulate multiple API requests
    console.log('Simulating API requests...\n');

    for (let i = 1; i <= 7; i++) {
      const result = await checkRateLimit(userId, config);

      const status = result.allowed ? '✅ ALLOWED' : '❌ BLOCKED';
      console.log(`Request ${i}: ${status} | Remaining: ${result.remaining}`);

      if (!result.allowed) {
        const resetInMs = result.resetAt - Date.now();
        console.log(`  ⏰ Reset in ${(resetInMs / 1000).toFixed(1)} seconds`);
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Check status
    console.log('\n📊 Rate Limit Status:\n');
    const status = await getRateLimitStatus(userId);
    if (status) {
      console.log(`User: ${status.userId}`);
      console.log(`Requests: ${status.requestCount}/${status.maxRequests}`);
      console.log(`Remaining: ${status.remaining}`);
      console.log(`Resets in: ${status.resetInSeconds} seconds`);
    }

    // Reset and try again
    console.log('\n🔄 Resetting rate limit...\n');
    await resetUserLimit(userId);

    const resultAfterReset = await checkRateLimit(userId, config);
    console.log(`After reset - Allowed: ${resultAfterReset.allowed}, Remaining: ${resultAfterReset.remaining}`);

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
