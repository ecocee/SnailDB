// Server
export { default as SnailDBServer } from './server/snaildb-server';
export type { SnailDBServerConfig, ClientSession } from './server/snaildb-server';

// Client
export { default as SnailDBClient } from './client/snaildb-client';
export type { ConnectionOptions, QueryOptions } from './client/snaildb-client';

// Protocol
export { SnailDBUriParser, SnailDBMessageCodec } from './server/protocol';
export type { SnailDBURI, SnailDBMessage, SnailDBResponse } from './server/protocol';

// Storage
export { StorageEngine } from './server/storage/engine';
export { DataType } from './server/storage/engine';
export type { StorageValue, StorageStats, StorageConfig } from './server/storage/engine';

// Vector
export { VectorIndex, DistanceMetric } from './server/vector/index';
export type { VectorNode, SearchResult } from './server/vector/index';

// Errors
export {
  EcoceeError,
  ErrorCode,
  ErrorHandler,
  DatabaseError,
  KeyNotFoundError,
  KeyExistsError,
  TypeMismatchError,
  OutOfMemoryError,
  PersistenceError,
  ValidationError,
  InvalidArgumentError,
  InvalidSyntaxError,
  InvalidTypeError,
  NetworkError,
  ConnectionTimeoutError,
  ConnectionRefusedError,
  AuthFailedError,
  OperationError,
  OperationTimeoutError,
  NotImplementedError,
  ReplicationError,
  SyncError,
} from './server/errors';
export type { ErrorContext } from './server/errors';

// Logger
export { Logger, LogLevel } from './server/logger';
export type { LogEntry } from './server/logger';

// Replication
export { ReplicationManager } from './server/replication/replication';
export type { ReplicationConfig } from './server/replication/replication';

// PubSub
export { PubSubManager } from './server/pubsub/pubsub';
export type { Subscription } from './server/pubsub/pubsub';

// Commands
export { CommandExecutor } from './server/commands/executor';

// Version
export const VERSION = '2.0.0';
export const PROTOCOL_VERSION = '1.0.0';
