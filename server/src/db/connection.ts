import pg from 'pg';
import dotenv from 'dotenv';
import { loadAppConfig, DbConfig } from '../config/app-config.js';

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;

function buildPool(db: DbConfig): pg.Pool {
  return new Pool({
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: db.database,
    max: db.connectionLimit ?? 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: db.ssl ? { rejectUnauthorized: false } : undefined,
  });
}

export function isPoolReady(): boolean {
  return pool !== null;
}

export async function initPoolFromConfig(): Promise<void> {
  const cfg = loadAppConfig();
  if (!cfg) return;
  pool = buildPool(cfg.db);
  // Validate connection quickly
  const client = await pool.connect();
  client.release();
}

export async function reinitPool(db: DbConfig): Promise<void> {
  if (pool) {
    try { await pool.end(); } catch { /* ignore */ }
  }
  pool = buildPool(db);
  const client = await pool.connect();
  client.release();
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rows as T;
}
