import dotenv from 'dotenv';
dotenv.config();

import { validateEnv } from './lib/env';
validateEnv();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';

import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import { env } from './lib/env';
import { logger } from './lib/logger';
import { redisConnection } from './lib/queue';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import chatRoutes from './modules/chat/chat.routes';
import documentRoutes from './modules/document/document.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import cannedRoutes from './modules/canned/canned.routes';

import { initSocket } from './lib/socket';
import './workers/aggregation.worker';
import './workers/ingestion.worker';
import './workers/event.worker';

const app = express();
const httpServer = createServer(app);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-request-id'],
  credentials: true,
}));

// Request ID
app.use(requestIdMiddleware);

// Request logging
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => (req.url || '').startsWith('/api/health'),
  },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Initialize Socket.io
initSocket(httpServer);

// Health check
const prisma = new PrismaClient();

app.get('/api/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  try {
    await redisConnection.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = checks.db === 'ok' && checks.redis === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/canned', cannedRoutes);

// Error handler
app.use(errorHandler);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully...');

  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (e) {
    logger.error({ err: e }, 'Error disconnecting database');
  }

  try {
    await redisConnection.quit();
    logger.info('Redis disconnected');
  } catch (e) {
    logger.error({ err: e }, 'Error disconnecting Redis');
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Multi-tenant RAG backend started');
  logger.info('Real-time enabled with Socket.io');
});
