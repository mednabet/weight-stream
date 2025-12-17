// Base database adapter interface
// All database adapters must implement this interface

export interface QueryResult<T = unknown> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

export interface DatabaseAdapter {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Query methods
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  
  // CRUD operations
  select<T = unknown>(table: string, options?: SelectOptions): Promise<QueryResult<T>>;
  insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<QueryResult<T>>;
  update<T = unknown>(table: string, data: Record<string, unknown>, where: WhereClause): Promise<QueryResult<T>>;
  delete(table: string, where: WhereClause): Promise<QueryResult<void>>;

  // Transaction support
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;

  // Schema operations
  tableExists(tableName: string): Promise<boolean>;
  createTable(tableName: string, schema: TableSchema): Promise<void>;

  // Utility
  escape(value: string): string;
  getDialect(): DatabaseDialect;
}

export type DatabaseDialect = 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite';

export interface SelectOptions {
  columns?: string[];
  where?: WhereClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  joins?: JoinClause[];
}

export interface WhereClause {
  [column: string]: unknown | WhereCondition;
}

export interface WhereCondition {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'is_null' | 'not_null';
  value: unknown;
}

export interface OrderByClause {
  column: string;
  direction: 'asc' | 'desc';
}

export interface JoinClause {
  type: 'inner' | 'left' | 'right' | 'full';
  table: string;
  on: { leftColumn: string; rightColumn: string };
}

export interface TableSchema {
  columns: ColumnDefinition[];
  primaryKey?: string | string[];
  foreignKeys?: ForeignKeyDefinition[];
  indexes?: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  defaultValue?: unknown;
  autoIncrement?: boolean;
  unique?: boolean;
}

export type ColumnType = 
  | 'uuid'
  | 'string'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'json';

export interface ForeignKeyDefinition {
  columns: string[];
  references: {
    table: string;
    columns: string[];
  };
  onDelete?: 'cascade' | 'set_null' | 'restrict' | 'no_action';
  onUpdate?: 'cascade' | 'set_null' | 'restrict' | 'no_action';
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

// Abstract base class with common functionality
export abstract class BaseAdapter implements DatabaseAdapter {
  protected connected = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  abstract getDialect(): DatabaseDialect;
  abstract escape(value: string): string;

  isConnected(): boolean {
    return this.connected;
  }

  async select<T = unknown>(table: string, options?: SelectOptions): Promise<QueryResult<T>> {
    const sql = this.buildSelectQuery(table, options);
    return this.query<T>(sql);
  }

  async insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<QueryResult<T>> {
    const sql = this.buildInsertQuery(table, data);
    return this.query<T>(sql);
  }

  async update<T = unknown>(table: string, data: Record<string, unknown>, where: WhereClause): Promise<QueryResult<T>> {
    const sql = this.buildUpdateQuery(table, data, where);
    return this.query<T>(sql);
  }

  async delete(table: string, where: WhereClause): Promise<QueryResult<void>> {
    const sql = this.buildDeleteQuery(table, where);
    return this.query(sql);
  }

  abstract beginTransaction(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract tableExists(tableName: string): Promise<boolean>;
  abstract createTable(tableName: string, schema: TableSchema): Promise<void>;

  protected buildSelectQuery(table: string, options?: SelectOptions): string {
    const columns = options?.columns?.join(', ') || '*';
    let sql = `SELECT ${columns} FROM ${table}`;

    if (options?.joins) {
      for (const join of options.joins) {
        sql += ` ${join.type.toUpperCase()} JOIN ${join.table} ON ${join.on.leftColumn} = ${join.on.rightColumn}`;
      }
    }

    if (options?.where) {
      sql += ` WHERE ${this.buildWhereClause(options.where)}`;
    }

    if (options?.orderBy) {
      const orderClauses = options.orderBy.map(o => `${o.column} ${o.direction.toUpperCase()}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    if (options?.limit !== undefined) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options?.offset !== undefined) {
      sql += ` OFFSET ${options.offset}`;
    }

    return sql;
  }

  protected buildInsertQuery(table: string, data: Record<string, unknown>): string {
    const columns = Object.keys(data);
    const values = Object.values(data).map(v => this.formatValue(v));
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
  }

  protected buildUpdateQuery(table: string, data: Record<string, unknown>, where: WhereClause): string {
    const setClauses = Object.entries(data).map(([col, val]) => `${col} = ${this.formatValue(val)}`);
    return `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${this.buildWhereClause(where)}`;
  }

  protected buildDeleteQuery(table: string, where: WhereClause): string {
    return `DELETE FROM ${table} WHERE ${this.buildWhereClause(where)}`;
  }

  protected buildWhereClause(where: WhereClause): string {
    const conditions: string[] = [];
    
    for (const [column, value] of Object.entries(where)) {
      if (typeof value === 'object' && value !== null && 'operator' in value) {
        const cond = value as WhereCondition;
        conditions.push(this.buildCondition(column, cond));
      } else {
        conditions.push(`${column} = ${this.formatValue(value)}`);
      }
    }

    return conditions.join(' AND ');
  }

  protected buildCondition(column: string, condition: WhereCondition): string {
    switch (condition.operator) {
      case 'eq': return `${column} = ${this.formatValue(condition.value)}`;
      case 'neq': return `${column} != ${this.formatValue(condition.value)}`;
      case 'gt': return `${column} > ${this.formatValue(condition.value)}`;
      case 'gte': return `${column} >= ${this.formatValue(condition.value)}`;
      case 'lt': return `${column} < ${this.formatValue(condition.value)}`;
      case 'lte': return `${column} <= ${this.formatValue(condition.value)}`;
      case 'like': return `${column} LIKE ${this.formatValue(condition.value)}`;
      case 'in': return `${column} IN (${(condition.value as unknown[]).map(v => this.formatValue(v)).join(', ')})`;
      case 'is_null': return `${column} IS NULL`;
      case 'not_null': return `${column} IS NOT NULL`;
      default: return `${column} = ${this.formatValue(condition.value)}`;
    }
  }

  protected formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return `'${this.escape(value)}'`;
    if (value instanceof Date) return `'${value.toISOString()}'`;
    return `'${this.escape(JSON.stringify(value))}'`;
  }
}
