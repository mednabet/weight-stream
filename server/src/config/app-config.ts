import fs from 'fs';
import path from 'path';

export type DbType = 'mysql';

export interface DbConfig {
  type: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionLimit?: number;
}

export interface AppConfig {
  initialized: boolean;
  db: DbConfig;
  createdAt: string;
  updatedAt: string;
}

function getConfigPath() {
  // Allow override (useful for Docker volumes)
  const custom = process.env.APP_CONFIG_PATH;
  if (custom && custom.trim()) return custom;

  // Default: <server_root>/data/app-config.json
  // When running from compiled dist, process.cwd() is typically the server directory
  return path.join(process.cwd(), 'data', 'app-config.json');
}

export function loadAppConfig(): AppConfig | null {
  // Environment variables take precedence for production deployments
  if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
    return {
      initialized: true,
      db: {
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        ssl: (process.env.DB_SSL || 'false') === 'true',
        connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const cfgPath = getConfigPath();
  if (!fs.existsSync(cfgPath)) return null;

  const raw = fs.readFileSync(cfgPath, 'utf-8');
  const parsed = JSON.parse(raw) as AppConfig;

  if (!parsed?.initialized) return null;
  return parsed;
}

export function isConfigured(): boolean {
  return !!loadAppConfig();
}

export function saveAppConfig(db: DbConfig): AppConfig {
  const cfgPath = getConfigPath();
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });

  const now = new Date().toISOString();
  const existing = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) : null;

  const config: AppConfig = {
    initialized: true,
    db,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' });
  return config;
}
