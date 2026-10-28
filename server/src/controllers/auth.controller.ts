import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { TokenRequestDto, TokenResponseData } from '../schemas/auth.schema.js';

export function createToken(req: Request, res: Response): void {
  const body = req.body as TokenRequestDto;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // If testing expired token scenario, backdate expiration to 60 seconds ago
  const expiresIn = body.isExpiredTest ? -60 : body.expiresInSeconds || 3600;

  const payload = {
    userId: body.userId || 'reviewer-user',
    role: body.role || 'developer',
    iss: 'husqvarna-ai-query-assistant',
    iat: nowInSeconds,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
  });

  const responseData: TokenResponseData = {
    token,
    tokenType: 'Bearer',
    expiresInSeconds: body.isExpiredTest ? 0 : expiresIn,
    userId: payload.userId,
    role: payload.role,
  };

  res.status(200).json({
    success: true,
    data: responseData,
  });
}
