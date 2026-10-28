# Husqvarna AI Query Assistant

> **Senior Full Stack Engineer – Cloud & AI Applications Evaluation Exercise**  
> **Husqvarna Group | GIS India, Navi Mumbai**

An enterprise-grade, secure, and resilient AI-powered Query Assistant web application built with **React**, **TypeScript**, **Node.js/Express**, and **Google Gemini Flash**, protected with **JWT authentication** and engineered for containerized cloud deployment.

---

## 🌟 Executive Summary & Key Highlights

This application is designed around the core evaluation criteria of code quality, clean API architecture, security awareness, and AI integration:

- **Full-Stack Type Safety**: Built entirely in **TypeScript** across both client and server layers with shared data contracts and strict compiler options.
- **Google Gemini Integration**: Native integration with Google's **Gemini Flash** (`gemini-2.5-flash`) for sub-second responses and cost efficiency, with token telemetry tracking.
- **Resilient Fallback Mode**: Features a pluggable `ILLMProvider` interface with an automatic **MockProvider fallback**. Evaluators can launch and test the complete application immediately without needing to configure or pay for an external API key.
- **JWT-Protected API**: The `/api/query` endpoint requires a valid signed JSON Web Token passed via `Authorization: Bearer <token>`.
- **Interactive Auth Manager**: The frontend includes a built-in JWT manager modal to instantly generate valid tokens, expired tokens (to test 401 handling), or clear tokens (to test unauthenticated rejection).
- **Enterprise Resilience**: Enforces request timeouts (15s via `AbortController`), input validation via `Zod`, IP rate limiting via `express-rate-limit`, and HTTP security headers via `helmet`.
- **Production Containerization**: Multi-stage, non-root `Dockerfile` for the backend with health checks.
- **Cloud Architecture Blueprint**: Complete container deployment architecture detailed in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Browser / React Frontend    │
                                  │   (Vite + TypeScript + CSS)   │
                                  └───────────────┬───────────────┘
                                                  │
                                                  │ HTTPS + Bearer JWT
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Server (Node.js / Express / TypeScript)                                                         │
│                                                                                                 │
│  ┌─────────────────────────┐     ┌─────────────────────────┐     ┌───────────────────────────┐  │
│  │   Security Headers      │ ──> │   IP Rate Limiter       │ ──> │   Express Router          │  │
│  │   (Helmet + CORS)       │     │   (express-rate-limit)  │     │                           │  │
│  └─────────────────────────┘     └─────────────────────────┘     └─────────────┬─────────────┘  │
│                                                                                │                │
│             ┌──────────────────────────────────────────────────────────────────┴─────┐          │
│             ▼                                                                        ▼          │
│   ┌────────────────────┐                                                   ┌──────────────────┐ │
│   │  /api/health       │                                                   │  /api/auth/token │ │
│   │  Health Probe      │                                                   │  JWT Generator   │ │
│   └────────────────────┘                                                   └──────────────────┘ │
│                                                                                      │          │
│                                                                                      ▼          │
│                                                   ┌───────────────────────────────────────────┐ │
│                                                   │ /api/query                                │ │
│                                                   │ 1. authMiddleware (verify JWT & claims)   │ │
│                                                   │ 2. validateBody (Zod schema constraint)   │ │
│                                                   │ 3. llmService.executeQuery()              │ │
│                                                   └─────────────────────┬─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                          │
                                       ┌──────────────────────────────────┴──────────────────────┐
                                       ▼                                                         ▼
                       ┌───────────────────────────────┐                         ┌───────────────────────────────┐
                       │ Google Gemini Flash Provider  │                         │ Offline Mock Provider         │
                       │ (Live Google GenAI SDK)       │                         │ (Deterministic Fallback)      │
                       └───────────────────────────────┘                         └───────────────────────────────┘
