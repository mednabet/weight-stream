// SQL Server adapter implementation
import { 
  BaseAdapter, 
  QueryResult, 
  TableSchema, 
  ColumnType,
  DatabaseDialect,
  SelectOptions
} from './base-adapter';
import { DatabaseConfig } from '@/lib/database-config';

export class SQLServerAdapter extends BaseAdapter {
  private config: DatabaseConfig;
  
  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  getDialect(): DatabaseDialect {
    return 'sqlserver';
  }

  async connect(): Promise<void> {
    // In a real implementation, this would use mssql or tedious library
    console.log(`Connecting to SQL Server at ${this.config.host}:${this.config.port}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from SQL Server');
    this.connected = false;
  }

  async query<T = unknown>(sql: string, _params?: unknown[]): Promise<QueryResult<T>> {
    // Placeholder - in real implementation, use mssql library
    console.log('SQL Server Query:', sql);
    return { data: null, error: new Error('Not implemented - use with actual SQL Server driver') };
  }

  async beginTransaction(): Promise<void> {
    await this.query('BEGIN TRANSACTION');
  }

  async commit(): Promise<void> {
    await this.query('COMMIT TRANSACTION');
  }

  async rollback(): Promise<void> {
    await this.query('ROLLBACK TRANSACTION');
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}'`
    );
    return (result.data?.[0]?.count ?? 0) > 0;
  }

  async createTable(tableName: string, schema: TableSchema): Promise<void> {
    const columnDefs = schema.columns.map(col => this.columnToSQL(col)).join(',\n  ');
    
    let sql = `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}')\n`;
    sql += `CREATE TABLE ${tableName} (\n  ${columnDefs}`;
    
    if (schema.primaryKey) {
      const pkColumns = Array.isArray(schema.primaryKey) ? schema.primaryKey.join(', ') : schema.primaryKey;
      sql += `,\n  CONSTRAINT PK_${tableName} PRIMARY KEY (${pkColumns})`;
    }
    
    if (schema.foreignKeys) {
      for (const fk of schema.foreignKeys) {
        const fkName = `FK_${tableName}_${fk.references.table}`;
        sql += `,\n  CONSTRAINT ${fkName} FOREIGN KEY (${fk.columns.join(', ')}) REFERENCES ${fk.references.table}(${fk.references.columns.join(', ')})`;
        if (fk.onDelete) sql += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
        if (fk.onUpdate) sql += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
      }
    }
    
    sql += '\n)';
    
    await this.query(sql);
    
    // Create indexes
    if (schema.indexes) {
      for (const idx of schema.indexes) {
        const unique = idx.unique ? 'UNIQUE ' : '';
        await this.query(`CREATE ${unique}INDEX ${idx.name} ON ${tableName}(${idx.columns.join(', ')})`);
      }
    }
  }

  escape(value: string): string {
    return value.replace(/'/g, "''");
  }

  // SQL Server uses different syntax for LIMIT/OFFSET
  protected buildSelectQuery(table: string, options?: SelectOptions): string {
    const columns = options?.columns?.join(', ') || '*';
    let sql = `SELECT`;
    
    // SQL Server uses TOP instead of LIMIT when no OFFSET
    if (options?.limit !== undefined && options?.offset === undefined) {
      sql += ` TOP ${options.limit}`;
    }
    
    sql += ` ${columns} FROM ${table}`;

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

    // SQL Server uses OFFSET...FETCH for pagination
    if (options?.offset !== undefined && options?.limit !== undefined) {
      if (!options?.orderBy) {
        sql += ' ORDER BY (SELECT NULL)'; // Required for OFFSET
      }
      sql += ` OFFSET ${options.offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
    }

    return sql;
  }

  private columnToSQL(col: { name: string; type: ColumnType; nullable?: boolean; defaultValue?: unknown; autoIncrement?: boolean; unique?: boolean }): string {
    let sql = `[${col.name}] ${this.mapColumnType(col.type, col.autoIncrement)}`;
    
    if (col.autoIncrement) sql += ' IDENTITY(1,1)';
    if (col.unique) sql += ' UNIQUE';
    if (!col.nullable) sql += ' NOT NULL';
    if (col.defaultValue !== undefined && !col.autoIncrement) {
      sql += ` DEFAULT ${this.formatDefaultValue(col.defaultValue, col.type)}`;
    }
    
    return sql;
  }

  private mapColumnType(type: ColumnType, isAutoIncrement?: boolean): string {
    const typeMap: Record<ColumnType, string> = {
      uuid: 'UNIQUEIDENTIFIER DEFAULT NEWID()',
      string: 'NVARCHAR(255)',
      text: 'NVARCHAR(MAX)',
      integer: isAutoIncrement ? 'INT' : 'INT',
      bigint: 'BIGINT',
      decimal: 'DECIMAL(18,4)',
      boolean: 'BIT',
      date: 'DATE',
      datetime: 'DATETIME2',
      timestamp: 'DATETIME2',
      json: 'NVARCHAR(MAX)', // SQL Server stores JSON as string
    };
    return typeMap[type] || 'NVARCHAR(MAX)';
  }

  private formatDefaultValue(value: unknown, type: ColumnType): string {
    if (value === 'now()' || value === 'CURRENT_TIMESTAMP') return 'GETDATE()';
    if (type === 'boolean') return value ? '1' : '0';
    if (typeof value === 'string') return `N'${this.escape(value)}'`;
    return String(value);
  }
}
