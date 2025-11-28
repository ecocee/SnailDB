/**
 * ECOCEE - Core Type Definitions
 * Comprehensive type system for the database engine
 */

// ============================================================================
// Vector Types
// ============================================================================

export type VectorDistance = 'cosine' | 'euclidean' | 'dot_product';

export interface Vector {
  readonly id: string;
  readonly data: number[];
  readonly dimension: number;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: number;
}

export interface VectorSearchResult {
  readonly id: string;
  readonly distance: number;
  readonly vector?: Vector;
  readonly metadata?: Record<string, unknown>;
}

export interface VectorIndex {
  readonly type: 'hnsw' | 'ivf_flat' | 'flat' | 'pq';
  readonly metric: VectorDistance;
  readonly dimension: number;
  readonly size: number;
}

// ============================================================================
// Storage Engine Types
// ============================================================================

export type StorageDriver = 'disk' | 'memory';
export type StorageFormat = 'btree' | 'lsm';

export interface StorageBlock {
  readonly id: string;
  readonly data: Buffer;
  readonly size: number;
  readonly offset: number;
  readonly checksum: string;
  readonly version: number;
}

export interface WALEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly operation: 'insert' | 'update' | 'delete';
  readonly table: string;
  readonly data: Buffer;
  readonly checksum: string;
}

export interface StorageConfig {
  readonly driver: StorageDriver;
  readonly format: StorageFormat;
  readonly dataDir: string;
  readonly cacheSize: number;
  readonly pageSize: number;
  readonly walEnabled: boolean;
  readonly mvccEnabled: boolean;
}

export interface StorageStats {
  readonly totalBlocks: number;
  readonly totalSize: number;
  readonly cacheHitRate: number;
  readonly compactionInProgress: boolean;
  readonly walSize: number;
}

// ============================================================================
// Table & Schema Types
// ============================================================================

export type ColumnType =
  | 'int'
  | 'bigint'
  | 'text'
  | 'float'
  | 'double'
  | 'boolean'
  | 'timestamp'
  | 'vector'
  | 'json'
  | 'bytes';

export interface ColumnDef {
  readonly name: string;
  readonly type: ColumnType;
  readonly nullable: boolean;
  readonly primaryKey?: boolean;
  readonly indexed?: boolean;
  readonly vectorDimension?: number;
  readonly default?: unknown;
}

export interface TableSchema {
  readonly name: string;
  readonly columns: readonly ColumnDef[];
  readonly primaryKey: string;
  readonly createdAt: number;
  readonly indexes: readonly IndexDef[];
}

export interface IndexDef {
  readonly name: string;
  readonly column: string;
  readonly type: 'btree' | 'hash' | 'hnsw' | 'ivf';
  readonly unique: boolean;
}

// ============================================================================
// Query & Parser Types
// ============================================================================

export type SQLStatementType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'DROP'
  | 'ALTER';

export interface Token {
  readonly type: string;
  readonly value: string;
  readonly position: number;
}

export interface ASTNode {
  readonly type: string;
  readonly children?: readonly ASTNode[];
  readonly value?: unknown;
  readonly metadata?: Record<string, unknown>;
}

export interface SelectStatement extends ASTNode {
  readonly type: 'SELECT';
  readonly columns: readonly string[];
  readonly from: string;
  readonly where?: WhereClause;
  readonly orderBy?: OrderByClause;
  readonly limit?: number;
  readonly offset?: number;
}

export interface WhereClause {
  readonly conditions: readonly Condition[];
  readonly operator: 'AND' | 'OR';
}

export interface Condition {
  readonly field: string;
  readonly operator: ComparisonOperator;
  readonly value: unknown;
}

export type ComparisonOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IN'
  | 'LIKE'
  | 'VECTOR_DISTANCE';

export interface OrderByClause {
  readonly field: string;
  readonly direction: 'ASC' | 'DESC';
}

export interface InsertStatement extends ASTNode {
  readonly type: 'INSERT';
  readonly table: string;
  readonly columns: readonly string[];
  readonly values: readonly unknown[][];
}

export interface UpdateStatement extends ASTNode {
  readonly type: 'UPDATE';
  readonly table: string;
  readonly updates: Record<string, unknown>;
  readonly where?: WhereClause;
}

export interface DeleteStatement extends ASTNode {
  readonly type: 'DELETE';
  readonly table: string;
  readonly where?: WhereClause;
}

export interface CreateTableStatement extends ASTNode {
  readonly type: 'CREATE';
  readonly table: string;
  readonly schema: TableSchema;
}

// ============================================================================
// Query Execution Types
// ============================================================================

export interface QueryPlan {
  readonly type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  readonly steps: readonly ExecutionStep[];
  readonly estimatedCost: number;
  readonly estimatedRows: number;
}

export interface ExecutionStep {
  readonly operator:
    | 'TableScan'
    | 'IndexScan'
    | 'VectorSearch'
    | 'Filter'
    | 'Project'
    | 'Sort'
    | 'Limit'
    | 'HashJoin'
    | 'NestedLoopJoin';
  readonly table?: string;
  readonly index?: string;
  readonly conditions?: Condition[];
  readonly columns?: string[];
  readonly limit?: number;
}

