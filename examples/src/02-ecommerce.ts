/**
 * Example 2: E-Commerce Product Recommendations
 * Find similar products based on embeddings
 */

import SnailDBClient from '../../src/client/snaildb-client';

const client = new SnailDBClient({ uri: 'snaildb://localhost:12222', timeout: 5000 });

// Mock product embedding function
async function generateProductEmbedding(product: any): Promise<number[]> {
  // In real world, use product features, descriptions, etc.
  return Array.from({ length: 384 }, () => Math.random());
}

async function setupProductCatalog() {
  await client.connect();

  const products = [
    { id: 'prod:001', name: 'Winter Jacket', price: 99.99, category: 'Clothing' },
    { id: 'prod:002', name: 'Summer Shirt', price: 29.99, category: 'Clothing' },
    { id: 'prod:003', name: 'Running Shoes', price: 79.99, category: 'Footwear' },
    { id: 'prod:004', name: 'Wool Sweater', price: 49.99, category: 'Clothing' },
  ];

  for (const product of products) {
    const embedding = await generateProductEmbedding(product);

    // Store vector
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
      'views', '0',
      'sales', '0',
    );

    console.log(`✅ Added product: ${product.name}`);
  }

  console.log('🛒 Product catalog setup complete');
}

async function getRecommendations(productId: string, topK: number = 3) {
  // Get product vector
  const productVector = await client.get(`product:${productId}:vector`) as any;

  if (!productVector) {
    console.log(`⚠️ Product ${productId} not found`);
    return [];
  }

  // Find similar products
  const recommendations = await client.vectorSearch(productVector, topK + 1);

  // Filter out the product itself and return top K
  const results = recommendations.results
    .filter((r: any) => r.id !== `product:${productId}:vector`)
    .slice(0, topK);

  return results;
}

async function runExample() {
  try {
    console.log('🚀 E-Commerce Product Recommendations Example\n');

    await setupProductCatalog();

    console.log('\n📊 Getting recommendations for prod:001:\n');
    const similar = await getRecommendations('prod:001', 2);

    console.log(`Found ${similar.length} similar products:\n`);
    similar.forEach((product: any, idx: number) => {
      console.log(`${idx + 1}. ID: ${product.id}, Distance: ${product.distance.toFixed(4)}`);
    });

    await client.disconnect();
    console.log('\n✅ Example completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export default runExample;
