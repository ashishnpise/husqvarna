import { z } from 'zod';

export const queryRequestSchema = z.object({
  query: z
    .string({
      required_error: 'Query string is required',
    })
    .trim()
    .min(1, 'Query cannot be empty')
    .max(2000, 'Query cannot exceed 2000 characters'),
  model: z.string().trim().min(1).max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type QueryRequestDto = z.infer<typeof queryRequestSchema>;

export interface QueryUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface QueryResponseData {
  query: string;
  response: string;
  model: string;
  provider: string;
  usage: QueryUsageStats;
  latencyMs: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
