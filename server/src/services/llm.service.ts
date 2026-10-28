import { performance } from 'perf_hooks';
import { env } from '../config/env.js';
import { QueryRequestDto, QueryResponseData } from '../schemas/query.schema.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockProvider } from './providers/mock.provider.js';
import { ILLMProvider } from './providers/provider.interface.js';

export class LlmService {
  private geminiProvider: GeminiProvider;
  private mockProvider: MockProvider;

  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.mockProvider = new MockProvider();
  }

  public getActiveProvider(): ILLMProvider {
    if (env.LLM_PROVIDER === 'mock') {
      return this.mockProvider;
    }

    if (this.geminiProvider.isAvailable()) {
      return this.geminiProvider;
    }

    console.warn(
      '⚠️ [LlmService] GEMINI_API_KEY is not configured in .env. Falling back to MockProvider for resilience.'
    );
    return this.mockProvider;
  }

  public getProviderStatus(): { provider: string; model: string; isRealApiKeyConfigured: boolean } {
    const isConfigured = this.geminiProvider.isAvailable();
    const active = this.getActiveProvider();
    return {
      provider: active.name,
      model: env.GEMINI_MODEL,
      isRealApiKeyConfigured: isConfigured,
    };
  }

  public async executeQuery(dto: QueryRequestDto): Promise<QueryResponseData> {
    const provider = this.getActiveProvider();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, env.LLM_TIMEOUT_MS);

    const startTime = performance.now();

    try {
      const result = await provider.generateResponse({
        query: dto.query,
        model: dto.model,
        temperature: dto.temperature,
        signal: abortController.signal,
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      return {
        query: dto.query,
        response: result.response,
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const llmService = new LlmService();
