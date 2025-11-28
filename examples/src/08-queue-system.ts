/**
 * Example 8: Queue System
 * Implement a job queue for async task processing
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

interface Job {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

class JobQueue {
  private queueName: string = 'jobs:queue';
  private processedQueue: string = 'jobs:processed';
  private failedQueue: string = 'jobs:failed';

  async enqueue(jobType: string, jobData: any): Promise<string> {
    const jobId = `job:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    const job: Job = {
      id: jobId,
      type: jobType,
      status: 'pending',
      data: jobData,
      createdAt: Date.now(),
    };

    // Store job details
    await client.hset(jobId,
      'type', jobType,
      'status', 'pending',
      'data', JSON.stringify(jobData),
      'created_at', String(job.createdAt),
    );

    // Add to queue
    await client.rpush(this.queueName, jobId);

    console.log(`📝 Enqueued job: ${jobId.split(':')[1]} (${jobType})`);
    return jobId;
  }

  async dequeue(): Promise<Job | null> {
    const jobId = await client.lpop(this.queueName);

    if (!jobId) {
      return null;
    }

    const jobData = await client.hgetall(String(jobId));
    if (!jobData) {
      return null;
    }

    // Update status to processing
    await client.hset(String(jobId), 'status', 'processing', 'started_at', String(Date.now()));

    return {
      id: String(jobId),
      type: String(jobData.type || ''),
      status: 'processing',
      data: JSON.parse(String(jobData.data || '{}')),
      createdAt: parseInt(String(jobData.created_at || 0), 10),
      startedAt: Date.now(),
    };
  }

  async complete(jobId: string, result: any) {
    const now = Date.now();

    await client.hset(jobId,
      'status', 'completed',
      'completed_at', String(now),
      'result', JSON.stringify(result),
    );

    // Move to processed queue
    await client.lpush(this.processedQueue, jobId);

    console.log(`✅ Job completed: ${jobId.split(':')[1]}`);
  }

  async fail(jobId: string, error: string, retryCount: number = 0) {
    const now = Date.now();

    await client.hset(jobId,
      'status', 'failed',
      'error', error,
      'failed_at', String(now),
      'retry_count', String(retryCount),
    );

    // Move to failed queue
    await client.lpush(this.failedQueue, jobId);

    console.log(`❌ Job failed: ${jobId.split(':')[1]} - ${error}`);
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const jobData = await client.hgetall(jobId);

      if (!jobData) {
        return null;
      }

      return {
        id: jobId,
        type: String(jobData.type || ''),
        status: String(jobData.status || 'pending') as any,
        data: JSON.parse(String(jobData.data || '{}')),
        createdAt: parseInt(String(jobData.created_at || 0), 10),
        startedAt: jobData.started_at ? parseInt(String(jobData.started_at), 10) : undefined,
        completedAt: jobData.completed_at ? parseInt(String(jobData.completed_at), 10) : undefined,
        result: jobData.result ? JSON.parse(String(jobData.result)) : undefined,
        error: jobData.error ? String(jobData.error) : undefined,
      };
    } catch (error) {
      console.error(`❌ Error retrieving job: ${error}`);
      return null;
    }
  }

  async getStats() {
    try {
      const pending = await client.llen(this.queueName);
      const processed = await client.llen(this.processedQueue);
      const failed = await client.llen(this.failedQueue);

      return {
        pending: typeof pending === 'number' ? pending : 0,
        processed: typeof processed === 'number' ? processed : 0,
        failed: typeof failed === 'number' ? failed : 0,
        total: (typeof pending === 'number' ? pending : 0) +
               (typeof processed === 'number' ? processed : 0) +
               (typeof failed === 'number' ? failed : 0),
      };
    } catch (error) {
      console.error(`❌ Error getting stats: ${error}`);
      return { pending: 0, processed: 0, failed: 0, total: 0 };
    }
  }
}

// Mock job processors
async function processEmailJob(data: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { sent: true, to: data.email, timestamp: Date.now() };
}

async function processAnalyticsJob(data: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return { aggregated: true, events: data.count, period: data.period };
}

async function processImageJob(data: any): Promise<any> {
  if (Math.random() > 0.7) {
    throw new Error('Image processing failed: Invalid format');
  }
  await new Promise(resolve => setTimeout(resolve, 600));
  return { processed: true, url: data.imageUrl, size: '2.5MB' };
}

async function runExample() {
  try {
    console.log('🚀 Queue System Example\n');

    await client.connect();

    const queue = new JobQueue();

    // Enqueue jobs
    console.log('═══ Enqueuing Jobs ═══\n');

    const emailJobId = await queue.enqueue('email', { email: 'user@example.com', subject: 'Welcome' });
    const analyticsJobId = await queue.enqueue('analytics', { count: 1000, period: 'daily' });
    const imageJobId = await queue.enqueue('image', { imageUrl: 's3://bucket/image.jpg' });

    // Process jobs
    console.log('\n═══ Processing Jobs ═══\n');

    for (let i = 0; i < 3; i++) {
      const job = await queue.dequeue();

      if (!job) {
        console.log('No jobs in queue');
        break;
      }

      console.log(`\n⚙️ Processing: ${job.type}`);

      try {
        let result;
        if (job.type === 'email') {
          result = await processEmailJob(job.data);
        } else if (job.type === 'analytics') {
          result = await processAnalyticsJob(job.data);
        } else if (job.type === 'image') {
          result = await processImageJob(job.data);
        }

        await queue.complete(job.id, result);
      } catch (error) {
        await queue.fail(job.id, String(error), 0);
      }
    }

    // Check job status
    console.log('\n═══ Job Status ═══\n');

    const emailJob = await queue.getJob(emailJobId);
    console.log(`Email job: ${emailJob?.status}`);

    const imageJob = await queue.getJob(imageJobId);
    console.log(`Image job: ${imageJob?.status}`);

    // Queue statistics
    console.log('\n═══ Queue Statistics ═══\n');
    const stats = await queue.getStats();
    console.log(`Pending: ${stats.pending}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Total: ${stats.total}`);

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
