import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ILLMProvider, LLMRequestOptions, LLMResponseData } from './provider.interface.js';

export class MockProvider implements ILLMProvider {
  public readonly name = 'mock';

  public isAvailable(): boolean {
    return true;
  }

  public async generateResponse(options: LLMRequestOptions): Promise<LLMResponseData> {
    const delayMs = Math.floor(Math.random() * 250) + 350; // 350ms - 600ms simulation

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => resolve(), delayMs);

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new AppError(`Mock request timed out after ${env.LLM_TIMEOUT_MS}ms.`, 504, 'GATEWAY_TIMEOUT'));
        });
      }
    });

    const queryLower = options.query.toLowerCase();
    let answerText = '';

    if (queryLower.includes('automower') || queryLower.includes('epos') || queryLower.includes('gps')) {
      answerText = `### Husqvarna Automower® & EPOS™ Satellite Navigation

Husqvarna Automower® utilizing **EPOS™ (Exact Positioning Operating System)** is a breakthrough in robotic lawn care:

1. **Virtual Boundaries**: Rather than relying on physical perimeter wires buried in turf, EPOS uses high-precision RTK-GNSS (Real-Time Kinematic Global Navigation Satellite System) satellite navigation with accuracy down to **2–3 centimeters**.
2. **Reference Station**: A localized reference station communicates differential corrections via high-frequency radio or cellular IoT to the mower in real-time.
3. **Systematic Wire-Free Mowing**: Enables customizable work areas, stay-out zones (e.g., flowerbeds, patios), and variable cutting heights programmed entirely via mobile and cloud APIs.
4. **IoT Telemetry**: Continuously streams operational health, tilt sensors, battery thermals, and GPS tracking to Husqvarna Fleet Services cloud infrastructure.`;
    } else if (queryLower.includes('fleet') || queryLower.includes('iot') || queryLower.includes('cloud')) {
      answerText = `### Husqvarna Fleet Services & Cloud Edge Architecture

Husqvarna Fleet Services delivers centralized management for enterprise landscaping operations:

- **Edge Connectivity**: Commercial machinery equipped with embedded Bluetooth LE and LTE-M/NB-IoT modules publish sensor diagnostics.
- **Cloud Ingestion Pipeline**: Telemetry arrives through high-throughput MQTT/HTTPS gateways into cloud event streams for real-time processing.
- **Predictive Maintenance**: Machine learning models analyze vibration frequency and runtime hours to alert maintenance crews before component failure.
- **Geofencing & Asset Security**: Real-time GPS tracking triggers automated immobilization and security alerts if equipment breaches designated site boundaries.`;
    } else if (queryLower.includes('architecture') || queryLower.includes('gis') || queryLower.includes('microservice')) {
      answerText = `### Geospatial & Cloud Architecture Principles

Building scalable GIS and Cloud & AI applications requires resilient, distributed engineering:

1. **Decoupled Service Mesh**: Separate telemetry ingestion, geospatial indexing (e.g. PostGIS, GeoJSON caching), and LLM reasoning pipelines.
2. **Tokenized Authentication**: Enforce zero-trust JWT authentication at the API Gateway layer before traffic reaches internal microservices.
3. **Resilience Engineering**: Implement circuit breakers, timeouts with cancellation signals (\`AbortController\`), and exponential backoff retry policies for external LLM endpoints.
4. **Cloud-Native Deployment**: Containerized workloads deployed via AWS ECS Fargate with target-tracking auto-scaling across multi-AZ subnets.`;
    } else {
      answerText = `### AI Assistant Response

Thank you for your query: **"${options.query}"**

#### Analysis & Insights:
- **Query Processing**: Processed successfully via the Husqvarna AI Assistant service.
- **Provider Status**: Running in high-reliability mode with structured JSON validation and JWT security enforcement.
- **Contextual Understanding**: Your request has been parsed, validated against strict input constraints (max 2000 chars), and executed with sub-second latency.

*Note: To connect to live Google Gemini Flash API, supply a valid \`GEMINI_API_KEY\` in your \`.env\` file.*`;
    }

    const promptTokens = Math.ceil(options.query.length / 4);
    const completionTokens = Math.ceil(answerText.length / 4);

    return {
      response: answerText,
      model: options.model || 'mock-gemini-flash',
      provider: this.name,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }
}
