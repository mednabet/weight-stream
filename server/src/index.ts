import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { productsRouter } from './routes/products.js';
import { linesRouter } from './routes/lines.js';
import { tasksRouter } from './routes/tasks.js';
import { terminalsRouter } from './routes/terminals.js';
import { weightUnitsRouter } from './routes/weight-units.js';
import { initDatabase } from './db/init.js';
import { setupRouter } from './routes/setup.js';
import { scaleProxyRouter } from './routes/scale-proxy.js';
import { palletsRouter } from './routes/pallets.js';
import { initPoolFromConfig, isPoolReady } from './db/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (required for rate-limit behind Nginx/reverse proxy)
app.set('trust proxy', 1);

// ─── Security: Require JWT_SECRET in production ───
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters in production.');
  console.error('Generate one with: openssl rand -base64 64');
  process.exit(1);
}

// ─── Helmet: Security headers ───
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA serving
  crossOriginEmbedderPolicy: false,
}));

// ─── Rate limiting ───
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ─── CORS ───
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin && origin !== '*'); // Strip wildcards

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production with no CORS_ORIGIN configured, allow same-origin requests
    // (frontend served by same Express server)
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // In development, allow localhost origins
    if (!isProduction && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }

    // In development, allow manus.computer proxy domains
    if (!isProduction && origin.includes('manus.computer')) {
      return callback(null, true);
    }

    // Reject all other origins
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Limit body size

// ─── Routes ───
app.use('/api/setup', setupRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/lines', linesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/terminals', terminalsRouter);
app.use('/api/weight-units', weightUnitsRouter);
app.use('/api/scale-proxy', scaleProxyRouter);
app.use('/api/pallets', palletsRouter);

// Health check
app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    database: isPoolReady() ? 'connected' : 'not_configured',
  });
});

// ─── Serve frontend static files in production ───
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../dist');

// Serve static assets (JS, CSS, images, etc.)
app.use(express.static(frontendDist));

// SPA fallback: all non-API routes serve index.html
app.get('*', (_req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend not built. Run: npm run build' });
    }
  });
});

// ─── Global error handler ───
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// Initialize pool (if config exists) and start server
(async () => {
  try {
    await initPoolFromConfig();
    if (isPoolReady()) {
      await initDatabase();
    } else {
      console.log('Database not configured yet. Setup is required at /setup');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
