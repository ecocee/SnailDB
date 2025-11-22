/**
 * Query Executor - Execute parsed queries with operators and result streaming
 * Supports SELECT, INSERT, UPDATE, DELETE with filtering, sorting, and limits
 */

import {
  ASTNode,
  SelectStatement,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  CreateTableStatement,
  ExecutionContext,
  ExecutionStats,
  ExecutionError,
  QueryPlan,
  ExecutionStep,
} from '../types';
import { StorageEngine } from '../storage/engine';
import { HNSWIndex, FlatIndex, createVectorIndex } from '../vector/index';
import { v4 as uuid } from 'uuid';

export class QueryExecutor {
  private tables: Map<string, Table> = new Map();
  private storage: StorageEngine;

  constructor(storage: StorageEngine) {
    this.storage = storage;
  }

  async execute(ast: ASTNode): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      id: uuid(),
      startTime: Date.now(),
      query: '',
      results: [],
      stats: {
        rowsAffected: 0,
        executionTime: 0,
        rowsScanned: 0,
        indexes: [],
      } as ExecutionStats,
    };

    try {
      switch (ast.type) {
        case 'SELECT':
          await this.executeSelect(ast as SelectStatement, context);
          break;
        case 'INSERT':
          await this.executeInsert(ast as InsertStatement, context);
          break;
        case 'UPDATE':
          await this.executeUpdate(ast as UpdateStatement, context);
          break;
        case 'DELETE':
          await this.executeDelete(ast as DeleteStatement, context);
          break;
        case 'CREATE_TABLE':
          await this.executeCreateTable(ast as CreateTableStatement, context);
          break;
        default:
          throw new ExecutionError(`Unsupported statement type: ${ast.type}`);
      }
    } catch (error) {
      context.error = error instanceof Error ? error.message : String(error);
    }

    context.stats.executionTime = Date.now() - context.startTime;
    return context;
  }

  async executeSelect(stmt: SelectStatement, context: ExecutionContext): Promise<void> {
    if (!stmt.from) {
      throw new ExecutionError('SELECT requires FROM clause');
    }

    const table = this.tables.get(stmt.from);
    if (!table) {
      throw new ExecutionError(`Table not found: ${stmt.from}`);
    }

    let rows = Array.from(table.rows.values());
    context.stats.rowsScanned = rows.length;

    // Apply WHERE clause
    if (stmt.where) {
      rows = rows.filter((row) => this.evaluateWhere(row, stmt.where!));
    }

    // Apply column selection
    if (stmt.columns && stmt.columns[0] !== '*') {
      context.results = rows.map((row) => {
        const result: Record<string, unknown> = {};
        for (const column of stmt.columns) {
          result[column] = row[column];
        }
        return result;
      });
    } else {
      context.results = rows;
    }

    // Apply ORDER BY
    if (stmt.orderBy && stmt.orderBy.length > 0) {
      context.results = context.results.sort((a, b) => {
        for (const order of stmt.orderBy!) {
          const aVal = a[order.column];
          const bVal = b[order.column];

          if (aVal < bVal) return order.direction === 'ASC' ? -1 : 1;
          if (aVal > bVal) return order.direction === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply LIMIT
    if (stmt.limit) {
      context.results = context.results.slice(0, stmt.limit);
    }

    context.stats.rowsAffected = context.results.length;
  }

  async executeInsert(stmt: InsertStatement, context: ExecutionContext): Promise<void> {
    const table = this.tables.get(stmt.table);
    if (!table) {
      throw new ExecutionError(`Table not found: ${stmt.table}`);
    }

    const columns = stmt.columns.length > 0 ? stmt.columns : table.schema.columns.map((c) => c.name);

    const row: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = stmt.values[i];
    }

    const rowId = uuid();
    table.rows.set(rowId, row);

    // Store in persistent storage
    await this.storage.write(stmt.table, rowId, Buffer.from(JSON.stringify(row)));

    context.stats.rowsAffected = 1;
  }

  async executeUpdate(stmt: UpdateStatement, context: ExecutionContext): Promise<void> {
    const table = this.tables.get(stmt.table);
    if (!table) {
      throw new ExecutionError(`Table not found: ${stmt.table}`);
    }

    let updated = 0;
    for (const [rowId, row] of table.rows) {
      if (!stmt.where || this.evaluateWhere(row, stmt.where)) {
        Object.assign(row, stmt.updates);
        await this.storage.write(stmt.table, rowId, Buffer.from(JSON.stringify(row)));
        updated++;
      }
    }

    context.stats.rowsAffected = updated;
  }

  async executeDelete(stmt: DeleteStatement, context: ExecutionContext): Promise<void> {
    const table = this.tables.get(stmt.table);
    if (!table) {
      throw new ExecutionError(`Table not found: ${stmt.table}`);
    }

    let deleted = 0;
    const rowsToDelete: string[] = [];

    for (const [rowId, row] of table.rows) {
      if (!stmt.where || this.evaluateWhere(row, stmt.where)) {
        rowsToDelete.push(rowId);
        deleted++;
      }
    }

    for (const rowId of rowsToDelete) {
      table.rows.delete(rowId);
      await this.storage.delete(rowId);
    }

    context.stats.rowsAffected = deleted;
  }

  async executeCreateTable(stmt: CreateTableStatement, context: ExecutionContext): Promise<void> {
    if (this.tables.has(stmt.name)) {
      throw new ExecutionError(`Table already exists: ${stmt.name}`);
    }

    const table: Table = {
      name: stmt.name,
      schema: {
        columns: stmt.columns,
      },
      rows: new Map(),
      indexes: new Map(),
    };

    // Create indexes for vector columns
    for (const column of stmt.columns) {
      if (column.isVector) {
        const index = new HNSWIndex('cosine');
        table.indexes.set(column.name, index);
      }
    }

    this.tables.set(stmt.name, table);
  }

  private evaluateWhere(row: Record<string, unknown>, where: any): boolean {
    for (const condition of where.conditions) {
      const rowValue = row[condition.field];
      const conditionValue = condition.value;

      const result = this.evaluateCondition(rowValue, condition.operator, conditionValue);

      if (!result && where.operator === 'AND') {
        return false;
      }

      if (result && where.operator === 'OR') {
        return true;
      }
    }

    return where.operator === 'AND';
  }

  private evaluateCondition(left: unknown, operator: string, right: unknown): boolean {
    switch (operator) {
      case '=':
        return left === right;
      case '!=':
      case '<>':
        return left !== right;
      case '<':
        return (left as any) < (right as any);
      case '<=':
        return (left as any) <= (right as any);
      case '>':
        return (left as any) > (right as any);
      case '>=':
        return (left as any) >= (right as any);
      case 'LIKE':
        return String(left).includes(String(right));
      default:
        throw new ExecutionError(`Unknown operator: ${operator}`);
    }
  }

  createQueryPlan(ast: ASTNode): QueryPlan {
    const steps: ExecutionStep[] = [];

    if (ast.type === 'SELECT') {
      const stmt = ast as SelectStatement;

      steps.push({
        id: uuid(),
        type: 'table_scan',
        table: stmt.from,
        estimatedRows: 1000,
      });

      if (stmt.where) {
        steps.push({
          id: uuid(),
          type: 'filter',
          condition: 'WHERE',
          estimatedRows: 100,
        });
      }

      if (stmt.columns) {
        steps.push({
          id: uuid(),
          type: 'project',
          columns: stmt.columns,
          estimatedRows: 100,
        });
      }

      if (stmt.orderBy) {
        steps.push({
          id: uuid(),
          type: 'sort',
          columns: stmt.orderBy.map((o) => o.column),
          estimatedRows: 100,
        });
      }

      if (stmt.limit) {
        steps.push({
          id: uuid(),
          type: 'limit',
          count: stmt.limit,
          estimatedRows: stmt.limit,
        });
      }
    }

    return {
      id: uuid(),
      steps,
      estimatedCost: steps.length * 10,
    };
  }
}

interface Table {
  name: string;
  schema: {
    columns: any[];
  };
  rows: Map<string, Record<string, unknown>>;
  indexes: Map<string, any>;
}

// Query optimizer
export class QueryOptimizer {
  optimize(plan: QueryPlan): QueryPlan {
    // Reorder steps for better performance
    // For now, return as-is
    return plan;
  }
}

// Query planner for cost-based optimization
export class QueryPlanner {
  plan(ast: ASTNode): QueryPlan {
    const executor = new QueryExecutor(null as any);
    return executor.createQueryPlan(ast);
  }
}
