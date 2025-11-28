/**
 * Example 4: Real-Time Analytics
 * Track metrics and aggregate analytics data in real-time
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

interface Metric {
  timestamp: number;
  userId: string;
  event: string;
  value: number;
  tags: Record<string, string>;
}

async function recordMetric(metric: Metric) {
  // 1. Store individual metric as hash
  const metricId = `metric:${metric.event}:${metric.timestamp}`;
  await client.hset(metricId,
    'timestamp', String(metric.timestamp),
    'user_id', metric.userId,
    'event', metric.event,
    'value', String(metric.value),
    'tags', JSON.stringify(metric.tags),
  );

  // 2. Add to event bucket for quick retrieval (store as sorted order)
  const hour = Math.floor(metric.timestamp / (1000 * 60 * 60));
  const bucket = `metrics:${metric.event}:${hour}`;
  await client.lpush(bucket, metricId);

  // 3. Update user metrics
  const userBucket = `user:${metric.userId}:metrics`;
  await client.lpush(userBucket, metricId);

  console.log(`📊 Recorded metric: ${metric.event} = ${metric.value}`);
}

async function getMetricsSummary(event: string, hoursBack: number = 1) {
  const now = Date.now();
  const hourInMs = 1000 * 60 * 60;

  const summaryData: any = {
    event,
    period: `${hoursBack} hours`,
    metrics: [],
    stats: {
      count: 0,
      sum: 0,
      avg: 0,
      min: Infinity,
      max: -Infinity,
    },
  };

  // Iterate through recent hour buckets
  for (let i = 0; i < hoursBack; i++) {
    const hour = Math.floor(now / hourInMs) - i;
    const bucket = `metrics:${event}:${hour}`;

    try {
      const results = await client.lrange(bucket, 0, -1);
      if (Array.isArray(results)) {
        for (const metricId of results) {
          try {
            const metric = await client.hgetall(metricId);
            if (metric) {
              const value = parseFloat(String(metric.value || 0));
              summaryData.metrics.push(metric);
              summaryData.stats.count++;
              summaryData.stats.sum += value;
              summaryData.stats.min = Math.min(summaryData.stats.min, value);
              summaryData.stats.max = Math.max(summaryData.stats.max, value);
            }
          } catch (e) {
            // Metric retrieval error
          }
        }
      }
    } catch (e) {
      // Bucket retrieval error
    }
  }

  if (summaryData.stats.count > 0) {
    summaryData.stats.avg = summaryData.stats.sum / summaryData.stats.count;
  }

  return summaryData;
}

async function runExample() {
  try {
    console.log('🚀 Real-Time Analytics Example\n');

    await client.connect();

    // Simulate API metrics
    console.log('Recording metrics...\n');

    const events = [
      { event: 'api_requests', values: [120, 150, 145, 160] },
      { event: 'cache_hits', values: [95, 98, 97, 96] },
      { event: 'db_latency_ms', values: [25, 30, 28, 32] },
      { event: 'error_count', values: [2, 1, 3, 1] },
    ];

    for (const eventGroup of events) {
      for (const value of eventGroup.values) {
        const metric: Metric = {
          timestamp: Date.now() - Math.random() * 1000 * 60 * 60, // Random time in last hour
          userId: `user:${Math.floor(Math.random() * 100)}`,
          event: eventGroup.event,
          value,
          tags: {
            env: 'production',
            region: 'us-east-1',
          },
        };
        await recordMetric(metric);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Get analytics summary
    console.log('\n📈 Analytics Summary\n');

    for (const eventName of ['api_requests', 'cache_hits', 'db_latency_ms', 'error_count']) {
      const summary = await getMetricsSummary(eventName, 1);

      console.log(`\n${eventName}:`);
      console.log(`  Count: ${summary.stats.count}`);
      console.log(`  Sum: ${summary.stats.sum.toFixed(2)}`);
      console.log(`  Avg: ${summary.stats.avg.toFixed(2)}`);
      console.log(`  Min: ${summary.stats.min}`);
      console.log(`  Max: ${summary.stats.max}`);
    }

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
