# ECOCEE v1.0 - AI-Optimized Database Engine

**A production-grade, custom-built database engine specifically designed for AI applications, featuring advanced vector search, intelligent memory systems, and a complete query processing pipeline.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENCE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](tsconfig.json)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](package.json)

## 🚀 Quick Start

### Installation & Build
```bash
npm install
npm run build
```

### Start Server
```bash
npm run start
# ✓ ECOCEE server listening on localhost:5432
```

### Interactive Shell
```bash
npm run shell
ecocee> CREATE TABLE users (id TEXT, name TEXT);
ecocee> INSERT INTO users VALUES ('1', 'Alice');
ecocee> SELECT * FROM users;
```

---

## ✨ Key Features

### 1. **Custom Storage Engine**
- **Block-based storage** with configurable 4KB pages
- **LSM-tree** for efficient sequential writes
- **Write-Ahead Logging (WAL)** ensures durability
- **MVCC** for lock-free concurrent reads
- **LRU Page Cache** improves read performance
- **B-Tree Indexing** for range queries
- **SHA256 Checksums** for integrity

### 2. **Four Vector Indexing Algorithms**

| Algorithm | Complexity | Best For | Space |
|-----------|-----------|----------|-------|
| **HNSW** | O(log N) | General purpose, high recall | O(N*M) |
| **IVF-Flat** | O(M/K) | Large-scale (1B+ vectors) | O(N+K*D) |
| **Flat** | O(N) | Small datasets, perfect recall | O(N*D) |
| **PQ** | O(N) | Memory-constrained (99.7% compression) | O(N/99.7%) |

Distance metrics: **Cosine**, **Euclidean**, **Dot-Product**

### 3. **EcoSQL - Extended SQL with Vector Operations**
```sql
-- Standard SQL
SELECT * FROM users WHERE age > 25 ORDER BY name LIMIT 10;

-- Vector operations
SELECT * FROM embeddings
WHERE DISTANCE(embedding, [0.1, 0.2, ...], 'cosine') < 0.5;
```

### 4. **SuperMemory™ - Four-Tier AI Memory**
- **Long-Term**: HNSW-indexed persistent storage
- **Short-Term**: LRU cache for active context
- **Episodic**: Timeline-based event log
- **Semantic**: Vector embeddings + knowledge graph

### 5. **Production-Ready Features**
- ✅ Network protocol (PostgreSQL-style TCP)
- ✅ Type-safe TypeScript SDK
- ✅ Query optimization & execution planning
- ✅ 40+ comprehensive tests
- ✅ 15,000+ words documentation
- ✅ CLI tool (start, shell, benchmark, backup)

---

## ✨ Features

- 📦 **Lightweight** - No external dependencies
- 🔒 **Type Safe** - Full TypeScript with strict mode
- 📝 **JSON-based** - Human-readable storage format
- 🚀 **Simple API** - Easy CRUD operations
- 🔍 **Query Support** - Powerful filtering with operators
- 💾 **Persistent** - Automatic file-based persistence
- 📊 **Statistics** - Built-in database stats
- 🧪 **Fully Tested** - 28+ unit tests
- 📚 **Well Documented** - Comprehensive docs and examples

---

## 🚀 Installation

```bash
# Install from npm
npm install snaildb

# Or clone and build
git clone https://github.com/cyberkutti-iedc/snailDB.git
cd snailDB
npm install
npm run build
```

---

## 🎯 Quick Start

```typescript
import { SnailDB } from 'snaildb';

// Create database instance
const db = new SnailDB('./data.json', 'MyDatabase');

// Insert a document
const result = db.insert({
  key: 'user-1',
  name: 'John Doe',
  age: 30,
  email: 'john@example.com'
});

if (result.success) {
  console.log('Document inserted:', result.data);
}

// Retrieve document
const getResult = db.get('user-1');
if (getResult.success) {
  console.log('User:', getResult.data);
}

// Query documents
const queryResult = db.query('age', '>', 25);
if (queryResult.success) {
  console.log('Users older than 25:', queryResult.data);
}

// Update document
const updateResult = db.update('user-1', { age: 31 });

// Delete document
const deleteResult = db.delete('user-1');
```

---

## 📚 Examples

### Example 1: CRUD Operations

```typescript
const db = new SnailDB('./users.json', 'UserDB');

// Create
db.insert({ key: 'user-1', name: 'Alice', age: 25 });

// Read
const result = db.get('user-1');

// Update
db.update('user-1', { age: 26 });

// Delete
db.delete('user-1');
```

### Example 2: Bulk Insert

```typescript
const result = db.insertAll(
  { key: 'user-1', name: 'John', age: 30 },
  { key: 'user-2', name: 'Alice', age: 25 },
  { key: 'user-3', name: 'Bob', age: 35 }
);

if (result.success) {
  console.log(`Inserted ${result.data.length} documents`);
}
```

### Example 3: Advanced Queries

```typescript
// Find users older than 28, limit 5, skip first 2
const result = db.query('age', '>', 28, {
  limit: 5,
  skip: 2,
  pretty: true
});

// Supported operators: =, >, <, >=, <=, !=
db.query('status', '=', 'active');
db.query('salary', '>=', 50000);
db.query('department', '!=', 'HR');
```

### Example 4: Database Statistics

