/**
 * SNAILDB Protocol Parser
 * Custom URI and message protocol for snaildb:// connections
 * Format: snaildb://[username[:password]@]host:port[/database][?options]
 */

export interface SnailDBURI {
  protocol: string; // 'snaildb'
  username?: string;
  password?: string;
  host: string;
  port: number;
  database?: string; // Optional database name
  options: Record<string, string>;
}

export interface SnailDBMessage {
  type: 'connect' | 'auth' | 'command' | 'query' | 'subscribe' | 'publish' | 'ping' | 'disconnect';
  id: string;
  version: string;
  timestamp: number;
  payload: Record<string, any>;
  signature?: string;
}

export interface SnailDBResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: number;
}

export class SnailDBUriParser {
  /**
   * Parse snaildb:// URI
   */
  static parse(uri: string): SnailDBURI {
    if (!uri.startsWith('snaildb://')) {
      throw new Error('Invalid URI: must start with snaildb://');
    }

    const afterProtocol = uri.substring(10); // Remove 'snaildb://'
    let auth = '';
    let rest = afterProtocol;

    // Extract auth if present
    const atIndex = afterProtocol.lastIndexOf('@');
    if (atIndex !== -1) {
      // Check if @ is part of host (IP address) or auth
      const beforeAt = afterProtocol.substring(0, atIndex);
      if (beforeAt.includes(':') && !beforeAt.includes('[')) {
        auth = beforeAt;
        rest = afterProtocol.substring(atIndex + 1);
      }
    }

    // Extract host:port and path
    let hostPort = rest;
    let pathAndQuery = '';

    const slashIndex = rest.indexOf('/');
    if (slashIndex !== -1) {
      hostPort = rest.substring(0, slashIndex);
      pathAndQuery = rest.substring(slashIndex);
    }

    const questionMarkIndex = pathAndQuery.indexOf('?');
    let database = '';
    let queryString = '';

    if (questionMarkIndex !== -1) {
      database = pathAndQuery.substring(0, questionMarkIndex);
      queryString = pathAndQuery.substring(questionMarkIndex + 1);
    } else {
      database = pathAndQuery;
    }

    // Parse auth
    let username = '';
    let password = '';

    if (auth) {
      const colonIndex = auth.indexOf(':');
      if (colonIndex !== -1) {
        username = auth.substring(0, colonIndex);
        password = auth.substring(colonIndex + 1);
      } else {
        username = auth;
      }
    }

    // Parse host:port
    const colonIndex = hostPort.lastIndexOf(':');
    let host = hostPort;
    let port = 12222; // Default SNAILDB port

    if (colonIndex !== -1) {
      host = hostPort.substring(0, colonIndex);
      port = parseInt(hostPort.substring(colonIndex + 1));

      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('Invalid port number');
      }
    }

    // Parse query string
    const options: Record<string, string> = {};
    if (queryString) {
      for (const param of queryString.split('&')) {
        const [key, value] = param.split('=');
        options[key] = decodeURIComponent(value || '');
      }
    }

    return {
      protocol: 'snaildb',
      username: username || undefined,
      password: password || undefined,
      host,
      port,
      database: database ? database.substring(1) : undefined, // Remove leading /
      options,
    };
  }

  /**
   * Format URI from components
   */
  static format(uri: SnailDBURI): string {
    let result = 'snaildb://';

    if (uri.username) {
      result += uri.username;
      if (uri.password) {
        result += `:${uri.password}`;
      }
      result += '@';
    }

    result += `${uri.host}:${uri.port}`;

    if (uri.database) {
      result += `/${uri.database}`;
    }

    if (Object.keys(uri.options).length > 0) {
      const params = Object.entries(uri.options)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
      result += `?${params}`;
    }

    return result;
  }
}

export class SnailDBMessageCodec {
  private static PROTOCOL_VERSION = '1.0.0';
  private static MESSAGE_SEPARATOR = '\n\n'; // Double newline separator

  /**
   * Encode message to bytes
   */
  static encode(message: SnailDBMessage): Buffer {
    const json = JSON.stringify({
      type: message.type,
      id: message.id,
      version: message.version || this.PROTOCOL_VERSION,
      timestamp: message.timestamp,
      payload: message.payload,
      signature: message.signature,
    });

    // Format: [length:4 bytes][message]
    const messageBuffer = Buffer.from(json, 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length);

    return Buffer.concat([lengthBuffer, messageBuffer]);
  }

  /**
   * Decode message from bytes
   */
  static decode(buffer: Buffer): { message: SnailDBMessage; remaining: Buffer } | null {
    if (buffer.length < 4) {
      return null;
    }

    const length = buffer.readUInt32BE(0);
    if (buffer.length < 4 + length) {
      return null;
    }

    const messageBuffer = buffer.slice(4, 4 + length);
    const json = messageBuffer.toString('utf-8');

    try {
      const data = JSON.parse(json);
      const message: SnailDBMessage = {
        type: data.type,
        id: data.id,
        version: data.version || this.PROTOCOL_VERSION,
        timestamp: data.timestamp,
        payload: data.payload,
        signature: data.signature,
      };

      const remaining = buffer.slice(4 + length);
      return { message, remaining };
    } catch (error) {
      throw new Error(`Failed to decode SNAILDB message: ${error}`);
    }
  }

  /**
   * Create command message
   */
  static createCommand(command: string, args: any[] = [], options: Record<string, any> = {}): SnailDBMessage {
    return {
      type: 'command',
      id: this.generateMessageId(),
      version: this.PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: {
        command,
        args,
        ...options,
      },
    };
  }

  /**
   * Create query message
   */
  static createQuery(query: string, params: Record<string, any> = {}): SnailDBMessage {
    return {
      type: 'query',
      id: this.generateMessageId(),
      version: this.PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: {
        query,
        params,
      },
    };
  }

  /**
   * Create auth message
   */
  static createAuth(token: string, options: Record<string, any> = {}): SnailDBMessage {
    return {
      type: 'auth',
      id: this.generateMessageId(),
      version: this.PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: {
        token,
        ...options,
      },
    };
  }

  /**
   * Create connect message
   */
  static createConnect(clientId: string, clientVersion: string): SnailDBMessage {
    return {
      type: 'connect',
      id: this.generateMessageId(),
      version: this.PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: {
        clientId,
        clientVersion,
        os: process.platform,
        nodeVersion: process.version,
      },
    };
  }

  /**
   * Create ping message
   */
  static createPing(): SnailDBMessage {
    return {
      type: 'ping',
      id: this.generateMessageId(),
      version: this.PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: {},
    };
  }

  /**
   * Create response
   */
  static createResponse(requestId: string, success: boolean, data?: any, error?: any): SnailDBResponse {
    return {
      id: requestId,
      success,
      data,
      error,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate unique message ID
   */
  private static generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default { SnailDBUriParser, SnailDBMessageCodec };
