# Migration Guide: Python v1.x to TypeScript v2.0

## Overview

This guide helps you migrate from SnailDB v1.x (Python) to v2.0 (TypeScript).

## Table of Contents

- [Before You Start](#before-you-start)
- [Installation](#installation)
- [API Mapping](#api-mapping)
- [Code Migration](#code-migration)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Before You Start

### Requirements

- **Node.js** 16 or higher
- **npm** 7 or higher
- **TypeScript** knowledge (or willingness to learn)

### Key Changes

| Aspect | v1.x (Python) | v2.0 (TypeScript) |
|--------|---------------|-------------------|
| Runtime | Python 3.6+ | Node.js 16+ |
| Package Manager | pip | npm |
| Type Safety | None | Strict |
| Error Handling | Exceptions | Response objects |
| Import | `from snaildb import SnailDB` | `import { SnailDB }` |

---

## Installation

### Python v1.x

```bash
pip install snailDB
```

### TypeScript v2.0

```bash
npm install snaildb
```

Or from source:

```bash
git clone https://github.com/cyberkutti-iedc/snailDB.git
cd snailDB
npm install
npm run build
```

---

## API Mapping

### Initialization

#### Python v1.x
```python
from snaildb import SnailDB
db = SnailDB("database.json", "MyDB")
```

#### TypeScript v2.0
```typescript
import { SnailDB } from 'snaildb';
const db = new SnailDB('./database.json', 'MyDB');
```

### Getting DB Name

#### Python v1.x
```python
name = db.get_db_name()
```

#### TypeScript v2.0
```typescript
const name = db.getDbName();
```

### Insert Operations

#### Python v1.x
```python
db.insert({"key": "1", "name": "John", "age": 30})
db.insert_all(
    {"key": "2", "name": "Alice"},
    {"key": "3", "name": "Bob"}
)
```

#### TypeScript v2.0
```typescript
db.insert({ key: "1", name: "John", age: 30 });
db.insertAll(
    { key: "2", name: "Alice" },
    { key: "3", name: "Bob" }
);
```

**Key Difference**: Methods now return structured response objects.

```typescript
const result = db.insert({ key: "1", name: "John" });
if (result.success) {
    console.log(result.data);
} else {
    console.error(result.error);
}
```

### Get Operations

#### Python v1.x
```python
data = db.get("1")
all_data = db.get_all()

# Pretty printing
db.get("1", pretty=True)
db.get_all(pretty=True)
```

#### TypeScript v2.0
```typescript
const result = db.get("1");
const allResult = db.getAll();

if (result.success) {
    console.log(result.data);
}

// Pretty printing
db.get("1", true);
db.getAll(true);
```

### Update Operations

#### Python v1.x
```python
db.update("1", {"name": "John Updated", "age": 31})
```

#### TypeScript v2.0
```typescript
db.update("1", { name: "John Updated", age: 31 });
```

### Delete Operations

#### Python v1.x
```python
db.delete("1")
db.drop()
```

#### TypeScript v2.0
```typescript
db.delete("1");
db.drop();

// NEW: Clear all without deleting file
db.clear();
```

### Query Operations

#### Python v1.x
```python
# Basic query
results = db.query("age", ">", 25)

# With options (note: "limt" typo in original)
results = db.query("age", "<", 30, skip=1, limt=2, pretty=True)
```

#### TypeScript v2.0
```typescript
// Basic query
const result = db.query("age", ">", 25);
if (result.success) {
    console.log(result.data);
}

// With options (fixed spelling: "limit")
const result = db.query("age", "<", 30, {
    skip: 1,
    limit: 2,
    pretty: true
});
```

### Version Info

#### Python v1.x
```python
from snaildb import version
version()  # Prints version info
```

#### TypeScript v2.0
```typescript
import { getVersionInfo, printVersion } from 'snaildb';
getVersionInfo();  // Prints detailed version
printVersion();    // Prints simple version
```

---

## Code Migration

### Simple Example

#### Python v1.x
```python
from snaildb import SnailDB

db = SnailDB("users.json", "UserDB")

# Insert
db.insert({"key": "user1", "name": "John", "age": 30})

# Query
results = db.query("age", ">", 25)
print(results)

# Update
db.update("user1", {"age": 31})

# Delete
db.delete("user1")
```

#### TypeScript v2.0
```typescript
import { SnailDB } from 'snaildb';

const db = new SnailDB('./users.json', 'UserDB');

// Insert
const insertResult = db.insert({ 
    key: "user1", 
    name: "John", 
    age: 30 
});
if (insertResult.success) {
    console.log('Inserted:', insertResult.data);
}

// Query
const queryResult = db.query("age", ">", 25);
if (queryResult.success) {
    console.log('Results:', queryResult.data);
}

// Update
const updateResult = db.update("user1", { age: 31 });

// Delete
const deleteResult = db.delete("user1");
```

### Error Handling

#### Python v1.x
```python
try:
    db.insert({"name": "Missing key"})
except Exception as e:
    print(f"Error: {e}")
```

#### TypeScript v2.0
```typescript
const result = db.insert({ name: "Missing key" });
if (!result.success) {
    console.error(`Error: ${result.error}`);
    console.error(`Code: ${result.code}`);
}
```

---

## Common Patterns

### Bulk Operations

#### Python v1.x
```python
for user in users:
    db.insert(user)
```

#### TypeScript v2.0
```typescript
// Efficient: Use insertAll
db.insertAll(...users);

// Or loop if needed
for (const user of users) {
    db.insert(user);
}
```

### Data Export

#### Python v1.x
```python
# No built-in export, manual file read
import json
with open('users.json', 'r') as f:
    data = json.load(f)
```

#### TypeScript v2.0
```typescript
// Built-in export
const result = db.export();
if (result.success) {
    const data = result.data;
    const json = JSON.stringify(data);
}
```

### Data Import

#### Python v1.x
```python
# No built-in import
# Manual approach needed
```

#### TypeScript v2.0
```typescript
// Built-in import
const newData = JSON.parse(jsonString);
const result = db.import(newData);
```

### Database Statistics

#### Python v1.x
```python
# No built-in stats
# Manual file check needed
```

#### TypeScript v2.0
```typescript
// Built-in statistics
const stats = db.getStats();
console.log(`Records: ${stats.totalRecords}`);
console.log(`Size: ${stats.fileSize} bytes`);
console.log(`Modified: ${stats.lastModified}`);
```

---

## Important Changes

### 1. Response Format

All operations return typed response objects in v2.0:

```typescript
interface IOperationResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    timestamp: Date;
}
```

Always check `result.success` before accessing `result.data`.

### 2. Error Codes

Instead of exceptions, v2.0 uses error codes:

```typescript
const result = db.insert({ name: "No key" });
if (!result.success) {
    switch (result.code) {
        case 'MISSING_KEY':
            console.log('Add a key field');
            break;
        case 'DUPLICATE_KEY':
            console.log('Key already exists');
            break;
        case 'INSERT_ERROR':
            console.log('Generic error');
            break;
    }
}
```

### 3. Snake Case to Camel Case

Python v1.x used snake_case:
```python
db.get_db_name()
db.insert_all()
db.get_all()
```

TypeScript v2.0 uses camelCase:
```typescript
db.getDbName()
db.insertAll()
db.getAll()
```

### 4. Parameter Names

The `limt` typo in v1.x query has been fixed to `limit`:

```typescript
// v1.x
db.query("age", "<", 30, limt=2)

// v2.0
db.query("age", "<", 30, { limit: 2 })
```

### 5. Pretty Printing

Changed from boolean parameter to part of options:

```typescript
// v1.x
db.get("key", pretty=True)

// v2.0
db.get("key", true)  // For single param
db.query("age", ">", 25, { pretty: true })  // For options
```

---

## TypeScript/JavaScript Considerations

### TypeScript Usage

If using TypeScript, leverage type definitions:

```typescript
import { SnailDB, IDocument, IOperationResponse } from 'snaildb';

interface User extends IDocument {
    name: string;
    age: number;
}

const db = new SnailDB('./users.json', 'UserDB');
const result: IOperationResponse<User> = db.get('user-1');
```

### JavaScript Usage

Can use in plain JavaScript (ES6+):

```javascript
const { SnailDB } = require('snaildb');
const db = new SnailDB('./data.json', 'MyDB');
```

---

## Testing

### Python v1.x Testing

```python
# unittest based
import unittest
class TestSnailDB(unittest.TestCase):
    pass
```

### TypeScript v2.0 Testing

```typescript
// Jest based
describe('SnailDB', () => {
    it('should insert document', () => {
        expect(db.insert({ key: '1' }).success).toBe(true);
    });
});
```

Run tests with: `npm test`

---

## Performance Notes

### v1.x Performance Characteristics
- Synchronous I/O
- In-memory storage
- Linear query time O(n)

### v2.0 Performance Characteristics
- Synchronous I/O (same as v1)
- In-memory storage (same as v1)
- Linear query time O(n) (same as v1)
- Better data structure (Map instead of dict)

---

## Troubleshooting

### "Module not found" Error

```
Error: Cannot find module 'snaildb'
```

**Solution**: Make sure to install dependencies:
```bash
npm install snaildb
```

### TypeScript Compilation Errors

```
TS2339: Property 'insert' does not exist
```

**Solution**: Import types correctly:
```typescript
import { SnailDB, IDocument } from 'snaildb';
```

### Response Check Issues

```
Cannot read property 'data' of undefined
```

**Solution**: Always check success flag:
```typescript
const result = db.get('key');
if (result.success) {
    console.log(result.data);
}
```

### File Path Issues

```
Error: ENOENT: no such file or directory
```

**Solution**: Use absolute paths or create directories:
```typescript
import * as path from 'path';
const dbPath = path.join(__dirname, './data', 'db.json');
const db = new SnailDB(dbPath, 'MyDB');
```

---

## Feature Parity

### Features in Both Versions
- ✅ Insert/Update/Delete
- ✅ Get/GetAll
- ✅ Query with operators
- ✅ Drop database
- ✅ Pretty printing

### New in v2.0
- ✅ Structured responses
- ✅ Error codes
- ✅ Statistics (getStats)
- ✅ Count (count)
- ✅ Empty check (isEmpty)
- ✅ Clear (clear)
- ✅ Export (export)
- ✅ Import (import)
- ✅ Full TypeScript support

### Removed from v1.x
- ❌ Python-specific imports
- ❌ Print-based error handling (replaced with response objects)

---

## Need Help?

- [API Documentation](docs/API.md)
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Examples](examples/)
- [GitHub Issues](https://github.com/cyberkutti-iedc/snailDB/issues)

---

**Last Updated**: November 2025  
**Version**: 2.0.0  
**Migration Guide Version**: 1.0