```

---

## 📁 Repository Structure

```
husqvarna/
├── config/                               # Central Application Configuration (Root Location)
│   ├── .env.app                          # Active environment variables (git-ignored)
│   └── .env.app.example                  # Environment configuration template
│
├── Docker/                               # Docker Containerization Assets
│   ├── Dockerfile.server                 # Multi-stage production container build for Node.js API
│   ├── Dockerfile.client                 # Multi-stage container build for React/Vite + Nginx
│   ├── nginx.conf                        # Production Nginx reverse proxy & SPA configuration
│   ├── ecs-task-definition.json          # AWS ECS Fargate task definition specification
│   └── docker-compose.yml                # Multi-container Docker Compose orchestrator
│
├── client/                               # Frontend React Application
│   ├── index.html                        # HTML5 document with Outfit/Inter typography
│   ├── package.json                      # React, Lucide-react, Vite dependencies
│   ├── tsconfig.json                     # Strict TypeScript compiler options
│   ├── vite.config.ts                    # Vite config with API reverse proxy
│   └── src/
│       ├── main.tsx                      # React root DOM mount
│       ├── App.tsx                       # Master application state & orchestration
│       ├── App.css                       # Scoped Husqvarna executive design system
│       ├── components/
│       │   ├── Header.tsx                # Status pills, model badge, auth indicator
│       │   ├── QueryInput.tsx            # Query textarea, quick prompt pills, character limits
│       │   ├── ResponseDisplay.tsx       # Markdown formatting, latency/token telemetry, copy action
│       │   ├── AuthModal.tsx             # Interactive JWT tester (valid, expired, custom)
│       │   └── ErrorAlert.tsx            # Contextual error alerts with HTTP status codes
│       ├── services/
│       │   └── api.ts                    # Typed API client with automatic Bearer token injection
│       └── types/
│           └── index.ts                  # Shared client domain models
│
├── server/                               # Backend Node.js Service
│   ├── package.json                      # Express, @google/generative-ai, Zod, JWT dependencies
│   ├── tsconfig.json                     # NodeNext TypeScript compiler options
│   └── src/
│       ├── index.ts                      # Server bootstrap & graceful shutdown hooks
│       ├── app.ts                        # Express pipeline configuration
│       ├── config/
│       │   └── env.ts                    # Loads config/.env.app with multi-path resolution
│       ├── middleware/
│       │   ├── auth.middleware.ts        # JWT extraction, signature and expiration verification
│       │   ├── validate.middleware.ts    # Zod schema validation middleware
│       │   ├── rateLimiter.middleware.ts # IP request throttling
│       │   └── error.middleware.ts       # Centralized error mapping and sanitized responses
│       ├── schemas/
│       │   ├── query.schema.ts           # Query input/output validation contracts
│       │   └── auth.schema.ts            # Auth token generation contracts
│       ├── routes/
│       │   ├── health.routes.ts          # Public /api/health probe
│       │   ├── auth.routes.ts            # Public /api/auth/token minting endpoint
│       │   └── query.routes.ts           # Protected /api/query endpoint
│       ├── controllers/
│       │   ├── health.controller.ts      # Health check controller
│       │   ├── auth.controller.ts        # Test JWT issuer controller
│       │   └── query.controller.ts       # Query execution coordinator
│       └── services/
│           ├── llm.service.ts            # Timeout controller, latency stopwatch, provider resolver
│           └── providers/
│               ├── provider.interface.ts # Pluggable ILLMProvider contract
│               ├── gemini.provider.ts    # Google Gemini Flash implementation
│               └── mock.provider.ts      # Offline fallback provider with Husqvarna domain knowledge
│
├── README.md                             # Project overview, setup, and architectural decisions
└── DEPLOYMENT.md                         # Production cloud container deployment blueprint (AWS ECS Fargate)
```

---

## 🛠️ Technology Stack & Rationale

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Industry standard for enterprise SPAs. Vite delivers sub-second HMR; TypeScript ensures compile-time contract enforcement with the backend. |
| **Styling** | Vanilla CSS Design System | High-performance, tailored Husqvarna executive dark theme with zero CSS framework bloat, glassmorphism, and smooth CSS keyframe animations. |
| **Backend** | Node.js 22 LTS + Express + TypeScript | Unified language across the stack; asynchronous non-blocking event loop ideal for I/O-bound LLM network operations; NodeNext module resolution. |
| **Validation** | Zod | Runtime schema validation for untrusted inputs (`req.body` and environment variables), eliminating unexpected parsing exceptions. |
| **Auth** | JSON Web Tokens (`jsonwebtoken`) | Stateless authentication with cryptographic signature verification (`HS256`), configurable expiration, and custom user claims. |
| **AI / LLM** | Google Gemini Flash (`@google/generative-ai`) | High throughput, low latency, cost-effective inference with accurate token consumption metadata and streaming support. |
| **Container** | Docker Multi-Stage | Builder stage produces clean build artifacts; runner stage operates as a non-privileged `node` user on Alpine Linux with minimal footprint. |

---

## ⚙️ Setup & Local Execution

### 1. Prerequisites
- **Node.js**: Version 20.x or higher
- **npm**: Version 9.x or higher

### 2. Environment Configuration
The application centralizes configuration in the root `config/` directory. Create your `.env.app` by copying the template:
```bash
cp config/.env.app.example config/.env.app
```

Edit `config/.env.app` to configure your settings:
```ini
PORT=5001
NODE_ENV=development
JWT_SECRET=husqvarna-gis-eval-jwt-secret-key-2026-secure

