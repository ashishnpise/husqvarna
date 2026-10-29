import { env } from '../../config/env.js';
import {
  HUSQVARNA_OFF_TOPIC_RESPONSE,
  isHusqvarnaRelatedQuery,
} from '../../config/husqvarna-knowledge.js';
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

    // Guardrail: Reject off-topic / unnecessary queries
    if (!isHusqvarnaRelatedQuery(options.query)) {
      answerText = HUSQVARNA_OFF_TOPIC_RESPONSE;
    } else if (
      queryLower.includes('svartpilen') ||
      queryLower.includes('vitpilen') ||
      queryLower.includes('401') ||
      queryLower.includes('250') ||
      queryLower.includes('model') ||
      queryLower.includes('feature') ||
      queryLower.includes('difference')
    ) {
      answerText = `### Husqvarna Motorcycles India: Svartpilen 401 vs. Vitpilen 250

Fashioned in the footsteps of their iconic 1955 predecessor—the classic **Silverpilen**—Husqvarna Motorcycles offers two versatile siblings in India:

#### 1. Svartpilen 401 ("Escape The Ordinary")
- **Category & Styling**: Dynamic urban explorer inspired by authentic scrambler heritage. Dark, rugged, and purposeful stance.
- **Riding Ergonomics**: Upright, commanding handlebar position designed for both dense metropolitan traffic and unpredictable terrain.
- **Key Details**: Rugged spoked wheels, dual-purpose tires, high ground clearance, signature round LED headlight with integrated daytime running light (DRL) ring.
- **Spirit**: Where raw urban street style seamlessly converges with off-road adventure roots.

#### 2. Vitpilen 250 ("Disrupt The Ordinary")
- **Category & Styling**: Dynamic urban roadster embodying Scandinavian brutal simplicity and progressive neo-retro café roadster aesthetics.
- **Riding Ergonomics**: Athletic, forward-biased clip-on roadster posture designed for laser-sharp apex handling and high agility.
- **Key Details**: Crisp white-and-silver bodywork, lightweight cast alloy wheels, clean aerodynamic contours, and ultra-responsive single-cylinder powerplant.
- **Spirit**: The Swedish "White Arrow" built for precision cornering and effortless exploration through city corridors.

*Both motorcycles are manufactured and supported across India through Husqvarna's strategic partnership with **Bajaj Auto Ltd.***`;
    } else if (
      queryLower.includes('gis') ||
      queryLower.includes('global information services') ||
      queryLower.includes('cloud') ||
      queryLower.includes('architecture') ||
      queryLower.includes('fargate') ||
      queryLower.includes('ecs') ||
      queryLower.includes('jwt') ||
      queryLower.includes('navi mumbai')
    ) {
      answerText = `### Husqvarna Group GIS (Global Information Services) India, Navi Mumbai

Husqvarna Group's **Global Information Services (GIS)** division operates its premier digital and cloud engineering competence hub in **Navi Mumbai, India**:

1. **Strategic Role**: GIS drives global IT strategy, digital engineering, and resilient cloud infrastructure across all Husqvarna Group divisions.
2. **Cloud-Native Architecture (AWS ECS Fargate)**:
   - Workloads are fully containerized and orchestrated serverlessly via **AWS ECS Fargate**, eliminating VM maintenance overhead.
   - Microservices are deployed inside a dedicated multi-AZ Virtual Private Cloud (VPC) with automated Target Tracking auto-scaling.
   - Outbound egress to external LLM providers (e.g., Google Gemini Flash) routes securely through dual NAT Gateways.
3. **Enterprise Defense & Zero-Trust Security**:
   - Zero-trust authentication via signed **JSON Web Tokens (JWT)** passed over \`Authorization: Bearer <token>\`.
   - Strict runtime payload verification using **Zod** schema contracts, mitigating injection risks.
   - Protective perimeter hardening with **Helmet** HTTP security headers and IP rate limiting (\`express-rate-limit\`).
4. **AI & Data Engineering**: High-throughput conversational query assistant APIs combining real-time token telemetry with intelligent deterministic resilience fallbacks.`;
    } else if (
      queryLower.includes('heritage') ||
      queryLower.includes('history') ||
      queryLower.includes('swedish') ||
      queryLower.includes('1903') ||
      queryLower.includes('huskvarna') ||
      queryLower.includes('silverpilen')
    ) {
      answerText = `### Husqvarna Motorcycles — Swedish Since 1903

- **The Town of Huskvarna**: The journey began in 1903 in the picturesque Swedish town of Huskvarna. Over 120 years later, that craftsmanship has matured into a celebrated global legacy of motorcycle innovation.
- **The Modern Classic Philosophy**: A harmony of two radical schools of thought—**Modern** and **Classic**. Husqvarna motorcycles blend iconic vintage design lines with cutting-edge electronics and dynamic performance.
- **The Classic Silverpilen**: In 1955, Husqvarna revolutionized motorcycling with the lightweight and agile **Silverpilen** (Silver Arrow). Today's **Svartpilen** (Black Arrow) and **Vitpilen** (White Arrow) proudly advance that pioneering DNA into the modern era.`;
    } else if (
      queryLower.includes('book') ||
      queryLower.includes('showroom') ||
      queryLower.includes('e-showroom') ||
      queryLower.includes('test ride') ||
      queryLower.includes('bajaj') ||
      queryLower.includes('enquiry')
    ) {
      answerText = `### Husqvarna Motorcycles India: Bookings, Showroom & Dealer Network

- **3D e-Showroom**: Explore both Svartpilen 401 and Vitpilen 250 in complete 360-degree high-definition 3D at \`husqvarnamotorcyclesindia.com/husqvarna-eshowroom\`.
- **Online Booking**: Reserve your motorcycle directly online via the official portal (\`/buy-now\`).
- **Test Rides & Enquiries**: Available across authorized KTM / Husqvarna dealership showrooms in all major Indian cities.
- **Manufacturing & Support**: Made in India at Bajaj Auto's advanced Chakan / Akurdi facility in Pune, Maharashtra, ensuring comprehensive parts availability and factory service standards.`;
    } else {
      answerText = `### Husqvarna Motorcycles & GIS Assistant

Welcome! I am the specialized AI Assistant for **Husqvarna Motorcycles India** and **Husqvarna Group GIS (Global Information Services) India, Navi Mumbai**.

#### What you can ask me:
1. **Motorcycles Lineup**: Details and specifications on **Svartpilen 401** ("Escape The Ordinary") and **Vitpilen 250** ("Disrupt The Ordinary").
2. **Brand Heritage**: Swedish origins since 1903, the town of Huskvarna, and the legendary 1955 Silverpilen.
3. **GIS India Cloud & AI Architecture**: AWS ECS Fargate serverless infrastructure, JWT authentication, and resilient API microservices.
4. **Customer Services**: 3D e-Showroom, Bajaj Auto partnership, bookings, and test rides in India.

*Note: Unrelated questions outside this scope are automatically restricted to preserve high domain fidelity.*`;
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
