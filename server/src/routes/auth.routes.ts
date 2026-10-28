import { Router } from 'express';
import { createToken } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { tokenRequestSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/token', validateBody(tokenRequestSchema), createToken);

export default router;
