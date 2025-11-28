# SNAILDB Project Structure

```
snaildb/
├── 📖 README.md                  ← START HERE - Main project README
├── 📄 LICENCE                    ← MIT License
├── 📦 package.json               ← NPM configuration with all scripts
├── 🔧 tsconfig.json              ← TypeScript configuration
├── 🔧 tsconfig.tests.json        ← TypeScript config for tests
├── 🃏 jest.config.js             ← Jest test configuration
│
├── 📁 docs/                      ← 📚 ALL DOCUMENTATION
│   ├── README.md                 ← Documentation index & navigation
│   ├── INDEX.md                  ← Full documentation index
│   ├── CONTRIBUTING.md           ← How to contribute to SNAILDB
│   ├── PROJECT_STATUS.md         ← Development status & roadmap
│   ├── RELEASE_NOTES.md          ← Version history & changelog
│   │
│   ├── 📁 guides/                ← 🚀 User guides & tutorials
│   │   ├── QUICKSTART.md         ← 5-minute setup guide
│   │   ├── INSTALLATION.md       ← Multi-platform installation
│   │   ├── FEATURES.md           ← Complete feature documentation
│   │   └── EXAMPLES.md           ← Real-world code examples
│   │
│   ├── 📁 api/                   ← 💻 API documentation
│   │   └── REFERENCE.md          ← Complete API reference
│   │
│   ├── 📁 architecture/          ← 🏗️  System design & internals
│   │   └── OVERVIEW.md           ← Architecture & components
│   │
│   └── 📁 deployment/            ← 🚢 Deployment & operations
│       ├── PRODUCTION.md         ← Docker, K8s, cloud deployment
│       ├── SECURITY.md           ← Security best practices
│       └── CHECKLIST.md          ← Production launch checklist
│
├── 📁 src/                       ← 💾 SOURCE CODE
│   ├── 📁 server/                ← Server implementation
│   │   ├── snaildb-server.ts     ← Main server (600 lines)
│   │   ├── protocol.ts           ← SNAILDB protocol (323 lines)
│   │   ├── errors.ts             ← Error handling (348 lines)
│   │   ├── logger.ts             ← Logging system
│   │   ├── commands/
│   │   │   └── executor.ts       ← Command executor (461 lines)
│   │   ├── storage/
│   │   │   └── engine.ts         ← Storage engine (495 lines)
│   │   ├── vector/
│   │   │   └── index.ts          ← Vector search (HNSW)
│   │   └── replication.ts        ← Replication manager
│   │
│   ├── 📁 client/                ← Client SDK
│   │   └── snaildb-client.ts     ← TypeScript client (326 lines)
│   │
│   └── index.ts                  ← Main exports
│
├── 📁 cmd/                       ← ⚙️  CLI & entry points
│   └── server/
│       └── index.ts              ← Server startup script
│
├── 📁 tests/                     ← ✅ TEST SUITE
│   └── snaildb.test.ts           ← 14 comprehensive Jest tests
│
├── 📁 dist/                      ← 📦 Compiled output (generated)
│   └── (compiled JavaScript & type definitions)
│
├── 📁 data/                      ← 💾 Data storage (generated)
│   ├── snaildb.rdb              ← RDB checkpoints
│   ├── snaildb.wal              ← Write-ahead logs
│   └── ...                       ← Other data files
│
├── 📁 .github/                   ← GitHub configuration
│   └── workflows/
│       └── (CI/CD workflows)
│
├── 🐳 Dockerfile                 ← Docker container config
├── 🐳 docker-compose.yml         ← Full stack docker compose
│
├── 🔧 .eslintrc.json             ← ESLint configuration
├── 🔧 .prettierrc                ← Prettier code formatter config
├── 🔧 .gitignore                 ← Git ignore rules
│
└── 📁 node_modules/              ← NPM dependencies (generated)
```

## 📊 Project Statistics

| Category | Details |
|----------|---------|
| **Language** | 100% TypeScript |
| **Total Lines of Code** | ~3,500 lines |
| **Core Modules** | 8 modules |
| **Tests** | 14 Jest tests (100% passing) |
| **Documentation** | 12 comprehensive guides |
| **Node.js Version** | 18.0.0+ |
| **TypeScript Version** | 5.3.3+ |

## 📂 Directory Organization

### Source Code Structure
```
src/
├── server/          ← Core server implementation
├── client/          ← TypeScript client SDK
└── index.ts         ← Public API exports
```

### Documentation Structure
```
docs/
├── guides/          ← User tutorials & setup
├── api/             ← API reference
├── architecture/    ← System design
└── deployment/      ← Operations & deployment
```

### Testing Structure
```
tests/
└── snaildb.test.ts  ← Jest test suite (14 tests)
```

## 🚀 Getting Started Paths

### For New Users
```
README.md
  ↓
docs/guides/QUICKSTART.md
  ↓
docs/guides/EXAMPLES.md
```

### For Developers
```
README.md
  ↓
docs/guides/INSTALLATION.md
  ↓
docs/api/REFERENCE.md
  ↓
src/ (browse code)
```

### For DevOps
```
README.md
  ↓
docs/deployment/PRODUCTION.md
  ↓
docs/deployment/SECURITY.md
  ↓
docs/deployment/CHECKLIST.md
```

## 📦 Key Files

| File | Purpose | Size |
|------|---------|------|
| README.md | Main project documentation | ~14 KB |
| docs/ | Complete documentation set | ~150 KB |
| src/server/snaildb-server.ts | Main server | ~25 KB |
| src/client/snaildb-client.ts | Client SDK | ~20 KB |
| package.json | Dependencies & scripts | ~4 KB |
| Dockerfile | Container config | ~2 KB |

## 🔧 Build Artifacts

After running `npm run build`:
- Compiled JavaScript in `dist/`
- TypeScript declarations in `dist/**/*.d.ts`
- Source maps in `dist/**/*.js.map`
- Type declaration maps in `dist/**/*.d.ts.map`

## 💾 Runtime Data

- **RDB Checkpoint**: `data/snaildb.rdb` (gzip-compressed)
- **Write-Ahead Log**: `data/snaildb.wal` (JSON lines)
- **Metadata**: `data/metadata.json` (configuration)

---

**Last Updated**: November 28, 2025
**Version**: 2.0.0
