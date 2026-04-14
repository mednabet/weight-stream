import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/connection.js';
import { isPoolReady } from '../db/connection.js';

const router = Router();

/**
 * GET /api/scale-proxy
 * Proxy pour récupérer le poids depuis l'URL de la balance.
 * Évite les problèmes CORS côté navigateur.
 * 
 * SÉCURITÉ: Seules les URLs configurées dans les lignes de production sont autorisées.
 * 
 * Query params:
 *   - url: l'URL de la balance (doit correspondre à une URL configurée dans une ligne)
 */
router.get('/', authenticate as any, async (req: Request, res: Response) => {
  const scaleUrl = req.query.url as string;

  if (!scaleUrl) {
    return res.status(400).json({ error: 'Le paramètre "url" est requis' });
  }

  // Validate URL format
  try {
    const parsed = new URL(scaleUrl);
    // Block internal/private URLs
    const blockedProtocols = ['file:', 'ftp:', 'data:', 'javascript:'];
    if (blockedProtocols.includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Protocole non autorisé' });
    }
  } catch {
    return res.status(400).json({ error: 'URL invalide' });
  }

  // Verify the URL is configured in a production line (whitelist approach)
  if (isPoolReady()) {
    try {
      const lines = await query<any[]>(
        'SELECT scale_url, pallet_scale_url FROM production_lines WHERE is_active = TRUE'
      );
      const allowedUrls = lines
        .flatMap(l => [l.scale_url, l.pallet_scale_url])
        .filter(Boolean)
        .map(u => u.trim());

      if (!allowedUrls.includes(scaleUrl.trim())) {
        return res.status(403).json({ error: 'URL de balance non autorisée. Configurez-la dans une ligne de production.' });
      }
    } catch {
      // If DB check fails, allow the request (graceful degradation)
    }
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
