import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

// Get all users (admin/supervisor only)
usersRouter.get('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await query<any[]>(`
      SELECT u.id, u.email, u.is_active, u.created_at, ur.role 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      ORDER BY u.created_at DESC
    `);

    // Filter for supervisors - only show operators
    if (req.user?.role === 'supervisor') {
      const filtered = users.filter(u => u.role === 'operator');
      return res.json(filtered);
    }

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create user (admin/supervisor only)
usersRouter.post('/', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Supervisors can only create operators
  if (req.user?.role === 'supervisor' && role !== 'operator') {
    return res.status(403).json({ error: 'Vous ne pouvez créer que des opérateurs' });
  }

  // Only admins can create admins
  if (role === 'admin' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Seuls les admins peuvent créer des admins' });
  }

  try {
    const existing = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, passwordHash]
    );

    await query(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [uuidv4(), userId, role || 'operator']
    );

    res.json({ id: userId, email, role: role || 'operator' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update user role (admin only)
usersRouter.put('/:id/role', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
  }

  try {
    await query(
      'UPDATE user_roles SET role = ? WHERE user_id = ?',
      [role, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Toggle user status
usersRouter.put('/:id/status', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut' });
  }

  try {
    await query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Reset password (admin/supervisor)
usersRouter.put('/:id/password', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe minimum 6 caractères' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete user
usersRouter.delete('/:id', requireRole('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }

  try {
    await query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
