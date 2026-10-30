import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { HUSQVARNA_SYSTEM_PROMPT } from '../../config/husqvarna-knowledge.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ILLMProvider, LLMRequestOptions, LLMResponseData } from './provider.interface.js';

export class GeminiProvider implements ILLMProvider {
  public readonly name = 'gemini';
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
    }
  }

  public isAvailable(): boolean {
    return this.client !== null;
  }

  public async generateResponse(options: LLMRequestOptions): Promise<LLMResponseData> {
    if (!this.client) {
      throw new AppError(
        'Gemini API key is not configured. Please supply GEMINI_API_KEY in config/.env.app.',
        502,
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    const modelName = options.model || env.GEMINI_MODEL || 'gemini-3.5-flash';

    try {
      const generativeModel = this.client.getGenerativeModel({
        model: modelName,
        systemInstruction: HUSQVARNA_SYSTEM_PROMPT,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
        },
      });

      // Pass AbortSignal via requestOptions
      const result = await generativeModel.generateContent(
        {
          contents: [{ role: 'user', parts: [{ text: options.query }] }],
        },
        { signal: options.signal }
      );

      const response = await result.response;
      const text = response.text();

      // Extract usage metadata if provided by Gemini API
      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount ?? Math.ceil(options.query.length / 4);
      const completionTokens = usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);
      const totalTokens = usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

      return {
        response: text,
        model: modelName,
        provider: this.name,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err: unknown) {
      // Check if aborted due to timeout
      if (options.signal?.aborted || (err as { name?: string })?.name === 'AbortError') {
        throw new AppError(
          `Request to Google Gemini timed out after ${env.LLM_TIMEOUT_MS}ms.`,
          504,
          'GATEWAY_TIMEOUT'
        );
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown Gemini API error';
      console.error('[GeminiProvider Error]', errorMessage);

      throw new AppError(
        `Gemini API upstream error: ${errorMessage}`,
        502,
        'UPSTREAM_PROVIDER_ERROR',
        { originalError: errorMessage }
      );
    }
  }
}
