import { createApp } from './app.js';
import { env } from './config/env.js';
import { llmService } from './services/llm.service.js';

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  const providerInfo = llmService.getProviderStatus();

  console.log(`
  ==============================================================
    🌿 Husqvarna AI Query Assistant Server
  ==============================================================
    🚀 Status:   Running in ${env.NODE_ENV.toUpperCase()} mode
    🌐 Port:     http://localhost:${env.PORT}
    🤖 Provider: ${providerInfo.provider} (${providerInfo.isRealApiKeyConfigured ? 'Live API Key Loaded' : 'Fallback Mock Mode'})
    🧠 Model:    ${providerInfo.model}
    🔒 Auth:     JWT Bearer Protected
  ==============================================================
  `);
});

// Graceful Shutdown Handlers
function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('✅ HTTP server closed. Process terminating safely.');
    process.exit(0);
  });

  // Force close after 10s if connections refuse to hang up
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
