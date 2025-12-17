import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { isConfigured, saveAppConfig, DbConfig } from '../config/app-config.js';
import { reinitPool } from '../db/connection.js';
import { initDatabase } from '../db/init.js';

export const setupRouter = Router();

setupRouter.get('/status', (_: Request, res: Response) => {
  res.json({ configured: isConfigured() });
});

setupRouter.post('/test', async (req: Request, res: Response) => {
  const db = req.body as Partial<DbConfig>;

  // Basic validation
  if (!db?.host || !db?.database || !db?.username || !db?.port) {
    return res.status(400).json({ success: false, error: 'Paramètres DB incomplets' });
  }

  try {
    const conn = await mysql.createConnection({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password || '',
      database: db.database,
      ssl: db.ssl ? { rejectUnauthorized: false } : undefined,
    });
    await conn.ping();
    await conn.end();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e?.message || 'Connexion impossible' });
  }
});

setupRouter.post('/apply', async (req: Request, res: Response) => {
  const db = req.body as DbConfig;

  if (!db?.host || !db?.database || !db?.username || !db?.port || !db?.type) {
    return res.status(400).json({ success: false, error: 'Paramètres DB incomplets' });
  }

  try {
    // Persist config
    saveAppConfig({
      type: 'mysql',
      host: db.host,
      port: db.port,
      database: db.database,
      username: db.username,
      password: db.password || '',
      ssl: !!db.ssl,
      connectionLimit: db.connectionLimit ?? 10,
    });

    // Reinitialize pool and create tables
    await reinitPool({
      type: 'mysql',
      host: db.host,
      port: db.port,
      database: db.database,
      username: db.username,
      password: db.password || '',
      ssl: !!db.ssl,
      connectionLimit: db.connectionLimit ?? 10,
    });

    await initDatabase();

    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Erreur serveur' });
  }
});
