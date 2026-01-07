import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const terminalsRouter = Router();
terminalsRouter.use(authenticate);

// Get all terminals
terminalsRouter.get('/', async (_: AuthRequest, res: Response) => {
  try {
    const terminals = await query<any[]>(`
      SELECT t.*, pl.name as line_name 
      FROM terminals t 
      LEFT JOIN production_lines pl ON t.line_id = pl.id
      ORDER BY t.name
    `);
    res.json(terminals);
  } catch (err) {
    console.error('Get terminals error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create terminal
terminalsRouter.post('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { device_uid, name, line_id, ip_address } = req.body;

  if (!device_uid || !name) {
    return res.status(400).json({ error: 'UID et nom requis' });
  }

  try {
    const id = uuidv4();
    await query(
      'INSERT INTO terminals (id, device_uid, name, line_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [id, device_uid, name, line_id, ip_address]
    );

    res.json({ id, device_uid, name, line_id, ip_address });
  } catch (err: any) {
    if (err.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'UID déjà utilisé' });
    }
    console.error('Create terminal error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update terminal
terminalsRouter.put('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, line_id, ip_address } = req.body;

  try {
    await query(
      'UPDATE terminals SET name = $1, line_id = $2, ip_address = $3 WHERE id = $4',
      [name, line_id, ip_address, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update terminal error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ping terminal (update online status)
terminalsRouter.post('/:id/ping', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query(
      'UPDATE terminals SET is_online = TRUE, last_ping = NOW() WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Ping terminal error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete terminal
terminalsRouter.delete('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM terminals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete terminal error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
