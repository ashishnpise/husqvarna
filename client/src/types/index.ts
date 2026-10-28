export interface QueryUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface QueryResponseData {
  query: string;
  response: string;
  model: string;
  provider: string;
  usage: QueryUsage;
  latencyMs: number;
  timestamp: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
}

export interface TokenResponse {
  token: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  role: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  provider: string;
  model: string;
  realApiKeyConfigured: boolean;
  version: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  response: string;
  model: string;
  provider: string;
  latencyMs: number;
  timestamp: string;
}
