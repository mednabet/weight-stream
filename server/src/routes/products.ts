import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const productsRouter = Router();
productsRouter.use(authenticate);

// Get all products
productsRouter.get('/', async (_: AuthRequest, res: Response) => {
  try {
    const products = await query<any[]>(`
      SELECT p.*, wu.code as weight_unit_code, wu.symbol as weight_unit_symbol 
      FROM products p 
      LEFT JOIN weight_units wu ON p.weight_unit_id = wu.id
      ORDER BY p.name
    `);
    res.json(products);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create product
productsRouter.post('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { reference, name, target_weight, tolerance_min, tolerance_max, weight_unit_id } = req.body;

  if (!reference || !name || target_weight === undefined) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    const id = uuidv4();
    await query(
      `INSERT INTO products (id, reference, name, target_weight, tolerance_min, tolerance_max, weight_unit_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, name, target_weight, tolerance_min || 0, tolerance_max || 0, weight_unit_id]
    );

    res.json({ id, reference, name, target_weight, tolerance_min, tolerance_max, weight_unit_id });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Référence déjà utilisée' });
    }
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update product
productsRouter.put('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reference, name, target_weight, tolerance_min, tolerance_max, weight_unit_id, is_active } = req.body;

  try {
    await query(
      `UPDATE products SET reference = ?, name = ?, target_weight = ?, tolerance_min = ?, 
       tolerance_max = ?, weight_unit_id = ?, is_active = ? WHERE id = ?`,
      [reference, name, target_weight, tolerance_min, tolerance_max, weight_unit_id, is_active, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete product
productsRouter.delete('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
