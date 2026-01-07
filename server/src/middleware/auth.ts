import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isConfigured } from '../config/app-config.js';
import { query } from '../db/connection.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    
    const users = await query<any[]>(
      `SELECT u.id, u.email, ur.role 
       FROM users u 
       LEFT JOIN user_roles ur ON u.id = ur.user_id 
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    req.user = {
      id: users[0].id,
      email: users[0].email,
      role: users[0].role || 'operator'
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
  };
}
