import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { loadAppConfig, DbConfig } from '../config/app-config.js';

dotenv.config();

let pool: mysql.Pool | null = null;

function buildPool(db: DbConfig): mysql.Pool {
  return mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: db.connectionLimit ?? 10,
    queueLimit: 0,
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
  const c = await pool.getConnection();
  c.release();
}

export async function reinitPool(db: DbConfig): Promise<void> {
  if (pool) {
    try { await pool.end(); } catch { /* ignore */ }
  }
  pool = buildPool(db);
  const c = await pool.getConnection();
  c.release();
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const [results] = await p.execute(sql, params);
  return results as T;
}