# Optional: Google Gemini API Key from https://aistudio.google.com/
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER=gemini
LLM_TIMEOUT_MS=15000

CLIENT_PORT=3000
VITE_API_URL=http://localhost:5001
```
> **Note**: If `GEMINI_API_KEY` is not provided, the application will automatically run in **Mock Mode**, answering queries about Husqvarna Automower, EPOS, IoT telemetry, and cloud architecture without error.

### 3. Backend Setup & Startup
Navigate to the `server/` directory:
```bash
cd server
npm install
npm run dev
```
The server will start at `http://localhost:5001` with a console startup banner.

### 4. Frontend Setup & Startup
In a separate terminal, navigate to the `client/` directory:
```bash
cd client
npm install
npm run dev
```
The client will start at `http://localhost:3000` with hot-module replacement and proxy configured to route `/api/*` to the backend.

---

## 🔒 Authentication & Error Handling

### Testing Authentication Scenarios
The application provides an interactive **JWT Manager** (click the auth badge in the header):
1. **Valid Auth (200 OK)**: Click **"Mint Valid Token"** to issue a fresh JWT signed with `JWT_SECRET` valid for 1 hour.
2. **Expired Token (401 Unauthorized)**: Click **"Mint Expired Token"** to issue a backdated JWT. Submitting a query will trigger a `TOKEN_EXPIRED` error banner.
3. **Missing Auth (401 Unauthorized)**: Click **"Clear Token"** to remove the header. Submitting a query will trigger a `MISSING_AUTHORIZATION_HEADER` error banner.
4. **Custom Token**: Paste any custom token into the modal to test external validation.

### Error Handling Matrix
| Status Code | Error Code | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Empty query or query exceeding 2000 characters |
| `401 Unauthorized` | `MISSING_AUTHORIZATION_HEADER` | Missing `Authorization: Bearer <token>` |
| `401 Unauthorized` | `TOKEN_EXPIRED` | Expired JWT timestamp |
| `401 Unauthorized` | `INVALID_TOKEN` | Corrupted token or invalid cryptographic signature |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Exceeded 30 queries per minute per IP |
| `502 Bad Gateway` | `UPSTREAM_PROVIDER_ERROR` | Gemini API network failure or invalid API key |
| `504 Gateway Timeout` | `GATEWAY_TIMEOUT` | External LLM call exceeded `LLM_TIMEOUT_MS` (15s) |

---

## 🐳 Containerization (Docker & Docker Compose)

The application provides a unified multi-container stack orchestrated via Docker Compose:

### 1. Run Complete Stack (Backend API + Frontend Client)
From the project root:
```bash
# Build and run backend and frontend containers
docker compose -f Docker/docker-compose.yml up --build

# Stop the stack
docker compose -f Docker/docker-compose.yml down
```
*(Alternatively, navigate to `cd Docker` and run `docker compose up --build`)*
- **Backend API**: Accessible at `http://localhost:5001` with container health checks (`/api/health`).
- **Frontend Client**: Accessible at `http://localhost:3000` served via high-performance Nginx with built-in API reverse proxy.

### 2. Standalone Container Builds
You can also build individual containers independently:
```bash
# Build backend container
docker build -f Docker/Dockerfile.server -t husqvarna-backend .

# Build frontend container
docker build -f Docker/Dockerfile.client -t husqvarna-frontend .
```

---

## ☁️ Cloud Deployment (Amazon Web Services)

The production infrastructure is engineered exclusively for **Amazon Web Services (AWS)** using **AWS ECS Fargate**, **Application Load Balancer (ALB)**, **Amazon CloudFront**, **AWS WAF**, **Amazon S3**, **AWS Secrets Manager**, and **Amazon CloudWatch**.

For complete architecture diagrams, VPC subnet topologies, task definitions, security groups, auto-scaling policies, and AWS CLI runbooks, refer to the comprehensive guide:
👉 [`DEPLOYMENT.md`](./DEPLOYMENT.md)