```typescript
const stats = db.getStats();
console.log(`Total records: ${stats.totalRecords}`);
console.log(`File size: ${stats.fileSize} bytes`);
console.log(`Last modified: ${stats.lastModified}`);
```

### Example 5: Import/Export

```typescript
// Export all data
const exportResult = db.export();
if (exportResult.success) {
  const json = JSON.stringify(exportResult.data);
  // Save to file, send to server, etc.
}

// Import data
const importResult = db.import(jsonData);
```

---

## 📖 API Documentation

### Core Methods

#### Insert
- `insert(document: IDocument)` - Insert single document
- `insertAll(...documents)` - Insert multiple documents

#### Retrieve
- `get(key: string)` - Get document by key
- `getAll()` - Get all documents

#### Update
- `update(key: string, value: Partial<IDocument>)` - Update document

#### Delete
- `delete(key: string)` - Delete document
- `drop()` - Delete entire database
- `clear()` - Clear all documents

#### Query
- `query(field, operator, value, options)` - Query documents

#### Utility
- `count()` - Get document count
- `isEmpty()` - Check if empty
- `getStats()` - Get database stats
- `export()` - Export as JSON
- `import(data)` - Import from JSON

For complete API documentation, see [docs/API.md](docs/API.md).

---

## 🏗️ Architecture

SnailDB v2.0 features a clean, modular architecture:

```
src/
├── types.ts          # Type definitions
├── snaildb.ts        # Core database
├── version.ts        # Version utilities
└── index.ts          # Public API
```

Key design decisions:
- **Type Safety**: Strict TypeScript with full type definitions
- **Response Objects**: Structured responses instead of exceptions
- **Separation of Concerns**: Types, implementation, and API are separate
- **Error Codes**: Semantic error codes for better debugging

For detailed architecture information, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📊 Preface & Migration

### For Python v1.x Users

Read [docs/PREFACE.md](docs/PREFACE.md) for:
- Why we moved to TypeScript
- Breaking changes and migration path
- Feature comparison
- Architectural improvements

### Archive

All Python v1.x files are preserved in `archive/python/` for reference.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test snaildb.test.ts
```

Test coverage includes:
- Database initialization
- CRUD operations
- Query functionality
- Error handling
- Import/Export
- Utility methods

---

## 🛠️ Development

### Setup

```bash
npm install
```

### Available Scripts

```bash
npm run build      # Build TypeScript to JavaScript
npm run watch      # Watch and rebuild on changes
npm run dev        # Run examples
npm run test       # Run tests
npm run lint       # Lint code
npm run format     # Format code
npm run clean      # Clean dist directory
npm run example    # Run example file
```

### Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier with 100-char line width
- **Type Checking**: Strict TypeScript mode
- **Testing**: Jest with 28+ tests

---

## 📁 Project Structure

```
snaildb/
├── src/
│   ├── types.ts              # Type definitions
│   ├── snaildb.ts            # Main database class
│   ├── version.ts            # Version info
│   └── index.ts              # Public exports
├── dist/                     # Compiled output
├── tests/
│   └── snaildb.test.ts       # Test suite
├── examples/
│   └── example_usage.ts      # Usage examples
├── docs/
│   ├── PREFACE.md            # Project overview
│   ├── API.md                # API reference
│   ├── ARCHITECTURE.md       # Architecture docs
│   └── MIGRATION.md          # Migration guide
├── archive/
│   └── python/               # Legacy Python code
├── package.json              # NPM configuration
├── tsconfig.json             # TypeScript config
├── jest.config.js            # Jest configuration
├── .eslintrc.json            # ESLint config
└── .prettierrc                # Prettier config
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Areas for contribution:
- Performance optimizations
- Additional query operators
- Documentation improvements
- Bug reports and fixes
- Feature suggestions

---

## 📝 Response Format

All database operations return consistent response objects:

### Success Response
```typescript
{
  success: true,
  data: { /* operation result */ },
  timestamp: Date
}
```

### Error Response
```typescript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE"
}
```

This pattern provides type-safe error handling without exceptions.

---

## 📦 Version History

| Version | Release | Status |
|---------|---------|--------|
| 2.0 | 2025 | Current (TypeScript) |
| 1.2 | 2022 | Archived (Python) |
| 1.1 | 2021 | Archived (Python) |
| 1.0 | 2021 | Archived (Python) |

See [docs/PREFACE.md](docs/PREFACE.md) for detailed version information.

---

## 📄 License

MIT License - See [LICENCE](LICENCE) for details

---

## 👤 Author

**Sreeraj V Rajesh**
- Email: cyberkutti@gmail.com
- GitHub: [@cyberkutti-iedc](https://github.com/cyberkutti-iedc)

---

## 🔗 Links

- [GitHub Repository](https://github.com/cyberkutti-iedc/snailDB)
- [Issues](https://github.com/cyberkutti-iedc/snailDB/issues)
- [Documentation](docs/)
- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)

---

## 🚀 Quick Links

- **Getting Started**: [Quick Start](#quick-start)
- **API Docs**: [docs/API.md](docs/API.md)
- **Examples**: [examples/](examples/)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **v1.x Users**: [docs/PREFACE.md](docs/PREFACE.md)

---

**Made with ❤️ by Sreeraj V Rajesh**

⭐ If you find SnailDB useful, please consider giving it a star on GitHub!
