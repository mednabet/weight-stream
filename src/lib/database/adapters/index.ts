// Database adapters barrel export
export * from './base-adapter';
export { PostgreSQLAdapter } from './postgresql-adapter';
export { MySQLAdapter } from './mysql-adapter';
export { SQLServerAdapter } from './sqlserver-adapter';

import { DatabaseAdapter } from './base-adapter';
import { PostgreSQLAdapter } from './postgresql-adapter';
import { MySQLAdapter } from './mysql-adapter';
import { SQLServerAdapter } from './sqlserver-adapter';
import { DatabaseConfig, DatabaseType } from '@/lib/database-config';

// Factory function to create the appropriate adapter
export function createDatabaseAdapter(config: DatabaseConfig): DatabaseAdapter {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLAdapter(config);
    case 'mysql':
      return new MySQLAdapter(config);
    case 'sqlserver':
      return new SQLServerAdapter(config);
    case 'sqlite':
      throw new Error('SQLite adapter not yet implemented');
    default:
      throw new Error(`Unknown database type: ${config.type}`);
  }
}

// Get available database types
export function getAvailableAdapters(): { type: DatabaseType; name: string; available: boolean }[] {
  return [
    { type: 'postgresql', name: 'PostgreSQL', available: true },
    { type: 'mysql', name: 'MySQL / MariaDB', available: true },
    { type: 'sqlserver', name: 'Microsoft SQL Server', available: true },
    { type: 'sqlite', name: 'SQLite', available: false },
  ];
}
