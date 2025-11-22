/**
 * ECOCEE TypeScript SDK - Type-safe client for ECOCEE database
 * Supports queries, vector search, memory operations, and transactions
 */

import { ProtocolClient } from '../../internal/protocol/server';
import { Message, QueryMessage, ResultMessage, ProtocolError } from '../../internal/types';
import { v4 as uuid } from 'uuid';

export interface ConnectOptions {
  host: string;
  port: number;
  password?: string;
  timeout?: number;
}

export interface QueryOptions {
  limit?: number;
  timeout?: number;
}

export interface VectorSearchOptions {
  table: string;
  column: string;
  query: number[];
  limit?: number;
  metric?: 'cosine' | 'euclidean' | 'dot_product';
}

export interface TransactionOptions {
  isolation?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
  timeout?: number;
}

export class EcoceeClient {
  private client: ProtocolClient | null = null;
  private connected: boolean = false;
  private transactions: Map<string, Transaction> = new Map();

  constructor(private options: ConnectOptions) {}

  async connect(): Promise<void> {
    try {
      this.client = new ProtocolClient(this.options.host, this.options.port);
      await this.client.connect();

      if (this.options.password) {
        await this.client.authenticate(this.options.password);
      }

      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.connected = false;
    }
  }

  async query(sql: string, options?: QueryOptions): Promise<QueryResult> {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to database');
    }

    try {
      const result = await this.client.executeQuery(sql);
      return {
        rows: result.rows || [],
        columns: result.columns || [],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async insert(table: string, data: Record<string, unknown>): Promise<InsertResult> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

    const result = await this.query(sql);
    return {
      id: values[0] as string,
      success: result.rowCount > 0,
    };
  }

  async update(table: string, id: string | number, data: Record<string, unknown>): Promise<UpdateResult> {
    const sets = Object.keys(data).map((col, i) => `${col} = $${i + 1}`).join(',');
    const sql = `UPDATE ${table} SET ${sets} WHERE id = $${Object.keys(data).length + 1}`;

    const result = await this.query(sql);
    return {
      success: result.rowCount > 0,
      rowsAffected: result.rowCount,
    };
  }

  async delete(table: string, id: string | number): Promise<DeleteResult> {
    const sql = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.query(sql);
    return {
      success: result.rowCount > 0,
      rowsAffected: result.rowCount,
    };
  }

  async vectorSearch(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const sql = `
      SELECT * FROM ${options.table}
      ORDER BY DISTANCE(${options.column}, $1, '${options.metric || 'cosine'}')
      LIMIT ${options.limit || 10}
    `;

    const result = await this.query(sql);
    return (result.rows || []).map((row) => ({
      id: row.id as string,
      score: row.distance as number,
      data: row,
    }));
  }

  async beginTransaction(options?: TransactionOptions): Promise<Transaction> {
    const transactionId = uuid();
    const transaction = new Transaction(this, transactionId, options);
    this.transactions.set(transactionId, transaction);
    return transaction;
  }

  async createTable(schema: TableSchema): Promise<void> {
    const columnDefs = schema.columns
      .map((col) => {
        let def = `${col.name} ${col.type}`;
        if (col.primaryKey) def += ' PRIMARY KEY';
        if (!col.nullable) def += ' NOT NULL';
        return def;
      })
      .join(',');

    const sql = `CREATE TABLE ${schema.name} (${columnDefs})`;
    await this.query(sql);
  }

  async dropTable(name: string): Promise<void> {
    await this.query(`DROP TABLE ${name}`);
  }

  async getTableSchema(name: string): Promise<TableSchema> {
    const result = await this.query(`SHOW COLUMNS FROM ${name}`);
    return {
      name,
      columns: (result.rows || []).map((row) => ({
        name: row.name as string,
        type: row.type as string,
        nullable: row.nullable !== false,
        primaryKey: row.primary_key === true,
      })),
    };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class Transaction {
  private committed: boolean = false;
  private rolledBack: boolean = false;

  constructor(private client: EcoceeClient, private id: string, private options?: TransactionOptions) {}

  async query(sql: string): Promise<QueryResult> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finished');
    }

    return this.client.query(sql);
  }

  async insert(table: string, data: Record<string, unknown>): Promise<InsertResult> {
    return this.client.insert(table, data);
  }

  async update(table: string, id: string | number, data: Record<string, unknown>): Promise<UpdateResult> {
    return this.client.update(table, id, data);
  }

  async delete(table: string, id: string | number): Promise<DeleteResult> {
    return this.client.delete(table, id);
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finished');
    }
    await this.client.query('COMMIT');
    this.committed = true;
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finished');
    }
    await this.client.query('ROLLBACK');
    this.rolledBack = true;
  }
}

// Query builder for type-safe queries
export class QueryBuilder<T> {
  private sql: string = '';
  private params: unknown[] = [];

  select(...columns: (keyof T)[]): this {
    const cols = columns.length > 0 ? columns.join(',') : '*';
    this.sql = `SELECT ${cols}`;
    return this;
  }

  from(table: string): this {
    this.sql += ` FROM ${table}`;
    return this;
  }

  where(column: keyof T, operator: string, value: unknown): this {
    this.sql += ` WHERE ${String(column)} ${operator} $${this.params.length + 1}`;
    this.params.push(value);
    return this;
  }

  and(column: keyof T, operator: string, value: unknown): this {
    this.sql += ` AND ${String(column)} ${operator} $${this.params.length + 1}`;
    this.params.push(value);
    return this;
  }

  or(column: keyof T, operator: string, value: unknown): this {
    this.sql += ` OR ${String(column)} ${operator} $${this.params.length + 1}`;
    this.params.push(value);
    return this;
  }

  orderBy(column: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.sql += ` ORDER BY ${String(column)} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.sql += ` LIMIT ${count}`;
    return this;
  }

  toSQL(): { sql: string; params: unknown[] } {
    return { sql: this.sql, params: this.params };
  }
}

// Type definitions
export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

export interface InsertResult {
  id: string;
  success: boolean;
}

export interface UpdateResult {
  success: boolean;
  rowsAffected: number;
}

export interface DeleteResult {
  success: boolean;
  rowsAffected: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  data: Record<string, unknown>;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
}

// Export factory function
export async function createClient(options: ConnectOptions): Promise<EcoceeClient> {
  const client = new EcoceeClient(options);
  await client.connect();
  return client;
}
