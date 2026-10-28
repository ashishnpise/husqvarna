import { Request, Response } from 'express';
import { llmService } from '../services/llm.service.js';

export function getHealth(req: Request, res: Response): void {
  const providerInfo = llmService.getProviderStatus();

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    provider: providerInfo.provider,
    model: providerInfo.model,
    realApiKeyConfigured: providerInfo.isRealApiKeyConfigured,
    version: '1.0.0',
  });
}
