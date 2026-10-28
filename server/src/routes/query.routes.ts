import { Router } from 'express';
import { submitQuery } from '../controllers/query.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { queryRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { queryRequestSchema } from '../schemas/query.schema.js';

const router = Router();

// Endpoint protected by JWT authentication and rate limiting
router.post('/', authMiddleware, queryRateLimiter, validateBody(queryRequestSchema), submitQuery);

export default router;
