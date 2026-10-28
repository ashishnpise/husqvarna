import { z } from 'zod';

export const tokenRequestSchema = z.object({
  userId: z.string().trim().min(1).default('reviewer-user'),
  role: z.enum(['admin', 'developer', 'viewer']).default('developer'),
  expiresInSeconds: z.number().int().min(1).max(86400).default(3600),
  isExpiredTest: z.boolean().default(false), // Convenience flag to issue an already-expired token for testing 401 handling
});

export type TokenRequestDto = z.infer<typeof tokenRequestSchema>;

export interface TokenResponseData {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  userId: string;
  role: string;
}
