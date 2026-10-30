import { performance } from 'perf_hooks';
import { env } from '../config/env.js';
import { QueryRequestDto, QueryResponseData } from '../schemas/query.schema.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { ILLMProvider } from './providers/provider.interface.js';

export class LlmService {
  private geminiProvider: GeminiProvider;

  constructor() {
    this.geminiProvider = new GeminiProvider();
  }

  public getActiveProvider(): ILLMProvider {
    return this.geminiProvider;
  }

  public getProviderStatus(): { provider: string; model: string; isRealApiKeyConfigured: boolean } {
    return {
      provider: 'gemini',
      model: env.GEMINI_MODEL,
      isRealApiKeyConfigured: this.geminiProvider.isAvailable(),
    };
  }

  public async executeQuery(dto: QueryRequestDto): Promise<QueryResponseData> {
    const provider = this.geminiProvider;
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

