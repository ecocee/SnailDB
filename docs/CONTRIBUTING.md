# Contributing to SNAILDB v2.0

Thank you for your interest in contributing to SNAILDB! This document provides guidelines and instructions for contributing to the project.

## 🤝 Ways to Contribute

### 1. Code Contributions
- Bug fixes
- Performance improvements
- New features
- Documentation updates
- Tests

### 2. Non-Code Contributions
- Bug reports (GitHub Issues)
- Feature requests (GitHub Discussions)
- Documentation improvements
- Example code and tutorials
- Social media sharing

### 3. Community
- Helping users on GitHub Discussions
- Writing blog posts about SNAILDB
- Speaking at conferences/meetups
- Maintaining satellite projects/SDKs

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Basic understanding of TypeScript and async/await

### Development Setup

```bash
# 1. Fork the repository on GitHub
# (https://github.com/sreeraj/snaildb)

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/snaildb.git
cd snaildb

# 3. Add upstream remote
git remote add upstream https://github.com/sreeraj/snaildb.git

# 4. Install dependencies
npm install

# 5. Build
npm run build

# 6. Run tests
npm test

# 7. Start development server
npm run dev

# 8. Verify everything works
node -e "
const { SnailDBClient } = require('./dist/client/snaildb-client.js');
const client = new SnailDBClient();
(async () => {
  await client.connect();
  await client.set('test', 'hello');
  console.log(await client.get('test'));
  process.exit(0);
})();
"
```

---

## 📋 Development Workflow

### 1. Create a Feature Branch

```bash
# Update main branch
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bug
# or  
git checkout -b docs/readme-update
```

### 2. Make Changes

Follow the code style guidelines (see below).

```bash
# Make your changes
# Edit files in src/

# Run linting
npm run lint

# Run tests
npm test

# Build
npm run build
```

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with clear message
git commit -m "feat: add vector search with threshold parameter"

# Commit message format:
# <type>: <subject>
# 
# <body>
# 
# <footer>

# Type: feat, fix, docs, style, refactor, perf, test, chore
# Subject: 50 characters, lowercase, no period
# Body: explain what and why, not how (wrap at 72 chars)
# Footer: reference issues, breaking changes
```

### 4. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/my-feature

# Create pull request on GitHub
```

### PR Checklist

In your PR description, confirm:
```
- [ ] I've tested this locally
- [ ] Tests pass (npm test)
- [ ] Build succeeds (npm run build)
- [ ] Code follows project style
- [ ] Documentation is updated
- [ ] No breaking changes
```

---

## 💻 Code Style Guidelines

### TypeScript Standards

```typescript
// ✅ DO
// Use strict mode
// Use async/await instead of .then()
// Prefer const, then let (never var)
// Use explicit types
// Single responsibility per function

class VectorStore {
  private vectors: Map<string, Vector>;
  
  async set(key: string, vector: Vector): Promise<void> {
    if (!this.isValidVector(vector)) {
      throw new Error('Invalid vector');
    }
    this.vectors.set(key, vector);
  }
  
  private isValidVector(v: Vector): boolean {
    return v.length > 0 && v.every(x => typeof x === 'number');
  }
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class SnailDBClient {}

// Functions: camelCase
function calculateSimilarity() {}

// Constants: UPPER_SNAKE_CASE
const MAX_VECTOR_DIMENSION = 4096;

// Private members: private keyword
class Store {
  private vectors: Map<string, Vector>;
  public values: Map<string, any>;
}

// Booleans: is/has/can prefix
const isConnected = true;
const hasVector = false;
```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/snaildb.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage Requirements

- Minimum 80% code coverage
- All new features must have tests
- All bug fixes must include regression test

---

## 📚 Documentation

### Documentation Standards

- Write in clear, simple English
- Include code examples
- Update related documentation
- Add your changes to CHANGELOG.md

### CHANGELOG Format

```markdown
## [Unreleased]

### Added
- New vector search with similarity threshold (#123)

### Fixed
- Connection timeout on slow networks (#120)

### Changed
- Improved error messages

### Security
- Fixed authentication bypass
```

---

## 🔍 Code Review Process

### What We Look For

1. **Correctness** - Does it work? Edge cases handled?
2. **Style & Quality** - Follows conventions? Clear names?
3. **Performance** - Any regressions? Efficient?
4. **Testing** - Adequate coverage? Tests pass?
5. **Documentation** - Clear and complete?

---

## 🐛 Bug Reports

### Before Creating an Issue

- [ ] Search existing issues
- [ ] Check documentation
- [ ] Try latest version
- [ ] Test in isolation

### Bug Report Template

```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- SNAILDB version: 2.0.0
- Node.js version: 18.0.0
- OS: Linux/macOS/Windows
```

---

## 💡 Feature Requests

### Feature Request Template

```markdown
## Problem
Describe the problem this solves

## Proposed Solution
Your proposed solution

## Use Cases
1. Use case 1
2. Use case 2

## Example Usage
```typescript
// How users would use this
const result = await client.newFeature();
```
```

---

## 📖 Learning Resources

### Understanding SNAILDB

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review [src/server/storage/engine.ts](./src/server/storage/engine.ts)
3. Study [src/server/executor.ts](./src/server/executor.ts)
4. Check examples in [EXAMPLES.md](./EXAMPLES.md)

### TypeScript Learning

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)

### Node.js Best Practices

- [Node.js Official Guide](https://nodejs.org/en/docs/guides/)

---

## ❓ Getting Help

- **Questions**: GitHub Discussions
- **Bugs**: GitHub Issues
- **Security**: security@snaildb.io
- **Code Review**: GitHub PRs

---

## 🙏 Thank You!

Your contributions help make SNAILDB better for everyone!

**Happy Contributing! 🚀**

*Last updated: 2025-11-28*
