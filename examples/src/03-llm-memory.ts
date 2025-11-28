/**
 * Example 3: LLM Conversation Memory
 * Cache conversation embeddings for context retrieval
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

// Mock functions
async function getEmbedding(text: string): Promise<number[]> {
  return Array.from({ length: 384 }, () => Math.random());
}

function countTokens(message: string): number {
  return Math.ceil(message.length / 4);
}

async function storeConversation(userId: string, message: string, embedding: number[]) {
  const conversationId = `conversation:${userId}:${Date.now()}`;

  // 1. Store as vector for semantic search
  await client.vectorSet(conversationId, embedding, {
    user_id: userId,
    message_length: message.length,
    timestamp: Date.now(),
  });

  // 2. Store as hash for structured data
  await client.hset(`msg:${conversationId}`,
    'user_id', userId,
    'content', message,
    'timestamp', String(Date.now()),
    'tokens', String(countTokens(message)),
  );

  // 3. Store in a set for quick lookup
  await client.sadd(`history:${userId}`, conversationId);

  console.log(`✅ Stored conversation: ${conversationId}`);
}

async function getRelevantContext(userId: string, query: string, topK: number = 2) {
  const queryEmbedding = await getEmbedding(query);

  // Find similar messages in conversation
  const results = await client.vectorSearch(queryEmbedding, topK);

  // Retrieve full message content
  const context = [];
  for (const result of results.results) {
    try {
      const msg = await client.hgetall(result.id);
      if (msg) {
        context.push(msg);
      }
    } catch (error) {
      // Message might not exist
    }
  }

  console.log(`\n📚 Retrieved ${context.length} relevant messages`);
  return context;
}

async function runExample() {
  try {
    console.log('🚀 LLM Conversation Memory Example\n');

    await client.connect();

    const userId = 'user:12345';

    // Store some conversations
    console.log('Storing conversations...\n');

    const conversations = [
      'What is machine learning?',
      'How do neural networks work?',
      'Tell me about transformers in AI',
      'What is prompt engineering?',
    ];

    for (const msg of conversations) {
      const embedding = await getEmbedding(msg);
      await storeConversation(userId, msg, embedding);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for different timestamps
    }

    // Retrieve relevant context
    console.log('\n🔍 Searching for relevant context...');
    const context = await getRelevantContext(userId, 'neural networks and learning', 2);

    if (context.length > 0) {
      console.log('\nRetrieved Messages:');
      context.forEach((msg: any, idx: number) => {
        console.log(`${idx + 1}. ${msg.content || msg}`);
      });
    }

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
