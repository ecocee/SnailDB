/**
 * Network Protocol - TCP server with PostgreSQL-style message format
 * Supports handshake, authentication, query execution, and result streaming
 */

import * as net from 'net';
import { v4 as uuid } from 'uuid';
import {
  Message,
  HandshakeMessage,
  AuthMessage,
  QueryMessage,
  ResultMessage,
  ErrorMessage,
  ProtocolError,
} from '../types';

export interface ProtocolConfig {
  port: number;
  host: string;
  maxConnections: number;
  authRequired: boolean;
  defaultPassword: string;
}

export class ProtocolServer {
  private server: net.Server;
  private connections: Map<string, ClientConnection> = new Map();
  private config: ProtocolConfig;

  constructor(config: ProtocolConfig) {
    this.config = config;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`ECOCEE server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Close all connections
      for (const connection of this.connections.values()) {
        connection.socket.destroy();
      }

      this.server.close(() => resolve());
      this.server.on('error', reject);
    });
  }

  private handleConnection(socket: net.Socket): void {
    const connectionId = uuid();
    const connection = new ClientConnection(socket, connectionId);

    this.connections.set(connectionId, connection);

    // Send handshake
    connection.sendHandshake({
      id: uuid(),
      timestamp: Date.now(),
      version: '1.0.0',
      serverName: 'ECOCEE',
    });

    socket.on('data', (data) => this.handleData(connection, data));
    socket.on('end', () => this.handleDisconnect(connection));
    socket.on('error', (error) => console.error(`Connection error: ${error.message}`));
  }

  private handleData(connection: ClientConnection, data: Buffer): void {
    try {
      const message = this.parseMessage(data);

      if (!connection.authenticated && this.config.authRequired && message.type !== 'AUTH') {
        throw new ProtocolError('Authentication required');
      }

      switch (message.type) {
        case 'AUTH':
          this.handleAuth(connection, message as AuthMessage);
          break;
        case 'QUERY':
          this.handleQuery(connection, message as QueryMessage);
          break;
        case 'CLOSE':
          connection.socket.end();
          break;
        default:
          throw new ProtocolError(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      const errorMessage: ErrorMessage = {
        type: 'ERROR',
        id: uuid(),
        timestamp: Date.now(),
        code: 'PROTOCOL_ERROR',
        message: error instanceof Error ? error.message : String(error),
      };
      connection.sendError(errorMessage);
    }
  }

  private handleDisconnect(connection: ClientConnection): void {
    this.connections.delete(connection.id);
    console.log(`Client disconnected: ${connection.id}`);
  }

  private handleAuth(connection: ClientConnection, message: AuthMessage): void {
    // Simple password check
    if (this.config.authRequired && message.password !== this.config.defaultPassword) {
      throw new ProtocolError('Invalid credentials');
    }

    connection.authenticated = true;
    connection.sendMessage({
      type: 'AUTH_OK',
      id: uuid(),
      timestamp: Date.now(),
    } as Message);
  }

  private handleQuery(connection: ClientConnection, message: QueryMessage): void {
    // Parse and execute query
    // For now, echo back as result
    const resultMessage: ResultMessage = {
      type: 'RESULT',
      id: uuid(),
      timestamp: Date.now(),
      queryId: message.id,
      rowCount: 0,
      rows: [],
      columns: [],
    };

    connection.sendResult(resultMessage);
  }

  private parseMessage(data: Buffer): Message {
    try {
      const type = data[0];
      const payload = data.slice(1);

      switch (type) {
        case 0x41: // 'A' - AUTH
          return this.parseAuthMessage(payload);
        case 0x51: // 'Q' - QUERY
          return this.parseQueryMessage(payload);
        case 0x58: // 'X' - CLOSE
          return { type: 'CLOSE', id: uuid(), timestamp: Date.now() };
        default:
          throw new ProtocolError(`Unknown message type byte: ${type}`);
      }
    } catch (error) {
      throw new ProtocolError(`Failed to parse message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseAuthMessage(payload: Buffer): AuthMessage {
    const passwordLength = payload.readUInt32BE(0);
    const password = payload.slice(4, 4 + passwordLength).toString('utf-8');

    return {
      type: 'AUTH',
      id: uuid(),
      timestamp: Date.now(),
      password,
    };
  }

  private parseQueryMessage(payload: Buffer): QueryMessage {
    const queryLength = payload.readUInt32BE(0);
    const query = payload.slice(4, 4 + queryLength).toString('utf-8');

    return {
      type: 'QUERY',
      id: uuid(),
      timestamp: Date.now(),
      query,
    };
  }
}

class ClientConnection {
  authenticated: boolean = false;

