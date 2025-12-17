import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const weightUnitsRouter = Router();
weightUnitsRouter.use(authenticate);

// Get all weight units
weightUnitsRouter.get('/', async (_: AuthRequest, res: Response) => {
  try {
    const units = await query<any[]>('SELECT * FROM weight_units ORDER BY name');
    res.json(units);
  } catch (err) {
    console.error('Get weight units error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create weight unit
weightUnitsRouter.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { code, name, symbol, decimal_precision, is_default } = req.body;

  if (!code || !name || !symbol) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    // If setting as default, unset others
    if (is_default) {
      await query('UPDATE weight_units SET is_default = FALSE');
    }

    const id = uuidv4();
    await query(
      'INSERT INTO weight_units (id, code, name, symbol, decimal_precision, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [id, code, name, symbol, decimal_precision || 3, is_default || false]
    );

    res.json({ id, code, name, symbol, decimal_precision, is_default });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Code déjà utilisé' });
    }
    console.error('Create weight unit error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update weight unit
weightUnitsRouter.put('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { code, name, symbol, decimal_precision, is_default } = req.body;

  try {
    if (is_default) {
      await query('UPDATE weight_units SET is_default = FALSE');
    }

    await query(
      'UPDATE weight_units SET code = ?, name = ?, symbol = ?, decimal_precision = ?, is_default = ? WHERE id = ?',
      [code, name, symbol, decimal_precision, is_default, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update weight unit error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete weight unit
weightUnitsRouter.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM weight_units WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete weight unit error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