export interface ExecutionContext {
  readonly variables: Map<string, unknown>;
  readonly stats: ExecutionStats;
  readonly txnId: string;
  readonly isolation: IsolationLevel;
}

export interface ExecutionStats {
  readonly rowsScanned: number;
  readonly rowsReturned: number;
  readonly startTime: number;
  readonly endTime?: number;
}

export type IsolationLevel = 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

export interface QueryResult {
  readonly rows: readonly Record<string, unknown>[];
  readonly columns: readonly string[];
  readonly stats: ExecutionStats;
  readonly error?: Error;
}

// ============================================================================
// Network Protocol Types
// ============================================================================

export type MessageType =
  | 'HANDSHAKE'
  | 'AUTH'
  | 'QUERY'
  | 'RESULT'
  | 'ERROR'
  | 'CLOSE'
  | 'PING'
  | 'PONG';

export interface Message {
  readonly id: string;
  readonly type: MessageType;
  readonly version: number;
  readonly timestamp: number;
  readonly payload: Buffer;
}

export interface HandshakeMessage extends Message {
  readonly type: 'HANDSHAKE';
  readonly version: number;
  readonly capabilities: string[];
}

export interface AuthMessage extends Message {
  readonly type: 'AUTH';
  readonly method: 'PASSWORD' | 'TOKEN';
  readonly credentials: string;
}

export interface QueryMessage extends Message {
  readonly type: 'QUERY';
  readonly sql: string;
  readonly parameters?: unknown[];
  readonly timeout?: number;
}

export interface ResultMessage extends Message {
  readonly type: 'RESULT';
  readonly rows: readonly Record<string, unknown>[];
  readonly columns: readonly ColumnDef[];
  readonly affected: number;
}

export interface ErrorMessage extends Message {
  readonly type: 'ERROR';
  readonly code: string;
  readonly message: string;
  readonly severity: 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
}

// ============================================================================
// AI Memory (SuperMemory™) Types
// ============================================================================

export type MemoryType =
  | 'LONG_TERM'
  | 'SHORT_TERM'
  | 'EPISODIC'
  | 'SEMANTIC';

export interface MemoryEntry {
  readonly id: string;
  readonly type: MemoryType;
  readonly content: string;
  readonly embedding?: number[];
  readonly metadata: Record<string, unknown>;
  readonly createdAt: number;
  readonly accessedAt: number;
  readonly importance: number;
}

export interface MemorySearchOptions {
  readonly limit: number;
  readonly threshold?: number;
  readonly includeMetadata: boolean;
  readonly sortBy: 'relevance' | 'recency' | 'importance';
}

export interface MemoryStats {
  readonly totalEntries: number;
  readonly byType: Record<MemoryType, number>;
  readonly totalSize: number;
  readonly lastCompaction: number;
}

export interface ConversationState {
  readonly sessionId: string;
  readonly messages: readonly Message[];
  readonly context: Record<string, unknown>;
  readonly embeddings: Map<string, number[]>;
  readonly createdAt: number;
  readonly lastActivity: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface EcoceeConfig {
  readonly storage: StorageConfig;
  readonly server: ServerConfig;
  readonly vector: VectorConfig;
  readonly memory: MemoryConfig;
  readonly query: QueryConfig;
}

export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly tlsEnabled: boolean;
  readonly certPath?: string;
  readonly maxConnections: number;
  readonly timeout: number;
}

export interface VectorConfig {
  readonly indexType: 'hnsw' | 'ivf_flat' | 'flat' | 'pq';
  readonly metric: VectorDistance;
  readonly dimensions: number;
  readonly hnswM?: number;
  readonly hnswEfConstruction?: number;
  readonly hnswEfSearch?: number;
  readonly quantizationBits?: number;
}

export interface MemoryConfig {
  readonly maxEntries: number;
  readonly maxSize: number;
  readonly ttl?: number;
  readonly compactionInterval: number;
  readonly enableEmbeddings: boolean;
}

export interface QueryConfig {
  readonly maxExecutionTime: number;
  readonly maxMemoryUsage: number;
  readonly enableCache: boolean;
  readonly cacheSize: number;
  readonly enableQueryOptimization: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class EcoceeError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly severity: 'INFO' | 'WARNING' | 'ERROR' | 'FATAL' = 'ERROR'
  ) {
    super(message);
    this.name = 'EcoceeError';
  }
}

export class StorageError extends EcoceeError {
  constructor(message: string) {
    super('STORAGE_ERROR', message);
  }
}

export class ParseError extends EcoceeError {
  constructor(message: string) {
    super('PARSE_ERROR', message);
  }
}

export class ExecutionError extends EcoceeError {
  constructor(message: string) {
    super('EXECUTION_ERROR', message);
  }
}

export class VectorError extends EcoceeError {
  constructor(message: string) {
    super('VECTOR_ERROR', message);
  }
}

export class ProtocolError extends EcoceeError {
  constructor(message: string) {
    super('PROTOCOL_ERROR', message, 'FATAL');
  }
}