  constructor(readonly socket: net.Socket, readonly id: string) {}

  sendMessage(message: Message): void {
    const buffer = this.serializeMessage(message);
    this.socket.write(buffer);
  }

  sendHandshake(message: HandshakeMessage): void {
    const buffer = this.serializeMessage(message);
    this.socket.write(buffer);
  }

  sendError(message: ErrorMessage): void {
    const buffer = this.serializeMessage(message);
    this.socket.write(buffer);
  }

  sendResult(message: ResultMessage): void {
    const buffer = this.serializeMessage(message);
    this.socket.write(buffer);
  }

  private serializeMessage(message: Message): Buffer {
    const json = JSON.stringify(message);
    const buffer = Buffer.alloc(1 + 4 + Buffer.byteLength(json));

    buffer[0] = this.getMessageType(message.type);
    buffer.writeUInt32BE(Buffer.byteLength(json), 1);
    buffer.write(json, 5);

    return buffer;
  }

  private getMessageType(type: string): number {
    switch (type) {
      case 'HANDSHAKE':
        return 0x48; // 'H'
      case 'AUTH':
        return 0x41; // 'A'
      case 'AUTH_OK':
        return 0x4b; // 'K'
      case 'QUERY':
        return 0x51; // 'Q'
      case 'RESULT':
        return 0x52; // 'R'
      case 'ERROR':
        return 0x45; // 'E'
      case 'CLOSE':
        return 0x58; // 'X'
      default:
        return 0x00;
    }
  }
}

// Client-side protocol handler
export class ProtocolClient {
  private socket: net.Socket;
  private authenticated: boolean = false;
  private messageHandlers: Map<string, (message: Message) => void> = new Map();

  constructor(host: string, port: number) {
    this.socket = net.createConnection(port, host);
    this.socket.on('data', (data) => this.handleData(data));
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => resolve());
      this.socket.on('error', reject);
    });
  }

  async authenticate(password: string): Promise<void> {
    const message: AuthMessage = {
      type: 'AUTH',
      id: uuid(),
      timestamp: Date.now(),
      password,
    };

    return new Promise((resolve, reject) => {
      this.messageHandlers.set(message.id, (response) => {
        if (response.type === 'AUTH_OK') {
          this.authenticated = true;
          resolve();
        } else if (response.type === 'ERROR') {
          reject(new ProtocolError('Authentication failed'));
        }
      });

      this.sendMessage(message);
    });
  }

  async executeQuery(query: string): Promise<ResultMessage> {
    if (!this.authenticated) {
      throw new ProtocolError('Not authenticated');
    }

    const message: QueryMessage = {
      type: 'QUERY',
      id: uuid(),
      timestamp: Date.now(),
      query,
    };

    return new Promise((resolve, reject) => {
      this.messageHandlers.set(message.id, (response) => {
        if (response.type === 'RESULT') {
          resolve(response as ResultMessage);
        } else if (response.type === 'ERROR') {
          reject(new ProtocolError((response as ErrorMessage).message));
        }
      });

      this.sendMessage(message);
    });
  }

  close(): void {
    this.socket.end();
  }

  private sendMessage(message: Message): void {
    const json = JSON.stringify(message);
    const buffer = Buffer.alloc(1 + 4 + Buffer.byteLength(json));

    buffer[0] = this.getMessageType(message.type);
    buffer.writeUInt32BE(Buffer.byteLength(json), 1);
    buffer.write(json, 5);

    this.socket.write(buffer);
  }

  private handleData(data: Buffer): void {
    try {
      const messageType = data[0];
      const length = data.readUInt32BE(1);
      const payload = data.slice(5, 5 + length).toString('utf-8');
      const message = JSON.parse(payload);

      if (message.id && this.messageHandlers.has(message.id)) {
        const handler = this.messageHandlers.get(message.id)!;
        handler(message);
        this.messageHandlers.delete(message.id);
      }
    } catch (error) {
      console.error(`Failed to handle data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMessageType(type: string): number {
    switch (type) {
      case 'HANDSHAKE':
        return 0x48; // 'H'
      case 'AUTH':
        return 0x41; // 'A'
      case 'AUTH_OK':
        return 0x4b; // 'K'
      case 'QUERY':
        return 0x51; // 'Q'
      case 'RESULT':
        return 0x52; // 'R'
      case 'ERROR':
        return 0x45; // 'E'
      case 'CLOSE':
        return 0x58; // 'X'
      default:
        return 0x00;
    }
  }
}
