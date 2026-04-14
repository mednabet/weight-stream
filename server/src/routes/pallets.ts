import { Router, Request, Response } from 'express';
import { getPool } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const palletsRouter = Router();

// All routes require authentication
palletsRouter.use(authenticate as any);

// Generate ticket number: PLT-YYYYMMDD-XXXX
function generateTicketNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PLT-${date}-${rand}`;
}

// GET /pallets/task/:taskId — Get all pallets for a task
palletsRouter.get('/task/:taskId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.*, u.email as operator_email
       FROM pallets p
       LEFT JOIN users u ON p.operator_id = u.id
       WHERE p.task_id = ?
       ORDER BY p.pallet_number ASC`,
      [req.params.taskId]
    );
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching pallets:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /pallets/task/:taskId/summary — Get pallet summary (rapprochement)
palletsRouter.get('/task/:taskId/summary', async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    // Get task info with product details
    const [taskRows]: any = await pool.query(
      `SELECT t.*, p.name as product_name, p.reference as product_reference,
              p.units_per_pallet, p.target_weight, p.pallet_target_weight,
              p.pallet_tolerance_min, p.pallet_tolerance_max
       FROM production_tasks t
       JOIN products p ON t.product_id = p.id
       WHERE t.id = ?`,
      [req.params.taskId]
    );

    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }

    const task = taskRows[0];

    // Get conforming items count
    const [itemsRows]: any = await pool.query(
      `SELECT COUNT(*) as total_items,
              SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) as conforme_items,
              SUM(CASE WHEN status = 'non_conforme' THEN 1 ELSE 0 END) as non_conforme_items
       FROM production_items
       WHERE task_id = ?`,
      [req.params.taskId]
    );

    // Get pallets summary
    const [palletRows]: any = await pool.query(
      `SELECT COUNT(*) as total_pallets,
              SUM(units_count) as total_palletized_units,
              SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) as conforme_pallets,
              SUM(CASE WHEN status = 'non_conforme' THEN 1 ELSE 0 END) as non_conforme_pallets,
              SUM(weight) as total_pallet_weight
       FROM pallets
       WHERE task_id = ?`,
      [req.params.taskId]
    );

    const items = itemsRows[0];
    const pallets = palletRows[0];

    const conformeItems = parseInt(items.conforme_items) || 0;
    const totalPalletizedUnits = parseInt(pallets.total_palletized_units) || 0;
    const remainingToCondition = conformeItems - totalPalletizedUnits;
    const expectedPallets = task.units_per_pallet > 0 
      ? Math.ceil(conformeItems / task.units_per_pallet) 
      : 0;

    res.json({
      task: {
        id: task.id,
        product_name: task.product_name,
        product_reference: task.product_reference,
        units_per_pallet: task.units_per_pallet || 1,
        pallet_target_weight: task.pallet_target_weight ? parseFloat(task.pallet_target_weight) : null,
        pallet_tolerance_min: task.pallet_tolerance_min ? parseFloat(task.pallet_tolerance_min) : null,
        pallet_tolerance_max: task.pallet_tolerance_max ? parseFloat(task.pallet_tolerance_max) : null,
      },
      production: {
        total_items: parseInt(items.total_items) || 0,
        conforme_items: conformeItems,
        non_conforme_items: parseInt(items.non_conforme_items) || 0,
      },
      conditioning: {
        total_pallets: parseInt(pallets.total_pallets) || 0,
        conforme_pallets: parseInt(pallets.conforme_pallets) || 0,
        non_conforme_pallets: parseInt(pallets.non_conforme_pallets) || 0,
        total_palletized_units: totalPalletizedUnits,
        total_pallet_weight: pallets.total_pallet_weight ? parseFloat(pallets.total_pallet_weight) : 0,
        remaining_to_condition: remainingToCondition,
        expected_pallets: expectedPallets,
      },
    });
  } catch (err: any) {
    console.error('Error fetching pallet summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /pallets — Add a new pallet
palletsRouter.post('/', requireRole('operator', 'supervisor', 'admin'), async (req: Request, res: Response) => {
  try {
    const { task_id, units_count, weight, status, notes } = req.body;
    const operatorId = (req as any).user?.userId;

    if (!task_id || !units_count || weight === undefined || !status) {
      return res.status(400).json({ error: 'task_id, units_count, weight et status sont requis' });
    }

    if (!['conforme', 'non_conforme'].includes(status)) {
      return res.status(400).json({ error: 'Le statut doit être "conforme" ou "non_conforme"' });
    }

    const pool = getPool();

    // Get current pallet count for sequence
    const [countRows]: any = await pool.query(
      'SELECT COUNT(*) as count FROM pallets WHERE task_id = ?',
      [task_id]
    );
    const palletNumber = parseInt(countRows[0].count) + 1;

    // Generate unique ticket number
    let ticketNumber = generateTicketNumber();
    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
      const [existing]: any = await pool.query(
        'SELECT id FROM pallets WHERE ticket_number = ?',
        [ticketNumber]
      );
      if (existing.length === 0) break;
      ticketNumber = generateTicketNumber();
      attempts++;
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO pallets (id, task_id, pallet_number, ticket_number, units_count, weight, status, operator_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, task_id, palletNumber, ticketNumber, units_count, weight, status, operatorId || null, notes || null]
    );

    // Fetch the created pallet
    const [newPallet]: any = await pool.query(
      `SELECT p.*, u.email as operator_email
       FROM pallets p
       LEFT JOIN users u ON p.operator_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    res.status(201).json(newPallet[0]);
  } catch (err: any) {
    console.error('Error creating pallet:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /pallets/:id — Delete a pallet
palletsRouter.delete('/:id', requireRole('supervisor', 'admin'), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM pallets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Palette supprimée' });
  } catch (err: any) {
    console.error('Error deleting pallet:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /pallets/:id/ticket — Get ticket data for a pallet
palletsRouter.get('/:id/ticket', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows]: any = await pool.query(
      `SELECT p.*, 
              u.email as operator_email,
              t.id as task_id,
              pr.name as product_name, pr.reference as product_reference,
              pr.units_per_pallet,
              l.name as line_name
       FROM pallets p
       LEFT JOIN users u ON p.operator_id = u.id
       JOIN production_tasks t ON p.task_id = t.id
       JOIN products pr ON t.product_id = pr.id
       JOIN production_lines l ON t.line_id = l.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Palette introuvable' });
    }

    const pallet = rows[0];
    res.json({
      ticket_number: pallet.ticket_number,
      pallet_number: pallet.pallet_number,
      date: pallet.created_at,
      line_name: pallet.line_name,
      product_name: pallet.product_name,
      product_reference: pallet.product_reference,
      units_count: pallet.units_count,
      units_per_pallet: pallet.units_per_pallet,
      weight: parseFloat(pallet.weight),
      status: pallet.status,
      operator: pallet.operator_email,
      notes: pallet.notes,
    });
  } catch (err: any) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ error: err.message });
  }
});
