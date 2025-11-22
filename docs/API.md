# SnailDB API Reference

## Table of Contents
- [SnailDB Class](#snaildb-class)
- [Methods](#methods)
- [Types and Interfaces](#types-and-interfaces)
- [Response Format](#response-format)
- [Error Codes](#error-codes)
- [Examples](#examples)

---

## SnailDB Class

The main class for interacting with SnailDB database.

```typescript
import { SnailDB } from 'snaildb';

const db = new SnailDB(filePath: string, dbName: string);
```

### Constructor Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | Path to the JSON database file |
| `dbName` | string | Name of the database |

---

## Methods

### Retrieval Methods

#### `get(key: string, pretty?: boolean): IOperationResponse<IDocument>`

Retrieve a single document by key.

```typescript
const result = db.get('user-1');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

**Parameters:**
- `key`: Document key
- `pretty`: (Optional) Pretty-print to console

**Returns:** `IOperationResponse<IDocument>`

---

#### `getAll(pretty?: boolean): IOperationResponse<IDocument[]>`

Retrieve all documents from the database.

```typescript
const result = db.getAll();
if (result.success) {
  console.log(`Found ${result.data.length} documents`);
}
```

**Returns:** `IOperationResponse<IDocument[]>`

---

### Insert Methods

#### `insert(document: IDocument): IOperationResponse<IDocument>`

Insert a single document.

```typescript
const result = db.insert({
  key: 'user-1',
  name: 'John Doe',
  age: 30
});
```

**Parameters:**
- `document`: Document with required `key` field

**Returns:** `IOperationResponse<IDocument>`

**Throws:**
- `MISSING_KEY`: Document doesn't have a key field
- `DUPLICATE_KEY`: Key already exists

---

#### `insertAll(...documents: IDocument[]): IOperationResponse<IDocument[]>`

Insert multiple documents at once.

```typescript
const result = db.insertAll(
  { key: 'user-1', name: 'John' },
  { key: 'user-2', name: 'Alice' },
  { key: 'user-3', name: 'Bob' }
);
```

**Returns:** `IOperationResponse<IDocument[]>`

---

### Update Methods

#### `update(key: string, value: Partial<IDocument>): IOperationResponse<IDocument>`

Update a document by key.

```typescript
const result = db.update('user-1', {
  age: 31,
  email: 'john@example.com'
});
```

**Parameters:**
- `key`: Document key
- `value`: Partial document with fields to update

**Returns:** `IOperationResponse<IDocument>`

**Note:** The key field cannot be changed. All other fields are merged with existing document.

---

### Delete Methods

#### `delete(key: string): IOperationResponse<null>`

Delete a document by key.

```typescript
const result = db.delete('user-1');
if (result.success) {
  console.log('Document deleted');
}
```

**Returns:** `IOperationResponse<null>`

---

#### `drop(): IOperationResponse<null>`

Delete entire database file.

```typescript
const result = db.drop();
if (result.success) {
  console.log('Database dropped');
}
```

**Returns:** `IOperationResponse<null>`

**Warning:** This operation cannot be undone.

---

#### `clear(): IOperationResponse<null>`

Clear all documents from database without deleting the file.

```typescript
const result = db.clear();
```

**Returns:** `IOperationResponse<null>`

---

### Query Methods

#### `query(fieldName: string, operator: QueryOperator, targetValue: unknown, options?: IQueryOptions): IOperationResponse<IQueryResult[]>`

Query documents with conditions.

```typescript
// Find all users older than 25
const result = db.query('age', '>', 25, {
  limit: 10,
  skip: 0,
  pretty: false
});
```

**Parameters:**
- `fieldName`: Field to query
- `operator`: Query operator
- `targetValue`: Value to compare
- `options`: Query options (optional)

**Supported Operators:**
- `=` - Equals
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `!=` - Not equal

**Query Options:**
```typescript
{
  limit?: number;    // Max results to return
  skip?: number;     // Skip first N results
  pretty?: boolean;  // Pretty-print output
}
```

**Returns:** `IOperationResponse<IQueryResult[]>`

---

### Import/Export Methods

#### `export(): IOperationResponse<Record<string, IDocument>>`

Export all database data as an object.

```typescript
const result = db.export();
if (result.success) {
  const data = result.data;
  // Use data as needed
}
```

**Returns:** `IOperationResponse<Record<string, IDocument>>`

---

#### `import(data: Record<string, IDocument>): IOperationResponse<null>`

Import data into database (replaces existing data).

```typescript
const data = {
  'user-1': { key: 'user-1', name: 'John' },
  'user-2': { key: 'user-2', name: 'Alice' }
};
const result = db.import(data);
```

**Parameters:**
- `data`: Data to import

**Returns:** `IOperationResponse<null>`

---

### Utility Methods

#### `getDbName(): string`

Get database name.

```typescript
const name = db.getDbName();
console.log(`Using database: ${name}`);
```

---

#### `getDbPath(): string`

Get database file path.

```typescript
const path = db.getDbPath();
```

---

#### `getStats(): IDatabaseStats`

Get database statistics.

```typescript
const stats = db.getStats();
console.log(`Total records: ${stats.totalRecords}`);
console.log(`File size: ${stats.fileSize} bytes`);
```

**Returns:**
```typescript
{
  totalRecords: number;
  filePath: string;
  lastModified: Date;
  fileSize: number;
}
```

---

#### `count(): number`

Get total number of documents.

```typescript
const total = db.count();
```

---

#### `isEmpty(): boolean`

Check if database is empty.

```typescript
if (db.isEmpty()) {
  console.log('Database is empty');
}
```

---

## Types and Interfaces

### IDocument

```typescript
interface IDocument {
  key: string;
  [key: string]: unknown;
}
```

Every document must have a unique `key` field. Additional fields can be any type.

---

### IOperationResponse

Base type for all database operation responses.

```typescript
type IOperationResponse<T> = ISuccessResponse<T> | IErrorResponse;
```

---

### ISuccessResponse

```typescript
interface ISuccessResponse<T> {
  success: true;
  data: T;
  timestamp: Date;
}
```

---

### IErrorResponse

```typescript
interface IErrorResponse {
  success: false;
  error: string;
  code: string;
}
```

---

### IQueryResult

```typescript
interface IQueryResult {
  key: string;
  document: IDocument;
}
```

---

### IQueryOptions

```typescript
interface IQueryOptions {
  limit?: number;
  skip?: number;
  pretty?: boolean;
}
```

---

### IDatabaseStats

```typescript
interface IDatabaseStats {
  totalRecords: number;
  filePath: string;
  lastModified: Date;
  fileSize: number;
}
```

---

## Response Format

All database operations return a structured response object.

### Success Response

```typescript
{
  success: true,
  data: { /* operation result */ },
  timestamp: 2025-11-22T10:30:00.000Z
}
```

### Error Response

```typescript
{
  success: false,
  error: "Descriptive error message",
  code: "ERROR_CODE"
}
```

---

## Error Codes

| Code | Meaning | HTTP Equivalent |
|------|---------|-----------------|
| `MISSING_KEY` | Document doesn't have key field | 400 Bad Request |
| `DUPLICATE_KEY` | Key already exists in database | 409 Conflict |
| `NOT_FOUND` | Document/Database not found | 404 Not Found |
| `INSERT_ERROR` | Error during insert | 500 Internal Server Error |
| `INSERT_ALL_ERROR` | Error during bulk insert | 500 Internal Server Error |
| `GET_ERROR` | Error during get operation | 500 Internal Server Error |
| `GET_ALL_ERROR` | Error during getAll operation | 500 Internal Server Error |
| `UPDATE_ERROR` | Error during update | 500 Internal Server Error |
| `DELETE_ERROR` | Error during delete | 500 Internal Server Error |
| `QUERY_ERROR` | Error during query | 500 Internal Server Error |
| `DROP_ERROR` | Error during drop | 500 Internal Server Error |
| `CLEAR_ERROR` | Error during clear | 500 Internal Server Error |
| `EXPORT_ERROR` | Error during export | 500 Internal Server Error |
| `IMPORT_ERROR` | Error during import | 500 Internal Server Error |

---

## Examples

### Complete CRUD Example

```typescript
import { SnailDB } from 'snaildb';

// Initialize database
const db = new SnailDB('./data.json', 'MyDB');

// Create
const insertResult = db.insert({
  key: 'user-1',
  name: 'John Doe',
  email: 'john@example.com'
});

if (insertResult.success) {
  console.log('Created:', insertResult.data);
}

// Read
const getResult = db.get('user-1');
if (getResult.success) {
  console.log('Retrieved:', getResult.data);
}

// Update
const updateResult = db.update('user-1', {
  email: 'john.new@example.com'
});

if (updateResult.success) {
  console.log('Updated:', updateResult.data);
}

// Delete
const deleteResult = db.delete('user-1');
if (deleteResult.success) {
  console.log('Deleted successfully');
}
```

### Query Example

```typescript
// Find all users older than 25
const result = db.query('age', '>', 25, {
  limit: 10,
  skip: 0
});

if (result.success) {
  result.data.forEach(({ key, document }) => {
    console.log(`${key}: ${document.name} (${document.age})`);
  });
}
```

### Import/Export Example

```typescript
// Export data
const exportResult = db.export();
if (exportResult.success) {
  const jsonData = JSON.stringify(exportResult.data);
  // Save to file, send to server, etc.
}

// Import data
const importData = JSON.parse(jsonString);
const importResult = db.import(importData);
```

---

**Last Updated**: November 2025  
**Version**: 2.0.0
