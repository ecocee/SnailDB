/**
 * Query Parser & Lexer - EcoSQL tokenization and AST building
 * Supports CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, ALTER, DROP
 */

import {
  Token,
  ASTNode,
  SelectStatement,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  CreateTableStatement,
  WhereClause,
  Condition,
  OrderByClause,
  ColumnDef,
  ParseError,
} from '../types';
import { v4 as uuid } from 'uuid';

export class Lexer {
  private position: number = 0;
  private tokens: Token[] = [];

  constructor(private source: string) {}

  tokenize(): Token[] {
    while (this.position < this.source.length) {
      this.skipWhitespace();

      if (this.position >= this.source.length) break;

      const char = this.source[this.position];

      if (this.isAlphaNumeric(char)) {
        this.readIdentifierOrKeyword();
      } else if (char === "'") {
        this.readString();
      } else if (char === '"') {
        this.readIdentifier();
      } else if (this.isDigit(char)) {
        this.readNumber();
      } else if (this.isOperator(char)) {
        this.readOperator();
      } else {
        throw new ParseError(`Unexpected character: ${char} at position ${this.position}`);
      }
    }

    this.tokens.push({
      type: 'EOF',
      value: '',
      line: 0,
      column: 0,
    });

    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length && /\s/.test(this.source[this.position])) {
      this.position++;
    }
  }

  private readIdentifierOrKeyword(): void {
    const start = this.position;

    while (this.position < this.source.length && this.isAlphaNumeric(this.source[this.position])) {
      this.position++;
    }

    const value = this.source.slice(start, this.position);
    const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'AND', 'OR', 'NOT', 'ORDER', 'BY', 'LIMIT', 'VECTOR', 'DISTANCE', 'MATCH'];
    const type = keywords.includes(value.toUpperCase()) ? 'KEYWORD' : 'IDENTIFIER';

    this.tokens.push({
      type,
      value,
      line: 0,
      column: start,
    });
  }

  private readString(): void {
    this.position++; // Skip opening quote
    const start = this.position;

    while (this.position < this.source.length && this.source[this.position] !== "'") {
      this.position++;
    }

    if (this.position >= this.source.length) {
      throw new ParseError('Unterminated string');
    }

    const value = this.source.slice(start, this.position);
    this.tokens.push({
      type: 'STRING',
      value,
      line: 0,
      column: start - 1,
    });

    this.position++; // Skip closing quote
  }

  private readIdentifier(): void {
    this.position++; // Skip opening quote
    const start = this.position;

    while (this.position < this.source.length && this.source[this.position] !== '"') {
      this.position++;
    }

    if (this.position >= this.source.length) {
      throw new ParseError('Unterminated identifier');
    }

    const value = this.source.slice(start, this.position);
    this.tokens.push({
      type: 'IDENTIFIER',
      value,
      line: 0,
      column: start - 1,
    });

    this.position++; // Skip closing quote
  }

  private readNumber(): void {
    const start = this.position;

    while (this.position < this.source.length && (this.isDigit(this.source[this.position]) || this.source[this.position] === '.')) {
      this.position++;
    }

    const value = this.source.slice(start, this.position);
    this.tokens.push({
      type: 'NUMBER',
      value,
      line: 0,
      column: start,
    });
  }

  private readOperator(): void {
    const char = this.source[this.position];
    const nextChar = this.source[this.position + 1];
    let operator = char;

    if (['=', '<', '>', '!'].includes(char) && nextChar === '=') {
      operator = char + nextChar;
      this.position += 2;
    } else if (char === '<' && nextChar === '>') {
      operator = '<>';
      this.position += 2;
    } else {
      this.position++;
    }

    this.tokens.push({
      type: 'OPERATOR',
      value: operator,
      line: 0,
      column: this.position - operator.length,
    });
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isOperator(char: string): boolean {
    return /[=<>!+\-*/(),;]/.test(char);
  }
}

