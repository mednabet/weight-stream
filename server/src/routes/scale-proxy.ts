import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/scale-proxy
 * Proxy pour récupérer le poids depuis l'URL de la balance.
 * Évite les problèmes CORS côté navigateur.
 * Query params:
 *   - url: l'URL de la balance (ex: https://netprocess.ma/partage/poids1.txt)
 */
router.get('/', authenticate as any, async (req: Request, res: Response) => {
  const scaleUrl = req.query.url as string;

  if (!scaleUrl) {
    return res.status(400).json({ error: 'Le paramètre "url" est requis' });
  }

  // Validate URL format
  try {
    new URL(scaleUrl);
  } catch {
    return res.status(400).json({ error: 'URL invalide' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(scaleUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Balance HTTP ${response.status}` });
    }

    const text = await response.text();
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'no-store');
    return res.send(text);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout: la balance ne répond pas' });
    }
    return res.status(502).json({ error: err.message || 'Erreur de connexion à la balance' });
  }
});

export const scaleProxyRouter = router;
