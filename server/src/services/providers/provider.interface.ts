export interface LLMRequestOptions {
  query: string;
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
}

export interface LLMResponseData {
  response: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateResponse(options: LLMRequestOptions): Promise<LLMResponseData>;
}
