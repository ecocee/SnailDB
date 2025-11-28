/**
 * SNAILDB Server - Custom Database for LLM & AI Models
 * Protocol: snaildb://localhost:PORT
 * Features: Vector search, embeddings, AI memory, full-text search
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger, LogLevel } from './logger';
import { StorageEngine, DataType } from './storage/engine';
import { SnailDBMessageCodec, SnailDBMessage, SnailDBResponse } from './protocol';
import {
  DatabaseError,
  NetworkError,
  ValidationError,
  OperationError,
  AuthFailedError,
  ErrorHandler,
} from './errors';
import { VectorIndex } from './vector/index';
import { ReplicationManager } from './replication/replication';
import { PubSubManager } from './pubsub/pubsub';
import { CommandExecutor } from './commands/executor';

export interface SnailDBServerConfig {
  host: string;
  port: number;
  password?: string;
  dataDir: string;
  maxConnections: number;
  maxMemory: number;
  enableVectorSearch: boolean;
  vectorDimension: number;
  persistence: {
    enabled: boolean;
    interval: number; // ms
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // ms
  };
}

export interface ClientSession {
  id: string;
  socket: net.Socket;
  authenticated: boolean;
  database: number;
  createdAt: Date;
  lastActivity: Date;
  commands: number;
  bytesRead: number;
  bytesWritten: number;
  messageBuffer: Buffer;
}

export class SnailDBServer extends EventEmitter {
  private config: SnailDBServerConfig;
  private logger: Logger;
  private server: net.Server | null = null;
  private storage: StorageEngine;
  private vectorIndex: VectorIndex | null = null;
  private clients: Map<string, ClientSession> = new Map();
  private running: boolean = false;
  private stats = {
    startTime: new Date(),
    totalConnections: 0,
    totalCommands: 0,
    totalErrors: 0,
  };

  constructor(config: SnailDBServerConfig) {
    super();
    this.config = config;
    this.logger = new Logger('SnailDBServer', config.dataDir);
    this.storage = new StorageEngine(config.dataDir, config.maxMemory);

    if (config.enableVectorSearch) {
      this.vectorIndex = new VectorIndex(config.vectorDimension);
    }

    this.setupSignalHandlers();
  }

  /**
   * Start SNAILDB server
   */
  public async start(): Promise<void> {
    try {
      // Initialize storage
      await this.storage.initialize();
      this.logger.info(`Storage initialized at ${this.config.dataDir}`);

      // Create server
      this.server = net.createServer((socket) => this.handleClientConnection(socket));

      this.server.on('error', (err) => {
        this.logger.error(`Server error: ${err.message}`, err);
        this.emit('error', err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        this.running = true;
        this.logger.info(
          `🚀 SNAILDB Server started at snaildb://${this.config.host}:${this.config.port}`
        );
        console.log(`\n✨ SNAILDB Server ready for connections at snaildb://${this.config.host}:${this.config.port}\n`);
        this.emit('started');
      });

      // Start persistence
      if (this.config.persistence.enabled) {
        this.startPersistence();
      }

      // Start monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
    } catch (error) {
      this.logger.error(`Failed to start server: ${error}`);
      throw error;
    }
  }

  /**
   * Stop SNAILDB server
   */
  public async stop(): Promise<void> {
    try {
      this.running = false;

      // Close all clients
      for (const [id, client] of this.clients) {
        this.closeConnection(id);
      }

      // Stop server
      if (this.server) {
        this.server.close();
      }

      // Flush storage
      if (this.config.persistence.enabled) {
        await this.storage.flush();
      }

      this.logger.info('Server stopped gracefully');
      this.emit('stopped');
    } catch (error) {
      this.logger.error(`Error stopping server: ${error}`);
      throw error;
    }
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: net.Socket): void {
    const clientId = uuidv4();
    const session: ClientSession = {
      id: clientId,
      socket,
      authenticated: !this.config.password,
      database: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      commands: 0,
      bytesRead: 0,
      bytesWritten: 0,
      messageBuffer: Buffer.alloc(0),
    };

    this.clients.set(clientId, session);
    this.stats.totalConnections++;
    this.logger.info(`Client connected: ${clientId}`);

    socket.on('data', async (data) => {
      try {
        session.bytesRead += data.length;
        session.lastActivity = new Date();
        session.messageBuffer = Buffer.concat([session.messageBuffer, data]);

        // Process all complete messages
        while (session.messageBuffer.length > 0) {
          const decoded = SnailDBMessageCodec.decode(session.messageBuffer);
          if (!decoded) {
            break;
          }

          const response = await this.handleMessage(session, decoded.message);
          const encoded = SnailDBMessageCodec.encode({
            type: 'connect',
            id: response.id,
            version: '1.0.0',
            timestamp: response.timestamp,
            payload: response,
          } as any);

          socket.write(encoded);
          session.bytesWritten += encoded.length;

          session.messageBuffer = decoded.remaining;
        }
      } catch (error) {
        this.logger.error(`Error processing message: ${error}`, error as Error);
        this.stats.totalErrors++;

        const response = SnailDBMessageCodec.createResponse(
          'error',
          false,
          undefined,
          {
            code: 'PROTOCOL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          }
        );

        const encoded = Buffer.from(JSON.stringify(response) + '\n');
        try {
          socket.write(encoded);
        } catch (err) {
          this.logger.error(`Failed to send error response: ${err}`, err as Error);
        }
      }
    });

    socket.on('error', (err) => {
      this.logger.error(`Client error: ${err.message}`, err);
      this.closeConnection(clientId);
    });

    socket.on('end', () => {
      this.closeConnection(clientId);
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(session: ClientSession, message: SnailDBMessage): Promise<SnailDBResponse> {
    try {
      switch (message.type) {
        case 'connect':
          return this.handleConnect(session, message);

        case 'auth':
          return this.handleAuth(session, message);

        case 'command':
          return this.handleCommand(session, message);

        case 'query':
          return this.handleQuery(session, message);

        case 'ping':
          return SnailDBMessageCodec.createResponse(message.id, true, { pong: true });

        default:
          return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: `Unknown message type: ${message.type}`,
          });
      }
    } catch (error) {
      this.logger.error(`Message handling error: ${error}`, error as Error);
      this.stats.totalErrors++;

      return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle CONNECT message
   */
  private handleConnect(session: ClientSession, message: SnailDBMessage): SnailDBResponse {
    this.logger.info(`Client handshake: ${message.payload.clientId}`);

    return SnailDBMessageCodec.createResponse(message.id, true, {
      status: 'connected',
      serverId: `snaildb-${process.pid}`,
      version: '2.0.0',
      protocolVersion: '1.0.0',
      capabilities: {
        vectorSearch: this.config.enableVectorSearch,
        persistence: this.config.persistence.enabled,
        transactions: true,
        monitoring: this.config.monitoring.enabled,
      },
    });
  }

  /**
   * Handle AUTH message
   */
  private handleAuth(session: ClientSession, message: SnailDBMessage): SnailDBResponse {
    if (!this.config.password) {
      return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
        code: 'NO_PASSWORD_SET',
        message: 'No password required',
      });
    }

    const token = message.payload.token;
    if (token === this.config.password) {
      session.authenticated = true;
      return SnailDBMessageCodec.createResponse(message.id, true, { authenticated: true });
    }

    return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
      code: 'AUTH_FAILED',
      message: 'Invalid password',
    });
  }

  /**
   * Handle COMMAND message
   */
  private async handleCommand(session: ClientSession, message: SnailDBMessage): Promise<SnailDBResponse> {
    if (!session.authenticated) {
      return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
        code: 'NOT_AUTHENTICATED',
        message: 'Client not authenticated',
      });
    }

    const command = message.payload.command?.toUpperCase();
    const args = message.payload.args || [];

    session.commands++;
    this.stats.totalCommands++;

    try {
      let result: any;

      switch (command) {
        // String operations
        case 'SET':
          result = this.cmdSet(args, session);
          break;

        case 'GET':
          result = this.cmdGet(args, session);
          break;

        case 'DEL':
          result = this.cmdDel(args, session);
          break;

        case 'EXISTS':
          result = this.cmdExists(args, session);
          break;

        case 'KEYS':
          result = this.cmdKeys(args, session);
          break;

        case 'TYPE':
          result = this.cmdType(args, session);
          break;

        // Vector operations
        case 'VECTOR.SET':
          result = this.cmdVectorSet(args, session);
          break;

        case 'VECTOR.SEARCH':
          result = await this.cmdVectorSearch(args, session);
          break;

        // Server operations
        case 'INFO':
          result = this.cmdInfo(args);
          break;

        case 'STATS':
          result = this.cmdStats();
          break;

        case 'SAVE':
          await this.storage.flush();
          result = { ok: true };
          break;

        case 'COMPACT':
          await this.storage.compact();
          result = { ok: true };
          break;

        default:
          return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
            code: 'UNKNOWN_COMMAND',
            message: `Unknown command: ${command}`,
          });
      }

      return SnailDBMessageCodec.createResponse(message.id, true, result);
    } catch (error) {
      this.logger.error(`Command error: ${error}`, error as Error);
      return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
        code: 'COMMAND_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle QUERY message
   */
  private async handleQuery(session: ClientSession, message: SnailDBMessage): Promise<SnailDBResponse> {
    if (!session.authenticated) {
      return SnailDBMessageCodec.createResponse(message.id, false, undefined, {
        code: 'NOT_AUTHENTICATED',
        message: 'Client not authenticated',
      });
    }

    // Placeholder for advanced query execution
    return SnailDBMessageCodec.createResponse(message.id, true, { result: [] });
  }

  /**
   * Command handlers
   */

  private cmdSet(args: any[], session: ClientSession): any {
    const [key, value, ttl] = args;
    if (!key) throw new Error('Missing key');

    this.storage.set(key, value, DataType.STRING, ttl, session.database);
    return { ok: true };
  }

  private cmdGet(args: any[], session: ClientSession): any {
    const [key] = args;
    if (!key) throw new Error('Missing key');

    return this.storage.get(key, session.database);
  }

  private cmdDel(args: any[], session: ClientSession): any {
    if (!args.length) throw new Error('Missing keys');

    let deleted = 0;
    for (const key of args) {
      if (this.storage.delete(key, session.database)) {
        deleted++;
      }
    }
    return { deleted };
  }

  private cmdExists(args: any[], session: ClientSession): any {
    if (!args.length) throw new Error('Missing keys');

    let exists = 0;
    for (const key of args) {
      if (this.storage.exists(key, session.database)) {
        exists++;
      }
    }
    return { exists };
  }

  private cmdKeys(args: any[], session: ClientSession): any {
    const pattern = args[0] || '*';
    return this.storage.keys(pattern, session.database);
  }

  private cmdType(args: any[], session: ClientSession): any {
    const [key] = args;
    if (!key) throw new Error('Missing key');

    const type = this.storage.getType(key, session.database);
    return { type: type || 'none' };
  }

  private cmdVectorSet(args: any[], session: ClientSession): any {
    if (!this.vectorIndex) {
      throw new Error('Vector search not enabled');
    }

    const [key, vector] = args;
    if (!key || !vector) throw new Error('Missing key or vector');

    if (!Array.isArray(vector) || vector.length !== this.config.vectorDimension) {
      throw new Error(`Vector must be array of ${this.config.vectorDimension} dimensions`);
    }

    this.vectorIndex.insert(key, vector);
    this.storage.set(key, vector, DataType.STRING, undefined, session.database);

    return { ok: true };
  }

  private async cmdVectorSearch(args: any[], session: ClientSession): Promise<any> {
    if (!this.vectorIndex) {
      throw new Error('Vector search not enabled');
    }

    const [vector, topK] = args;
    if (!vector) throw new Error('Missing vector');

    if (!Array.isArray(vector) || vector.length !== this.config.vectorDimension) {
      throw new Error(`Vector must be array of ${this.config.vectorDimension} dimensions`);
    }

    const results = this.vectorIndex.search(vector, topK || 10);
    return { results };
  }

  private cmdInfo(args: any[]): any {
    const section = args[0] || 'all';

    const info = {
      server: {
        version: '2.0.0',
        protocol: 'SNAILDB',
        uptime: Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000),
        process_id: process.pid,
        os: process.platform,
      },
      stats: {
        total_connections: this.stats.totalConnections,
        total_commands: this.stats.totalCommands,
        total_errors: this.stats.totalErrors,
        current_connections: this.clients.size,
      },
      storage: this.storage.getStats(),
    };

    if (section === 'all') {
      return info;
    }

    return info[section as keyof typeof info] || {};
  }

  private cmdStats(): any {
    return {
      connections: this.clients.size,
      commands: this.stats.totalCommands,
      errors: this.stats.totalErrors,
      uptime: Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000),
      storage: this.storage.getStats(),
    };
  }

  /**
   * Start persistence
   */
  private startPersistence(): void {
    setInterval(async () => {
      try {
        await this.storage.flush();
        this.logger.debug('Persistence checkpoint completed');
      } catch (error) {
        this.logger.error(`Persistence error: ${error}`, error as Error);
      }
    }, this.config.persistence.interval);
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000);
      this.logger.info(
        `Monitoring: Connections=${this.clients.size}, Commands=${this.stats.totalCommands}, Uptime=${uptime}s`
      );

      this.emit('metrics', {
        timestamp: new Date(),
        connections: this.clients.size,
        commands: this.stats.totalCommands,
        errors: this.stats.totalErrors,
        memory: this.storage.getMemoryUsage(),
        uptime,
      });
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Close client connection
   */
  private closeConnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.socket.destroy();
      } catch (error) {
        this.logger.error(`Error closing connection: ${error}`, error as Error);
      }
      this.clients.delete(clientId);
      this.logger.info(`Client disconnected: ${clientId}`);
    }
  }

  /**
   * Setup signal handlers
   */
  private setupSignalHandlers(): void {
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down...');
      this.stop().catch((err) => {
        this.logger.error(`Error during shutdown: ${err}`, err as Error);
        process.exit(1);
      });
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down...');
      this.stop().catch((err) => {
        this.logger.error(`Error during shutdown: ${err}`, err as Error);
        process.exit(1);
      });
    });
  }

  /**
   * Getters
   */

  public isRunning(): boolean {
    return this.running;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getStats() {
    return this.stats;
  }
}

export default SnailDBServer;