export class Parser {
  private position: number = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const node = this.parseStatement();
    if (!this.isAtEnd()) {
      throw new ParseError('Unexpected tokens after statement');
    }
    return node;
  }

  private parseStatement(): ASTNode {
    const keyword = this.peek().value.toUpperCase();

    switch (keyword) {
      case 'SELECT':
        return this.parseSelect();
      case 'INSERT':
        return this.parseInsert();
      case 'UPDATE':
        return this.parseUpdate();
      case 'DELETE':
        return this.parseDelete();
      case 'CREATE':
        return this.parseCreate();
      case 'ALTER':
        return this.parseAlter();
      case 'DROP':
        return this.parseDrop();
      default:
        throw new ParseError(`Unknown statement: ${keyword}`);
    }
  }

  private parseSelect(): SelectStatement {
    this.consume('SELECT', 'Expected SELECT');
    const columns = this.parseColumnList();

    let from: string | undefined;
    if (this.match('FROM')) {
      from = this.consume('IDENTIFIER', 'Expected table name').value;
    }

    let where: WhereClause | undefined;
    if (this.match('WHERE')) {
      where = this.parseWhere();
    }

    let orderBy: OrderByClause[] = [];
    if (this.match('ORDER')) {
      this.consume('BY', 'Expected BY');
      orderBy = this.parseOrderBy();
    }

    let limit: number | undefined;
    if (this.match('LIMIT')) {
      limit = parseInt(this.consume('NUMBER', 'Expected number').value);
    }

    return {
      type: 'SELECT',
      id: uuid(),
      columns,
      from,
      where,
      orderBy,
      limit,
    };
  }

  private parseInsert(): InsertStatement {
    this.consume('INSERT', 'Expected INSERT');
    this.consume('INTO', 'Expected INTO');
    const table = this.consume('IDENTIFIER', 'Expected table name').value;

    let columns: string[] = [];
    if (this.peek().value === '(') {
      this.advance();
      columns = this.parseColumnList();
      this.consume(')', 'Expected )');
    }

    this.consume('VALUES', 'Expected VALUES');
    this.consume('(', 'Expected (');
    const values = this.parseValueList();
    this.consume(')', 'Expected )');

    return {
      type: 'INSERT',
      id: uuid(),
      table,
      columns,
      values,
    };
  }

  private parseUpdate(): UpdateStatement {
    this.consume('UPDATE', 'Expected UPDATE');
    const table = this.consume('IDENTIFIER', 'Expected table name').value;

    this.consume('SET', 'Expected SET');
    const updates: Record<string, unknown> = {};

    do {
      const column = this.consume('IDENTIFIER', 'Expected column name').value;
      this.consume('=', 'Expected =');
      const value = this.parseValue();
      updates[column] = value;
    } while (this.match(','));

    let where: WhereClause | undefined;
    if (this.match('WHERE')) {
      where = this.parseWhere();
    }

    return {
      type: 'UPDATE',
      id: uuid(),
      table,
      updates,
      where,
    };
  }

  private parseDelete(): DeleteStatement {
    this.consume('DELETE', 'Expected DELETE');
    this.consume('FROM', 'Expected FROM');
    const table = this.consume('IDENTIFIER', 'Expected table name').value;

    let where: WhereClause | undefined;
    if (this.match('WHERE')) {
      where = this.parseWhere();
    }

    return {
      type: 'DELETE',
      id: uuid(),
      table,
      where,
    };
  }

  private parseCreate(): CreateTableStatement {
    this.consume('CREATE', 'Expected CREATE');
    this.consume('TABLE', 'Expected TABLE');
    const name = this.consume('IDENTIFIER', 'Expected table name').value;

    this.consume('(', 'Expected (');
    const columns = this.parseColumnDefinitions();
    this.consume(')', 'Expected )');

    return {
      type: 'CREATE_TABLE',
      id: uuid(),
      name,
      columns,
    };
  }

  private parseAlter(): ASTNode {
    this.consume('ALTER', 'Expected ALTER');
    this.consume('TABLE', 'Expected TABLE');
    const table = this.consume('IDENTIFIER', 'Expected table name').value;

    return {
      type: 'ALTER_TABLE',
      id: uuid(),
      table,
    };
  }

  private parseDrop(): ASTNode {
    this.consume('DROP', 'Expected DROP');
    this.consume('TABLE', 'Expected TABLE');
    const table = this.consume('IDENTIFIER', 'Expected table name').value;

    return {
      type: 'DROP_TABLE',
      id: uuid(),
      table,
    };
  }

  private parseColumnList(): string[] {
    const columns: string[] = [];

    do {
      if (this.peek().value === '*') {
        this.advance();
        columns.push('*');
      } else {
        columns.push(this.consume('IDENTIFIER', 'Expected column name').value);
      }
    } while (this.match(','));

    return columns;
  }

  private parseColumnDefinitions(): ColumnDef[] {
    const columns: ColumnDef[] = [];

    do {
      const name = this.consume('IDENTIFIER', 'Expected column name').value;
      const type = this.consume('IDENTIFIER', 'Expected column type').value;

      let isVector = false;
      if (type.toUpperCase() === 'VECTOR') {
        isVector = true;
      }

      columns.push({
        name,
        type,
        nullable: !this.match('NOT'),
        isPrimary: this.match('PRIMARY'),
        isVector,
      });
    } while (this.match(','));

    return columns;
  }

  private parseWhere(): WhereClause {
    const conditions: Condition[] = [];
    conditions.push(this.parseCondition());

    while (this.peek().value.toUpperCase() === 'AND' || this.peek().value.toUpperCase() === 'OR') {
      const operator = this.advance().value.toUpperCase();
      conditions.push(this.parseCondition());
    }

    return {
      conditions,
      operator: 'AND',
    };
  }

  private parseCondition(): Condition {
    const field = this.consume('IDENTIFIER', 'Expected field name').value;
    const operator = this.consume('OPERATOR', 'Expected operator').value;
    const value = this.parseValue();

    return {
      field,
      operator,
      value,
    };
  }

  private parseOrderBy(): OrderByClause[] {
    const orderBy: OrderByClause[] = [];

    do {
      const column = this.consume('IDENTIFIER', 'Expected column name').value;
      const direction = this.peek().value.toUpperCase() === 'DESC' ? this.advance().value : 'ASC';

      orderBy.push({
        column,
        direction,
      });
    } while (this.match(','));

    return orderBy;
  }

  private parseValueList(): unknown[] {
    const values: unknown[] = [];

    do {
      values.push(this.parseValue());
    } while (this.match(','));

    return values;
  }

  private parseValue(): unknown {
    const token = this.peek();

    if (token.type === 'STRING') {
      return this.advance().value;
    } else if (token.type === 'NUMBER') {
      return parseFloat(this.advance().value);
    } else if (token.value.toUpperCase() === 'NULL') {
      this.advance();
      return null;
    } else if (token.value.toUpperCase() === 'TRUE') {
      this.advance();
      return true;
    } else if (token.value.toUpperCase() === 'FALSE') {
      this.advance();
      return false;
    } else if (token.value === '[') {
      // Parse vector literal
      this.advance();
      const elements: number[] = [];
      do {
        elements.push(parseFloat(this.consume('NUMBER', 'Expected number').value));
      } while (this.match(','));
      this.consume(']', 'Expected ]');
      return elements;
    } else if (token.type === 'IDENTIFIER') {
      return this.advance().value;
    } else {
      throw new ParseError(`Unexpected value: ${token.value}`);
    }
  }

  private peek(): Token {
    return this.tokens[this.position] || { type: 'EOF', value: '', line: 0, column: 0 };
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.peek().value.toUpperCase() === type) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: string, message: string): Token {
    const token = this.peek();

    if (token.type === 'EOF' || (type !== token.type && token.value.toUpperCase() !== type)) {
      throw new ParseError(message);
    }

    this.advance();
    return token;
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }
}

// High-level SQL parser
export function parseSQL(sql: string): ASTNode {
  const lexer = new Lexer(sql);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}
