import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validatePassword, validateLogin } from '../middleware/validation.js';

export const authRouter = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 8) {
    throw new Error('JWT_SECRET is not configured properly');
  }
  return secret;
}

// Login — accepts simple identifier (login) + password
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email: login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  try {
    const users = await query<any[]>(
      'SELECT id, email, password_hash, is_active FROM users WHERE email = ?',
      [login]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const user = users[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Compte désactivé' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const roles = await query<any[]>(
      "SELECT role FROM user_roles WHERE user_id = ? ORDER BY FIELD(role, 'admin', 'supervisor', 'operator') LIMIT 1",
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    res.json({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: roles[0]?.role || 'operator'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Signup (only for initial admin setup — disabled after first admin exists)
authRouter.post('/signup', async (req: Request, res: Response) => {
  const { email: login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  // Validate login format (simple identifier, min 2 chars)
  const loginValidation = validateLogin(login);
  if (!loginValidation.valid) {
    return res.status(400).json({ error: loginValidation.error });
  }

  // Validate password (min 3 chars)
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  try {
    // Check if any admin exists — if so, block public signup
    const admins = await query<any[]>(
      "SELECT COUNT(*) as count FROM user_roles WHERE role = 'admin'"
    );

    const adminCount = parseInt(admins[0].count);

    if (adminCount > 0) {
      return res.status(403).json({
        error: 'L\'inscription publique est désactivée. Contactez un administrateur pour créer un compte.'
      });
    }

    const existing = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [login]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Identifiant déjà utilisé' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, login, passwordHash]
    );

    // First user becomes admin
    await query(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [uuidv4(), userId, 'admin']
    );

    const token = jwt.sign(
      { userId },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    res.json({
      access_token: token,
      user: { id: userId, email: login, role: 'admin' }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Logout (client-side token removal)
authRouter.post('/logout', (_, res: Response) => {
  res.json({ success: true });
});
