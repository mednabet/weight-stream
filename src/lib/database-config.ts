// Database configuration types for multi-database support
// This file is designed for self-hosting scenarios where you need to connect
// to different database systems (PostgreSQL, MySQL, SQL Server, etc.)

export type DatabaseType = 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  // Additional options
  poolSize?: number;
  connectionTimeout?: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  app: {
    name: string;
    locale: string;
    timezone: string;
  };
  auth: {
    provider: 'jwt' | 'oauth';
    sessionTimeout: number; // in minutes
  };
  initialized: boolean;
  initializedAt?: string;
}

// Default configuration template
export const defaultConfig: AppConfig = {
  database: {
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'production_db',
    username: '',
    password: '',
    ssl: true,
    poolSize: 10,
    connectionTimeout: 30000,
  },
  app: {
    name: 'Production Line Manager',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
  },
  auth: {
    provider: 'jwt',
    sessionTimeout: 480, // 8 hours
  },
  initialized: false,
};

// Default ports for each database type
export const defaultPorts: Record<DatabaseType, number> = {
  postgresql: 5432,
  mysql: 3306,
  sqlserver: 1433,
  sqlite: 0, // N/A for SQLite
};

// Database type display names
export const databaseTypeLabels: Record<DatabaseType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlserver: 'Microsoft SQL Server',
  sqlite: 'SQLite',
};

// Validate database configuration
export function validateDatabaseConfig(config: DatabaseConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.host && config.type !== 'sqlite') {
    errors.push('L\'hôte de la base de données est requis');
  }

  if (!config.database) {
    errors.push('Le nom de la base de données est requis');
  }

  if (!config.username && config.type !== 'sqlite') {
    errors.push('Le nom d\'utilisateur est requis');
  }

  if (config.port < 0 || config.port > 65535) {
    errors.push('Le port doit être entre 0 et 65535');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate connection string for different database types
export function generateConnectionString(config: DatabaseConfig): string {
  switch (config.type) {
    case 'postgresql':
      return `postgresql://${config.username}:****@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`;
    case 'mysql':
      return `mysql://${config.username}:****@${config.host}:${config.port}/${config.database}`;
    case 'sqlserver':
      return `Server=${config.host},${config.port};Database=${config.database};User Id=${config.username};Password=****;${config.ssl ? 'Encrypt=True;' : ''}`;
    case 'sqlite':
      return `sqlite://${config.database}`;
    default:
      return '';
  }
}

// Storage key for configuration
export const CONFIG_STORAGE_KEY = 'app_database_config';

// Save configuration to localStorage (for demo/development)
// In production, this should be saved to a secure backend or environment variables
export function saveConfig(config: AppConfig): void {
  // Don't save passwords in localStorage in production!
  const configToSave = {
    ...config,
    database: {
      ...config.database,
      password: '', // Never save password in localStorage
    },
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
}

// Load configuration from localStorage
export function loadConfig(): AppConfig | null {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

// Check if app is initialized
export function isAppInitialized(): boolean {
  const config = loadConfig();
  return config?.initialized ?? false;
}
