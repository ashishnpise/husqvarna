import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Resolve module directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root workspace directory calculation (server/src/config -> root)
const rootDir = path.resolve(__dirname, '../../..');

// Prioritized search paths for the .env.app configuration
const candidateEnvPaths = [
  process.env.ENV_FILE,
  path.resolve(rootDir, 'config/.env.app'),
  path.resolve(process.cwd(), 'config/.env.app'),
  path.resolve(process.cwd(), '../config/.env.app'),
  path.resolve(process.cwd(), '.env.app'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
].filter((p): p is string => Boolean(p && fs.existsSync(p)));

if (candidateEnvPaths.length > 0) {
  dotenv.config({ path: candidateEnvPaths[0] });
} else {
  dotenv.config();
}

const envSchema = z.object({
  PORT: z
    .string()
    .default('5001')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters for security')
    .default('husqvarna-gis-eval-jwt-secret-key-2026-secure'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  LLM_PROVIDER: z.enum(['gemini', 'mock']).default('gemini'),
  LLM_TIMEOUT_MS: z
    .string()
    .default('15000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1000, {
      message: 'LLM_TIMEOUT_MS must be at least 1000ms',
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
