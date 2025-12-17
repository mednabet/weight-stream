import express from 'express';
import cors from 'cors';
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
import { initPoolFromConfig, isPoolReady } from './db/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/setup', setupRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/lines', linesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/terminals', terminalsRouter);
app.use('/api/weight-units', weightUnitsRouter);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
