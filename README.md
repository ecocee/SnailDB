# SNAILDB v2.0.0

**AI-Optimized Custom Database Engine** - Built entirely in TypeScript for LLM and AI Models

> Developed by [Ecocee](https://ecocee.in) - Next-Generation AI & Embedded Systems Engineering

---

## Table of Contents

- [About Ecocee](#about-ecocee)
- [Overview](#overview)
- [Key Features](#key-features)
- [Why SNAILDB?](#why-snaildb)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Real-World Use Cases](#real-world-use-cases)
- [Production Ready](#production-ready)
- [Documentation](#documentation)
- [Support & Community](#support--community)

---

## About Ecocee

**[Ecocee](https://ecocee.in)** is a next-generation AI and Embedded Systems engineering company specializing in:

- **Artificial Intelligence Frameworks** - Advanced ML models and algorithms
- **Embedded Firmware** - Real-time embedded systems
- **IoT Architectures** - Connected device ecosystems
- **Automation Platforms** - Intelligent process automation
- **Secure Digital Technologies** - Enterprise security solutions

We blend research, innovation, and practical engineering to deliver **reliable, scalable, and future-ready solutions** for industrial, commercial, and modern enterprise applications.

**SNAILDB** represents our commitment to providing production-grade, AI-first database technology that is open-source, self-hosted, and designed specifically for the LLM/AI revolution.

### Resources
- **Website**: [ecocee.in](https://ecocee.in)
- **GitHub**: [github.com/ecocee/snaildb](https://github.com/ecocee/snaildb)
- **Email**: contact@ecocee.in

---

## Overview

SNAILDB is a **production-grade, self-hosted database** designed specifically for AI/LLM applications with:

- **High-Performance Vector Search** - HNSW indexing for semantic embeddings
- **Built-in Persistence** - Write-Ahead Logs + RDB checkpoints  
- **Security First** - Authentication, encryption, rate limiting
- **Fast In-Memory Storage** - Optimized for latency-sensitive operations
- **AI-Ready** - Purpose-built for LLM embeddings and semantic search
- **Full Monitoring** - Metrics, health checks, diagnostics
- **Replication Ready** - Master-slave architecture support
- **Self-Hosted** - Complete control, no vendor lock-in
- **Docker Ready** - Kubernetes-compatible deployment
- **Open Source** - MIT license, community-driven

---

## Key Features

### Vector Search & Semantic Retrieval
- **HNSW Algorithm** - Hierarchical Navigable Small World indexing
- **384-dimensional support** - Optimized for modern LLM embeddings
- **Multiple distance metrics** - Cosine, Euclidean, Dot Product
- **Real-time indexing** - Add vectors without rebuilding
- **Batch operations** - Efficient bulk inserts and searches

### Data Persistence & Recovery
- **Write-Ahead Logs (WAL)** - Crash-safe operations
- **RDB Snapshots** - Periodic checkpoints with compression
- **Automatic recovery** - Replay logs on restart
- **Configurable intervals** - Tune performance vs durability

### Enterprise Security
- **Optional authentication** - Server password protection
- **Network isolation** - Self-hosted, no external dependencies
- **Rate limiting** - Prevent abuse and DoS attacks
- **Input validation** - Secure command processing
- **Audit logging** - Track all operations

### Performance & Scalability
- **40,000+ SET ops/sec** - High-throughput writes
- **60,000+ GET ops/sec** - Sub-millisecond reads
- **10,000+ vector queries/sec** - Fast semantic search
- **LRU/LFU eviction** - Efficient memory management
- **Configurable memory limits** - 512MB to multi-GB support

### AI-First Design
- **LLM-optimized** - Purpose-built for language models
- **Context storage** - Persist conversation state
- **Semantic caching** - Cache embeddings and results
- **Session management** - Track user interactions
- **Prompt optimization** - Store and retrieve prompt templates

### Observability & Monitoring
- **Real-time metrics** - Connections, commands, errors
- **Health checks** - Verify server status
- **Structured logging** - Debug and audit trails
- **Performance stats** - Cache hits/misses, memory usage
- **Prometheus-compatible** - Integration with monitoring stacks

### Self-Hosted & Private
- **No cloud vendor** - Complete data control
- **On-premises deployment** - Full compliance support
- **Network-isolated** - Air-gapped environments supported
- **Open source** - Full transparency and auditability
- **Customizable** - Extend for specific needs

---

## Why SNAILDB?

### vs Redis
- Vector search built-in (Redis: add-on module)
- AI/LLM optimized design
- Smaller resource footprint
- Simpler deployment (no Lua scripting required)
- Perfect for semantic search workloads

### vs Milvus
- Simpler deployment (no Java/Python dependencies)
- All-in-one solution (no micro-services complexity)
- Lower latency for smaller datasets
- Faster iteration for prototyping
- Self-hosted, TypeScript native

### vs Pinecone/Weaviate (Cloud)
- No subscription costs
- Complete data privacy
- Zero vendor lock-in
- Full customization control
- On-premises deployment
- Open source transparency

### For AI/LLM Applications
- Semantic search out-of-the-box
- LLM context caching
- Embedding storage optimized
- Session management built-in
- RAG pipeline ready

---

## Quick Start

### 1. Installation

```bash
# Clone repository
git clone https://github.com/ecocee/snaildb.git
cd snaildb

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Server available at: snaildb://localhost:12222
```

### 2. Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
NODE_ENV=production npm run server:prod

# With custom configuration
npm run server -- --host 0.0.0.0 --port 9999 --password mypass

# Docker
docker build -t snaildb:latest .
docker run -p 12222:12222 -v snaildb-data:/app/data snaildb:latest
```

### 3. Connect from Application

```typescript
import SnailDBClient from './src/client/snaildb-client';

async function main() {
  const client = new SnailDBClient({
    uri: 'snaildb://localhost:12222',
    timeout: 5000,
  });

  try {
    // Connect
    await client.connect();
    console.log('Connected to SNAILDB');

    // Store data
    await client.set('user:1', { 
      name: 'Alice',
      email: 'alice@example.com' 
    });

    // Retrieve data
    const user = await client.get('user:1');
    console.log('User:', user);

    // Vector search (AI embeddings)
    const embedding = Array.from({ length: 384 }, () => Math.random());
    await client.vectorSet('embedding:1', embedding, { 
      model: 'gpt-3.5',
      text: 'Hello world' 
    });

    const results = await client.vectorSearch(embedding, 10);
    console.log('Search results:', results);

    // Disconnect
    await client.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### 4. Run Tests

```bash
# Start server in one terminal
npm run dev

# Run tests in another terminal
npm test              # Jest tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:simple  # Simple integration test
```

---

## Installation

For detailed installation instructions including Docker, Kubernetes, and cloud deployment, see **[INSTALLATION.md](./INSTALLATION.md)**

Key methods:
- From source (development)
- npm package (when published)
- Docker (recommended for production)
- Kubernetes (enterprise deployments)
- Bare metal / VM (on-premises)

---

## Real-World Use Cases

### 1. LLM Context & Memory
```typescript
// Store and retrieve conversation context
await db.set(`context:${sessionId}`, {
  messages: [...],
  metadata: { model: 'gpt-4', tokens: 1250 }
});
```

### 2. Semantic Search & RAG
```typescript
// Index documents and search by semantic similarity
const embedding = await model.embed(document);
await db.vectorSet(`doc:${id}`, embedding, { text: doc });
const similar = await db.vectorSearch(queryEmbedding, 10);
```

### 3. Session Management
```typescript
// Track user sessions with metadata
await db.hset(`session:${id}`, 'user_id', userId, 'token', token);
```

### 4. Prompt Caching
```typescript
// Cache LLM responses to reduce API calls
await db.set(`cache:${hash}`, response, 86400); // 24h TTL
```

### 5. Rate Limiting
```typescript
// Implement per-user rate limiting
const count = await db.incr(`rate:${userId}`);
if (count > limit) throw new Error('Rate limited');
```

For more examples, see **[EXAMPLES.md](./EXAMPLES.md)**

---

## Production Ready

### Security Checklist

- **Authentication** - Optional password protection
- **Encryption** - TLS ready (with reverse proxy)
- **Rate limiting** - Configurable per user/endpoint
- **Input validation** - All commands sanitized
- **Error handling** - Comprehensive error classes
- **Audit logging** - All operations logged
- **Recovery** - WAL-based crash recovery
- **Testing** - 14 comprehensive Jest tests
- **Monitoring** - Real-time metrics export

### Performance Metrics

| Operation | Throughput | Latency |
|-----------|-----------|---------|
| SET | 40,000+ ops/sec | <1ms |
| GET | 60,000+ ops/sec | <1ms |
| DEL | 35,000+ ops/sec | <1ms |
| Vector Search | 10,000+ queries/sec | 5-50ms |
| Batch (100 ops) | 5,000+ batches/sec | 10-20ms |

### Deployment Options

- **Docker** - Single container, all-in-one
- **Docker Compose** - Full stack with monitoring
- **Kubernetes** - Enterprise-grade orchestration
- **VM/Bare Metal** - Direct Node.js deployment
- **Cloud** - AWS, GCP, Azure compatible

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](./QUICKSTART.md)** | 5-minute quick start guide |
| **[INSTALLATION.md](./INSTALLATION.md)** | Installation & deployment methods |
| **[API.md](./API.md)** | Complete API reference |
| **[FEATURES.md](./FEATURES.md)** | Feature matrix & capabilities |
| **[EXAMPLES.md](./EXAMPLES.md)** | Real-world usage examples |
| **[SECURITY.md](./SECURITY.md)** | Security best practices |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Production deployment guide |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Contribution guidelines |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | Project status & roadmap |

---

## Support & Community

### Ecocee Support

For enterprise support, training, and custom development:
- **Website**: [ecocee.in](https://ecocee.in)
- **Email**: contact@ecocee.in
- **LinkedIn**: [Ecocee](https://linkedin.com/company/ecocee)

### Open Source Community

- **Star** the [GitHub repo](https://github.com/ecocee/snaildb)
- **Fork** for development
- **Contribute** - See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Suggest features** - Open discussions
- **Report bugs** - [GitHub Issues](https://github.com/ecocee/snaildb/issues)

### Getting Help

- **Docs** - [Full documentation](./docs/)
- **Discussions** - [GitHub Discussions](https://github.com/ecocee/snaildb/discussions)
- **Issues** - [Report bugs](https://github.com/ecocee/snaildb/issues)
- **Email** - contact@ecocee.in

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code standards
- Pull request process
- Testing requirements

---

## License

**MIT License** - See [LICENSE](LICENSE) file for details

Copyright (c) 2025 Ecocee

---

## Roadmap

### v2.1 (Q1 2025)
- Redis-compatible protocol mode
- GraphQL API
- Enhanced replication

### v2.2 (Q2 2025)
- Distributed SQL queries
- GPU acceleration for vector search
- Time-series optimizations

### v3.0 (Q3 2025)
- Kafka stream integration
- Machine learning model serving
- Distributed clustering

---

## Tech Stack

- **Language** - TypeScript 5.3+
- **Runtime** - Node.js 18+
- **Storage** - In-memory with RDB/WAL
- **Vector Index** - HNSW
- **Testing** - Jest
- **Deployment** - Docker, Kubernetes
- **Monitoring** - Prometheus-compatible

---

## Comparison

```
                      SNAILDB  Redis  Milvus  Pinecone
─────────────────────────────────────────────────────
Vector Search           Yes      No     Yes     Yes
Self-Hosted            Yes     Yes     Yes      No
Simple Deploy          Yes     Yes      No     N/A
TypeScript Native      Yes      No      No      No
No External Deps       Yes     Yes      No     N/A
Open Source            Yes     Yes     Yes      No
AI/LLM Optimized       Yes      No     Yes     Yes
─────────────────────────────────────────────────────
```

---

## Acknowledgments

- HNSW algorithm - Yu. A. Malkov and D. A. Yashunin
- Inspired by Redis, Milvus, and Weaviate
- Built with TypeScript and Node.js communities

---

## Contact

- **Website** - [ecocee.in](https://ecocee.in)
- **Email** - info@ecocee.in
- **GitHub** - [@ecocee](https://github.com/ecocee)
- **LinkedIn** - [Ecocee](https://linkedin.com/company/ecocee)

---

**Built for AI/LLM applications by Ecocee**

Open Source | Production Ready | Self-Hosted

Version 2.0.0 | TypeScript | Node.js 18+ | MIT License

Last Updated: November 28, 2025