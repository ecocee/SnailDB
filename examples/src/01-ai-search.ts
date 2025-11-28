/**
 * Example 1: AI-Powered Search Engine
 * Store document embeddings and search by semantic similarity
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

// Mock embedding function
async function getEmbedding(content: string): Promise<number[]> {
  // In real world, use OpenAI, Hugging Face, or similar
  return Array.from({ length: 384 }, () => Math.random());
}

async function indexDocuments() {
  await client.connect();

  const documents = [
    { id: 1, title: 'Machine Learning Basics', content: 'Introduction to ML concepts' },
    { id: 2, title: 'Deep Learning with Python', content: 'Deep neural networks in Python' },
    { id: 3, title: 'Natural Language Processing', content: 'NLP techniques and transformers' },
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

    console.log(`✅ Indexed: ${doc.title}`);
  }

  console.log('📚 Documents indexed successfully');
}

async function searchDocuments(query: string) {
  // Get query embedding
  const queryEmbedding = await getEmbedding(query);

  // Search for similar documents
  const results = await client.vectorSearch(queryEmbedding, 5);

  console.log(`\n🔍 Search results for: "${query}"`);
  console.log(`Found ${results.results.length} results:\n`);

  results.results.forEach((result: any, idx: number) => {
    console.log(`${idx + 1}. ID: ${result.id}, Distance: ${result.distance.toFixed(4)}`);
  });

  return results.results;
}

async function runExample() {
  try {
    console.log('🚀 AI-Powered Search Engine Example\n');
    await indexDocuments();
    await searchDocuments('machine learning algorithms');
    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
