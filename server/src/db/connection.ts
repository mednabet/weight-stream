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
    connectionLimit: db.connectionLimit ?? 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
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
  const conn = await pool.getConnection();
  conn.release();
}

export async function reinitPool(db: DbConfig): Promise<void> {
  if (pool) {
    try { await pool.end(); } catch { /* ignore */ }
  }
  pool = buildPool(db);
  const conn = await pool.getConnection();
  conn.release();
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}
