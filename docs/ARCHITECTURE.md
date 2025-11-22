# Architecture Documentation

## Overview

This document describes the architectural design and implementation details of SnailDB v2.0 (TypeScript).

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│      Application Layer              │
│   (User's TypeScript Code)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        SnailDB Public API           │
│  (index.ts - Exported Interfaces)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Core Database Class            │
│        (snaildb.ts)                 │
│  - CRUD Operations                  │
│  - Query Engine                     │
│  - Data Persistence                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Type System                    │
│        (types.ts)                   │
│  - Type Definitions                 │
│  - Response Interfaces              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      File System Layer              │
│  (Node.js fs module)                │
│  - JSON File I/O                    │
│  - Directory Management             │
└─────────────────────────────────────┘
```

---

## Module Structure

### `src/types.ts`

**Purpose**: Define all TypeScript interfaces and types

**Key Interfaces**:
- `IDocument`: Base document interface with required `key` field
- `IOperationResponse<T>`: Generic response wrapper
- `ISuccessResponse<T>`: Typed success response
- `IErrorResponse`: Error response with code
- `IQueryResult`: Query result structure
- `IQueryOptions`: Query options
- `IDatabaseStats`: Database statistics

**Design Decision**: Separating types allows for:
- Clean type imports in other modules
- Easy type reuse
- Clear contract definition

---

### `src/snaildb.ts`

**Purpose**: Core database implementation

**Key Responsibilities**:
- Load/save JSON data
- CRUD operations (Create, Read, Update, Delete)
- Query execution
- Error handling
- Data validation

**Data Structure**:
```typescript
private data: Map<string, IDocument>;
```

Uses JavaScript Map for O(1) key lookup instead of Object for better semantics.

**Key Methods**:
```
┌─ Insert
│  ├─ insert(single)
│  └─ insertAll(multiple)
├─ Read
│  ├─ get(key)
│  └─ getAll()
├─ Update
│  └─ update(key, value)
├─ Delete
│  ├─ delete(key)
│  ├─ drop()
│  └─ clear()
├─ Query
│  └─ query(field, operator, value, options)
├─ Utility
│  ├─ count()
│  ├─ isEmpty()
│  ├─ getStats()
│  ├─ export()
│  └─ import()
```

---

### `src/version.ts`

**Purpose**: Version management and utilities

**Exports**:
- `VERSION`: Semantic version string
- `VERSION_NAME`: Release name
- `AUTHOR`: Author information
- `LICENSE`: License type
- `getVersion()`: Get version string
- `getVersionInfo()`: Print detailed version info
- `printVersion()`: Print simple version

---

### `src/index.ts`

**Purpose**: Public API surface

**Exports**:
- Main `SnailDB` class
- All type definitions
- Version utilities

This acts as the single entry point for users.

---

## Data Flow

### Insert Operation Flow

```
insert(document)
    ↓
Validate: Has 'key' field?
    ├─ NO → Return error (MISSING_KEY)
    ↓ YES
Check: Key exists?
    ├─ YES → Return error (DUPLICATE_KEY)
    ↓ NO
Add to Map
    ↓
Save to File
    ↓
Return success response
```

---

### Query Operation Flow

```
query(field, operator, value, options)
    ↓
Iterate through all documents
    ├─ Skip if field not present
    ├─ Check condition: field [operator] value
    ├─ Add to results if match
    ↓
Apply skip: results.slice(skip)
    ↓
Apply limit: results.slice(0, limit)
    ↓
Return IQueryResult[]
```

---

### Update Operation Flow

```
update(key, value)
    ↓
Check: Key exists?
    ├─ NO → Return error (NOT_FOUND)
    ↓ YES
Merge: existing ∪ new (preserving key)
    ↓
Save to File
    ↓
Return updated document
```

---

## Error Handling Strategy

### Response-Based Error Handling

Instead of throwing exceptions, SnailDB returns typed response objects:

```typescript
type IOperationResponse<T> = ISuccessResponse<T> | IErrorResponse;
```

**Advantages**:
- Type-safe error handling
- No try-catch needed by consumers
- Clear error codes for debugging
- Timestamp for logging

**Example**:
```typescript
const result = db.insert({ name: 'Invalid' });

if (result.success) {
  // result.data is available and typed
  console.log(result.data.key);
} else {
  // result is IErrorResponse
  console.error(result.code); // MISSING_KEY
  console.error(result.error);
}
```

---

## Data Persistence

### File Storage Format

**Location**: User-specified JSON file path

**Format**: Standard JSON with 2-space indentation

```json
{
  "user-1": {
    "key": "user-1",
    "name": "John Doe",
    "age": 30
  },
  "user-2": {
    "key": "user-2",
    "name": "Alice Smith",
    "age": 25
  }
}
```

### Load Strategy

1. Check if file exists
2. If exists: Parse JSON and convert to Map
3. If not exists: Return empty Map
4. Errors are logged, operation continues with empty Map

### Save Strategy

1. Convert Map to Object
2. Ensure directory exists (mkdir -p)
3. Write JSON with indentation
4. Throw error if write fails

---

## Type System

### Response Pattern

All operations follow this response pattern:

```typescript
interface ISuccessResponse<T> {
  success: true;
  data: T;
  timestamp: Date;
}

interface IErrorResponse {
  success: false;
  error: string;
  code: string;
}
```

**Benefits**:
- Compile-time type safety
- Runtime validation possible
- Consistent error handling
- Extensible for future features

---

## Query Engine

### Supported Operators

| Operator | Type | Example |
|----------|------|---------|
| `=` | Equality | `age = 30` |
| `>` | Greater | `age > 25` |
| `<` | Less | `age < 35` |
| `>=` | Greater or equal | `age >= 25` |
| `<=` | Less or equal | `age <= 35` |
| `!=` | Not equal | `age != 30` |

### Query Execution

1. **Iterate**: Loop through all documents
2. **Check**: For field existence
3. **Compare**: Apply operator condition
4. **Collect**: Add matching documents to results
5. **Options**: Apply skip and limit
6. **Return**: Wrapped in response object

### Complexity

- **Time**: O(n) where n = number of documents
- **Space**: O(k) where k = result count
- **Limitation**: No indexes (acceptable for small databases)

---

## Performance Considerations

### Memory Usage

- **Map Storage**: O(n) where n = document count
- **Query Results**: O(k) where k = matches
- **File I/O**: Loaded entirely into memory

**Note**: SnailDB is designed for small to medium datasets. Large datasets (>100MB) may require alternative solutions.

---

### I/O Operations

- **Read**: Synchronous file read on initialization
- **Write**: Synchronous file write after each mutation
- **Pattern**: Immediate consistency

**Trade-off**: Write operations are blocking but ensure durability.

---

## Testing Strategy

### Test Coverage

```
tests/
├── Database Initialization (2 tests)
├── Insert Operations (4 tests)
├── Retrieve Operations (4 tests)
├── Update Operations (3 tests)
├── Delete Operations (3 tests)
├── Query Operations (7 tests)
├── Database Statistics (1 test)
├── Import/Export (2 tests)
└── Count and Empty Check (2 tests)
```

Total: 28 unit tests covering all major functionality

### Test Isolation

Each test:
- Creates fresh database instance
- Uses isolated test file path
- Cleans up after execution
- Tests specific functionality

---

## Build Process

### TypeScript Compilation

```
source (src/*.ts)
    ↓
TypeScript Compiler (tsc)
    ↓
Configuration (tsconfig.json)
    ├─ target: ES2020
    ├─ module: commonjs
    └─ strict: true
    ↓
output (dist/*.js + *.d.ts)
```

### Output Structure

```
dist/
├── snaildb.js (compiled)
├── snaildb.d.ts (type definitions)
├── types.js
├── types.d.ts
├── version.js
├── version.d.ts
├── index.js
└── index.d.ts
```

---

## Security Considerations

### Current Implementation

- No built-in authentication
- No encryption
- No access control
- Direct file system access

### Recommendations

For production use:
- Use file system permissions
- Store sensitive data separately
- Validate input data
- Consider encryption for future versions

---

## Future Enhancements

### v2.1 Planned Features

1. **CLI Tool**
   - Command-line interface
   - Database management
   - Query execution

2. **Advanced Queries**
   - Pattern matching
   - Text search
   - Range queries

3. **Data Validation**
   - Schema definition
   - Type validation
   - Custom validators

### v3.0 Planned Features

1. **Async API**
   - Promise-based operations
   - Async file I/O
   - Better concurrent access

2. **Encryption**
   - Optional data encryption
   - Secure key management

3. **Browser Support**
   - IndexedDB backend
   - LocalStorage support
   - Service Worker integration

---

## Design Patterns Used

### Factory Pattern
- `SnailDB` constructor creates configured instances

### Singleton Pattern (Optional)
- Users can implement singleton for shared database instance

### Repository Pattern
- `SnailDB` acts as repository for document access

### Response Wrapper Pattern
- All operations return `IOperationResponse<T>`

---

## Comparison: Python vs TypeScript

| Aspect | Python v1.x | TypeScript v2.0 |
|--------|------------|-----------------|
| Type Safety | Dynamic | Static (strict) |
| Error Handling | Exceptions | Response objects |
| Error Messages | Print-based | Structured codes |
| API Response | Direct | Wrapped objects |
| Test Framework | unittest | Jest |
| Linting | pylint | ESLint |
| Documentation | Basic | Comprehensive |
| Type Definitions | None | Full .d.ts files |

---

**Last Updated**: November 2025  
**Version**: 2.0.0
