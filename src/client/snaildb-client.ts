/**
 * SNAILDB Client Library
 * TypeScript SDK for connecting to SNAILDB servers
 */

import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { SnailDBUriParser, SnailDBMessageCodec, SnailDBMessage, SnailDBResponse } from '../server/protocol';

export interface ConnectionOptions {
  uri: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface QueryOptions {
  timeout?: number;
  database?: number;
}

export class SnailDBClient {
  private socket: net.Socket | null = null;
  private messageBuffer: Buffer = Buffer.alloc(0);
  private pendingResponses: Map<string, { resolve: (value: any) => void; reject: (error: Error) => void; timeout: NodeJS.Timeout }> = new Map();
  private options: ConnectionOptions;
  private connected: boolean = false;
  private database: number = 0;

  constructor(options: ConnectionOptions) {
    this.options = {
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * Connect to SNAILDB server
   */
  public async connect(): Promise<void> {
    const uri = SnailDBUriParser.parse(this.options.uri);

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(
        {
          host: uri.host,
          port: uri.port,
          timeout: this.options.timeout,
        },
        () => {
          this.connected = true;
          resolve();
        }
      );

      this.socket.on('data', (data) => this.handleData(data));
      this.socket.on('error', (error) => {
        this.connected = false;
        reject(error);
      });
      this.socket.on('close', () => {
        this.connected = false;
      });

      this.socket.on('timeout', () => {
        this.socket?.destroy();
        reject(new Error('Connection timeout'));
      });
    });
  }

  /**
   * Disconnect from server
   */
  public async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.connected = false;
    }
  }

  /**
   * Execute a command
   */
  public async command(cmd: string, ...args: any[]): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    const message = SnailDBMessageCodec.createCommand(cmd, args);
    return this.sendMessage(message);
  }

  /**
   * SET command
   */
  public async set(key: string, value: any, ttl?: number): Promise<any> {
    return this.command('SET', key, value, ttl);
  }

  /**
   * GET command
   */
  public async get(key: string): Promise<any> {
    return this.command('GET', key);
  }

  /**
   * DEL command
   */
  public async del(...keys: string[]): Promise<number> {
    return this.command('DEL', ...keys);
  }

  /**
   * EXISTS command
   */
  public async exists(...keys: string[]): Promise<number> {
    return this.command('EXISTS', ...keys);
  }

  /**
   * KEYS command
   */
  public async keys(pattern: string = '*'): Promise<string[]> {
    return this.command('KEYS', pattern);
  }

  /**
   * TYPE command
   */
  public async type(key: string): Promise<string> {
    return this.command('TYPE', key);
  }

  /**
   * List operations
   */
  public async lpush(key: string, ...values: any[]): Promise<number> {
    return this.command('LPUSH', key, ...values);
  }

  public async rpush(key: string, ...values: any[]): Promise<number> {
    return this.command('RPUSH', key, ...values);
  }

  public async lpop(key: string): Promise<any> {
    return this.command('LPOP', key);
  }

  public async rpop(key: string): Promise<any> {
    return this.command('RPOP', key);
  }

  public async llen(key: string): Promise<number> {
    return this.command('LLEN', key);
  }

  public async lrange(key: string, start: number, end: number): Promise<any[]> {
    return this.command('LRANGE', key, start, end);
  }

  /**
   * Hash operations
   */
  public async hset(key: string, ...pairs: any[]): Promise<number> {
    return this.command('HSET', key, ...pairs);
  }

  public async hget(key: string, field: string): Promise<any> {
    return this.command('HGET', key, field);
  }

  public async hgetall(key: string): Promise<Record<string, any>> {
    return this.command('HGETALL', key);
  }

  public async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.command('HDEL', key, ...fields);
  }

  public async hexists(key: string, field: string): Promise<number> {
    return this.command('HEXISTS', key, field);
  }

  /**
   * Set operations
   */
  public async sadd(key: string, ...members: any[]): Promise<number> {
    return this.command('SADD', key, ...members);
  }

  public async srem(key: string, ...members: any[]): Promise<number> {
    return this.command('SREM', key, ...members);
  }

  public async smembers(key: string): Promise<any[]> {
    return this.command('SMEMBERS', key);
  }

  public async scard(key: string): Promise<number> {
    return this.command('SCARD', key);
  }

  /**
   * Vector operations
   */
  public async vectorSet(key: string, vector: number[], metadata?: Record<string, any>): Promise<any> {
    return this.command('VECTOR.SET', key, vector, metadata);
  }

  public async vectorSearch(vector: number[], topK: number = 10): Promise<any> {
    return this.command('VECTOR.SEARCH', vector, topK);
  }

  /**
   * Server operations
   */
  public async info(section?: string): Promise<any> {
    return this.command('INFO', section);
  }

  public async stats(): Promise<any> {
    return this.command('STATS');
  }

  public async save(): Promise<any> {
    return this.command('SAVE');
  }

  public async compact(): Promise<any> {
    return this.command('COMPACT');
  }

  /**
   * Batch operations
   */
  public async batch(operations: Array<{ cmd: string; args: any[] }>): Promise<any[]> {
    const results = [];
    for (const op of operations) {
      const result = await this.command(op.cmd, ...op.args);
      results.push(result);
    }
    return results;
  }

  /**
   * Transaction
   */
  public async transaction(fn: (client: SnailDBClient) => Promise<void>): Promise<void> {
    // Placeholder for transaction support
    await fn(this);
  }

  /**
   * Private methods
   */

  private async sendMessage(message: SnailDBMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(message.id);
        reject(new Error(`Command timeout: ${message.id}`));
      }, this.options.timeout || 5000);

      this.pendingResponses.set(message.id, { resolve, reject, timeout });

      const encoded = SnailDBMessageCodec.encode(message);
      if (!this.socket || !this.socket.writable) {
        this.pendingResponses.delete(message.id);
        clearTimeout(timeout);
        reject(new Error('Socket not writable'));
        return;
      }

      this.socket.write(encoded, (error) => {
        if (error) {
          this.pendingResponses.delete(message.id);
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  private handleData(data: Buffer): void {
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

    while (this.messageBuffer.length > 0) {
      try {
        const decoded = SnailDBMessageCodec.decode(this.messageBuffer);
        if (!decoded) {
          break;
        }

        this.handleMessage(decoded.message);
        this.messageBuffer = decoded.remaining;
      } catch (error) {
        console.error('Error decoding message:', error);
        // Clear buffer and disconnect on decode error
        this.messageBuffer = Buffer.alloc(0);
        this.socket?.destroy();
        break;
      }
    }
  }

  private handleMessage(message: any): void {
    // The server sends responses wrapped in a message with payload containing the actual response
    const response = message.payload || message;
    const pendingResponse = this.pendingResponses.get(response.id);
    
    if (pendingResponse) {
      clearTimeout(pendingResponse.timeout);
      this.pendingResponses.delete(response.id);

      if (response.success === true) {
        pendingResponse.resolve(response.data);
      } else if (response.success === false) {
        const errorMessage = response.error?.message || response.error || 'Unknown error';
        const error = new Error(errorMessage);
        pendingResponse.reject(error);
      } else {
        // Handle case where success is undefined
        pendingResponse.resolve(response.data);
      }
    }
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }
}

export default SnailDBClient;
