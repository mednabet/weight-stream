import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const linesRouter = Router();
linesRouter.use(authenticate);

// Get all lines
linesRouter.get('/', async (_: AuthRequest, res: Response) => {
  try {
    const lines = await query<any[]>(`
      SELECT pl.*, wu.code as weight_unit_code, wu.symbol as weight_unit_symbol 
      FROM production_lines pl 
      LEFT JOIN weight_units wu ON pl.weight_unit_id = wu.id
      ORDER BY pl.name
    `);
    res.json(lines);
  } catch (err) {
    console.error('Get lines error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create line
linesRouter.post('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { name, description, scale_url, photocell_url, weight_unit_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nom requis' });
  }

  try {
    const id = uuidv4();
    await query(
      `INSERT INTO production_lines (id, name, description, scale_url, photocell_url, weight_unit_id) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, description, scale_url, photocell_url, weight_unit_id]
    );

    res.json({ id, name, description, scale_url, photocell_url, weight_unit_id });
  } catch (err) {
    console.error('Create line error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update line
linesRouter.put('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, scale_url, photocell_url, weight_unit_id, is_active } = req.body;

  try {
    await query(
      `UPDATE production_lines SET name = $1, description = $2, scale_url = $3, 
       photocell_url = $4, weight_unit_id = $5, is_active = $6 WHERE id = $7`,
      [name, description, scale_url, photocell_url, weight_unit_id, is_active, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update line error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete line
linesRouter.delete('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM production_lines WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete line error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
