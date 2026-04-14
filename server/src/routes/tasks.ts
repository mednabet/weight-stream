import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const tasksRouter = Router();
tasksRouter.use(authenticate);

// Get all tasks
tasksRouter.get('/', async (_: AuthRequest, res: Response) => {
  try {
    const tasks = await query<any[]>(`
      SELECT pt.*, p.name as product_name, p.reference as product_reference,
             p.target_weight, p.tolerance_min, p.tolerance_max,
             p.units_per_pallet, p.pallet_target_weight, p.pallet_tolerance_min, p.pallet_tolerance_max,
             pl.name as line_name, u.email as operator_email
      FROM production_tasks pt
      LEFT JOIN products p ON pt.product_id = p.id
      LEFT JOIN production_lines pl ON pt.line_id = pl.id
      LEFT JOIN users u ON pt.operator_id = u.id
      ORDER BY pt.created_at DESC
    `);
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get tasks for a line
tasksRouter.get('/line/:lineId', async (req: AuthRequest, res: Response) => {
  const { lineId } = req.params;
  
  try {
    const tasks = await query<any[]>(`
      SELECT pt.*, p.name as product_name, p.reference as product_reference,
             p.target_weight, p.tolerance_min, p.tolerance_max,
             p.units_per_pallet, p.pallet_target_weight, p.pallet_tolerance_min, p.pallet_tolerance_max
      FROM production_tasks pt
      LEFT JOIN products p ON pt.product_id = p.id
      WHERE pt.line_id = ?
      ORDER BY pt.created_at DESC
    `, [lineId]);
    res.json(tasks);
  } catch (err) {
    console.error('Get tasks for line error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create task
tasksRouter.post('/', requireRole('admin', 'supervisor', 'operator'), async (req: AuthRequest, res: Response) => {
  const { line_id, product_id, target_quantity, operator_id } = req.body;

  if (!line_id || !product_id || !target_quantity) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  try {
    const id = uuidv4();
    await query(
      `INSERT INTO production_tasks (id, line_id, product_id, target_quantity, operator_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, line_id, product_id, target_quantity, operator_id || null]
    );

    res.json({ id, line_id, product_id, target_quantity, operator_id, status: 'pending' });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update task status
tasksRouter.put('/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updates: any = { status };
    
    if (status === 'in_progress') {
      updates.started_at = new Date();
      updates.operator_id = req.user?.id;
    } else if (status === 'completed' || status === 'cancelled') {
      updates.completed_at = new Date();
    }

    await query(
      `UPDATE production_tasks SET status = ?, started_at = COALESCE(?, started_at), 
       completed_at = COALESCE(?, completed_at), operator_id = COALESCE(?, operator_id) WHERE id = ?`,
      [status, updates.started_at || null, updates.completed_at || null, updates.operator_id || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update task status error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Add production item
tasksRouter.post('/:id/items', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { weight, status } = req.body;

  try {
    // Get current sequence
    const seqResult = await query<any[]>(
      'SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq FROM production_items WHERE task_id = ?',
      [id]
    );
    const sequence = parseInt(seqResult[0].next_seq);

    const itemId = uuidv4();
    await query(
      'INSERT INTO production_items (id, task_id, sequence, weight, status) VALUES (?, ?, ?, ?, ?)',
      [itemId, id, sequence, weight, status]
    );

    // Update produced quantity
    await query(
      'UPDATE production_tasks SET produced_quantity = produced_quantity + 1 WHERE id = ?',
      [id]
    );

    res.json({ id: itemId, task_id: id, sequence, weight, status });
  } catch (err) {
    console.error('Add item error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get production items for a task
tasksRouter.get('/:id/items', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const items = await query<any[]>(
      'SELECT * FROM production_items WHERE task_id = ? ORDER BY sequence DESC',
      [id]
    );
    res.json(items);
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Reopen last completed task (set back to in_progress)
tasksRouter.put('/:id/reopen', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify task exists and is completed
    const taskResult = await query<any[]>('SELECT * FROM production_tasks WHERE id = ?', [id]);
    if (!taskResult.length) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    if (taskResult[0].status !== 'completed') {
      return res.status(400).json({ error: 'Seule une tâche terminée peut être réouverte' });
    }

    await query(
      `UPDATE production_tasks SET status = 'in_progress', completed_at = NULL, operator_id = COALESCE(?, operator_id) WHERE id = ?`,
      [req.user?.id || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Reopen task error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete last production item for a task
tasksRouter.delete('/:id/items/last', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Find the last item by sequence
    const lastItem = await query<any[]>(
      'SELECT id FROM production_items WHERE task_id = ? ORDER BY sequence DESC LIMIT 1',
      [id]
    );
    if (!lastItem.length) {
      return res.status(404).json({ error: 'Aucun pesage à supprimer' });
    }

    await query('DELETE FROM production_items WHERE id = ?', [lastItem[0].id]);

    // Decrement produced_quantity
    await query(
      'UPDATE production_tasks SET produced_quantity = GREATEST(produced_quantity - 1, 0) WHERE id = ?',
      [id]
    );

    res.json({ success: true, deleted_id: lastItem[0].id });
  } catch (err) {
    console.error('Delete last item error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete task
tasksRouter.delete('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM production_items WHERE task_id = ?', [id]);
    await query('DELETE FROM production_tasks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
