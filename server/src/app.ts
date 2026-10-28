import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { generalRateLimiter } from './middleware/rateLimiter.middleware.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import queryRoutes from './routes/query.routes.js';

export function createApp(): Application {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows cross-origin API interactions during development
    })
  );

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: '*', // For evaluation flexibility; configurable per environment in production
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // General rate limiter for non-query routes
  app.use(generalRateLimiter);

  // Mount API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/query', queryRoutes);

  // 404 Route handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
