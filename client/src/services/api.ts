import { ApiResponse, HealthStatus, QueryResponseData, TokenResponse } from '../types/index.ts';

const TOKEN_STORAGE_KEY = 'husqvarna_jwt_token';

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  remove(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

export class ApiService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach JWT Bearer token if present
    const token = tokenStorage.get();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network connection failure';
      throw new Error(`Unable to reach server: ${msg}`);
    }

    let body: ApiResponse<T>;
    try {
      body = await response.json();
    } catch {
      throw new Error(`Server returned HTTP ${response.status} with non-JSON response.`);
    }

    if (!response.ok || !body.success) {
      const errorMessage = body.error?.message || `Request failed with HTTP status ${response.status}`;
      const error = new Error(errorMessage);
      (error as unknown as { code?: string; status?: number; details?: unknown }).code = body.error?.code;
      (error as unknown as { code?: string; status?: number; details?: unknown }).status = response.status;
      (error as unknown as { code?: string; status?: number; details?: unknown }).details = body.error?.details;
      throw error;
    }

    return body.data as T;
  }

  public static async getHealth(): Promise<HealthStatus> {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    return (await response.json()) as HealthStatus;
  }

  public static async mintToken(isExpiredTest = false): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'reviewer-user',
        role: 'developer',
        expiresInSeconds: 3600,
        isExpiredTest,
      }),
    });
  }

  public static async sendQuery(query: string, model?: string): Promise<QueryResponseData> {
    return this.request<QueryResponseData>('/api/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...(model ? { model } : {}),
      }),
    });
  }
}
