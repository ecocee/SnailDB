/**
 * Production-grade storage engine
 * In-memory data store with persistence, WAL, and recovery
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { Logger } from '../logger';
import {
  DatabaseError,
  PersistenceError,
  OutOfMemoryError,
  TypeMismatchError,
  KeyNotFoundError,
} from '../errors';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export enum DataType {
  STRING = 'string',
  LIST = 'list',
  SET = 'set',
  HASH = 'hash',
  ZSET = 'zset',
  STREAM = 'stream',
}

export interface StorageValue {
  type: DataType;
  value: any;
  expiry?: number; // Unix timestamp
  created: number;
  lastAccessed: number;
  accessCount: number;
}

export interface StorageStats {
  keys: number;
  memory: number;
  hits: number;
  misses: number;
  operations: number;
}

export interface StorageConfig {
  maxMemory: number; // Max memory in bytes
  evictionPolicy: 'lru' | 'lfu' | 'random' | 'ttl';
  enableCompression: boolean;
  compressionThreshold: number; // Compress values larger than this
}

export class StorageEngine {
  private data: Map<string, StorageValue> = new Map();
  private databases: Map<string, StorageValue> = new Map();
  private logger: Logger;
  private dataDir: string;
  private config: StorageConfig;
  private stats: StorageStats = {
    keys: 0,
    memory: 0,
    hits: 0,
    misses: 0,
    operations: 0,
  };
  private walFile: string;
  private walBuffer: string[] = [];
  private walBatchSize: number = 100;
  private checkpointFile: string;

  constructor(dataDir: string, maxMemory: number) {
    this.dataDir = dataDir;
    this.logger = new Logger('StorageEngine', dataDir);
    this.walFile = path.join(dataDir, 'ecocee.wal');
    this.checkpointFile = path.join(dataDir, 'ecocee.rdb');

    this.config = {
      maxMemory,
      evictionPolicy: 'lru',
      enableCompression: true,
      compressionThreshold: 1024, // 1KB
    };
  }

  /**
   * Initialize storage
   */
  public async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Load checkpoint (RDB)
      if (fs.existsSync(this.checkpointFile)) {
        await this.loadCheckpoint();
        this.logger.info('Checkpoint loaded');
      }

      // Replay WAL
      if (fs.existsSync(this.walFile)) {
        await this.replayWAL();
        this.logger.info('WAL replayed');
      }

      this.logger.info('Storage engine initialized');
    } catch (error) {
      this.logger.error('Initialization failed', error as Error);
      throw new PersistenceError('Failed to initialize storage', {}, error as Error);
    }
  }

  /**
   * Get value from storage
   */
  public get(key: string, database: number = 0): any {
    const dbKey = this.getDatabaseKey(key, database);
    const entry = this.data.get(dbKey);

    this.stats.operations++;

    if (!entry) {
      this.stats.misses++;
      throw new KeyNotFoundError(key);
    }

    // Check expiry
    if (entry.expiry && entry.expiry < Date.now()) {
      this.data.delete(dbKey);
      this.stats.misses++;
      throw new KeyNotFoundError(key);
    }

    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in storage
   */
  public set(key: string, value: any, type: DataType = DataType.STRING, ttl?: number, database: number = 0): void {
    const dbKey = this.getDatabaseKey(key, database);
    const now = Date.now();

    // Check memory before insert
    this.checkMemory();

    const entry: StorageValue = {
      type,
      value: this.shouldCompress(value) ? this.compress(value) : value,
      created: now,
      lastAccessed: now,
      accessCount: 1,
      expiry: ttl ? now + ttl : undefined,
    };

    this.data.set(dbKey, entry);
    this.stats.keys = this.data.size;
    this.stats.memory = this.calculateMemory();

    // Log to WAL
    this.logWAL('SET', key, value, type, ttl);

    this.stats.operations++;
  }

  /**
   * Delete key from storage
   */
  public delete(key: string, database: number = 0): boolean {
    const dbKey = this.getDatabaseKey(key, database);
    const deleted = this.data.delete(dbKey);

    if (deleted) {
      this.stats.keys = this.data.size;
      this.stats.memory = this.calculateMemory();
      this.logWAL('DEL', key);
      this.stats.operations++;
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  public exists(key: string, database: number = 0): boolean {
    const dbKey = this.getDatabaseKey(key, database);
    const entry = this.data.get(dbKey);

    if (!entry) {
      return false;
    }

    // Check expiry
    if (entry.expiry && entry.expiry < Date.now()) {
      this.data.delete(dbKey);
      return false;
    }

    return true;
  }

  /**
   * Get all keys
   */
  public keys(pattern?: string, database: number = 0): string[] {
    const prefix = this.getDatabasePrefix(database);
    const keys: string[] = [];

    for (const [dbKey] of this.data) {
      if (dbKey.startsWith(prefix)) {
        const key = this.extractKeyFromDbKey(dbKey);

        // Check expiry
        const entry = this.data.get(dbKey);
        if (entry && entry.expiry && entry.expiry < Date.now()) {
          this.data.delete(dbKey);
          continue;
        }

        // Match pattern if provided
        if (!pattern || this.matchPattern(key, pattern)) {
          keys.push(key);
        }
      }
    }

    return keys;
  }

  /**
   * Get type of key
   */
  public getType(key: string, database: number = 0): DataType | null {
    try {
      const dbKey = this.getDatabaseKey(key, database);
      const entry = this.data.get(dbKey);

      if (!entry) {
        return null;
      }

      // Check expiry
      if (entry.expiry && entry.expiry < Date.now()) {
        this.data.delete(dbKey);
        return null;
      }

      return entry.type;
    } catch {
      return null;
    }
  }

  /**
   * Flush all data
   */
  public async flush(): Promise<void> {
    try {
      // Write checkpoint
      await this.createCheckpoint();

      // Clear WAL buffer
      this.walBuffer = [];

      // Truncate WAL file
      fs.writeFileSync(this.walFile, '');

      this.logger.info('Storage flushed');
    } catch (error) {
      this.logger.error('Flush failed', error as Error);
      throw new PersistenceError('Failed to flush storage', {}, error as Error);
    }
  }

  /**
   * Async flush (background)
   */
  public async flushAsync(): Promise<void> {
    setImmediate(() => {
      this.flush().catch((err) => this.logger.error('Async flush failed', err as Error));
    });
  }

  /**
   * Compact storage
   */
  public async compact(): Promise<void> {
    try {
      // Remove expired entries
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.data.entries()) {
        if (entry.expiry && entry.expiry < now) {
          this.data.delete(key);
          removed++;
        }
      }

      this.logger.info(`Compaction complete: removed ${removed} expired entries`);

      // Recreate checkpoint
      await this.createCheckpoint();
    } catch (error) {
      this.logger.error('Compaction failed', error as Error);
      throw new PersistenceError('Failed to compact storage', {}, error as Error);
    }
  }

  /**
   * Get memory usage
   */
  public getMemoryUsage(): number {
    return this.calculateMemory();
  }

  /**
   * Get stats
   */
  public getStats(): StorageStats {
    return { ...this.stats };
  }

  /**
   * Private methods
   */

  private getDatabaseKey(key: string, database: number): string {
    return `db:${database}:${key}`;
  }

  private getDatabasePrefix(database: number): string {
    return `db:${database}:`;
  }

  private extractKeyFromDbKey(dbKey: string): string {
    return dbKey.split(':').slice(2).join(':');
  }

  private shouldCompress(value: any): boolean {
    if (!this.config.enableCompression) {
      return false;
    }
    const size = JSON.stringify(value).length;
    return size > this.config.compressionThreshold;
  }

  private compress(value: any): string {
    // Placeholder - would use actual compression
    return JSON.stringify(value);
  }

  private calculateMemory(): number {
    let memory = 0;
    for (const [key, entry] of this.data) {
      memory += key.length + JSON.stringify(entry.value).length;
    }
    return memory;
  }

  private checkMemory(): void {
    const memory = this.calculateMemory();
    if (memory > this.config.maxMemory) {
      this.evictData();
    }
  }

  private evictData(): void {
    const entries = Array.from(this.data.entries());

    // Sort based on eviction policy
    entries.sort(([, a], [, b]) => {
      switch (this.config.evictionPolicy) {
        case 'lru':
          return a.lastAccessed - b.lastAccessed;
        case 'lfu':
          return a.accessCount - b.accessCount;
        case 'ttl':
          return (a.expiry || Infinity) - (b.expiry || Infinity);
        case 'random':
        default:
          return Math.random() - 0.5;
      }
    });

    // Remove 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.data.delete(entries[i][0]);
    }

    this.logger.warn(`Evicted ${toRemove} entries due to memory pressure`);
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private logWAL(operation: string, ...args: any[]): void {
    const entry = JSON.stringify({ op: operation, args, ts: Date.now() });
    this.walBuffer.push(entry);

    if (this.walBuffer.length >= this.walBatchSize) {
      this.flushWAL();
    }
  }

  private flushWAL(): void {
    try {
      if (this.walBuffer.length > 0) {
        const content = this.walBuffer.join('\n') + '\n';
        fs.appendFileSync(this.walFile, content);
        this.walBuffer = [];
      }
    } catch (error) {
      this.logger.error('WAL flush failed', error as Error);
    }
  }

  private async createCheckpoint(): Promise<void> {
    try {
      const data = {
        timestamp: Date.now(),
        entries: Array.from(this.data.entries()),
      };

      const json = JSON.stringify(data);
      const compressed = await gzip(json);

      fs.writeFileSync(this.checkpointFile, compressed);
      this.logger.debug('Checkpoint created');
    } catch (error) {
      this.logger.error('Checkpoint creation failed', error as Error);
    }
  }

  private async loadCheckpoint(): Promise<void> {
    try {
      const compressed = fs.readFileSync(this.checkpointFile);
      const json = await gunzip(compressed);
      const data = JSON.parse(json.toString());

      for (const [key, entry] of data.entries) {
        this.data.set(key, entry);
      }

      this.stats.keys = this.data.size;
      this.stats.memory = this.calculateMemory();
    } catch (error) {
      this.logger.error('Checkpoint load failed', error as Error);
    }
  }

  private async replayWAL(): Promise<void> {
    try {
      if (!fs.existsSync(this.walFile)) {
        return;
      }

      const content = fs.readFileSync(this.walFile, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.op === 'SET') {
            const [key, value, type, ttl] = entry.args;
            this.set(key, value, type, ttl);
          } else if (entry.op === 'DEL') {
            const [key] = entry.args;
            this.delete(key);
          }
        } catch (error) {
          this.logger.warn(`Failed to replay WAL entry: ${line}`);
        }
      }
    } catch (error) {
      this.logger.error('WAL replay failed', error as Error);
    }
  }
}

export default StorageEngine;
