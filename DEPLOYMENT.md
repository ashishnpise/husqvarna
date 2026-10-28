# AWS Cloud Container Deployment Architecture

> **Senior Full Stack Engineer – Cloud & AI Applications Evaluation Exercise**  
> **Husqvarna Group | GIS India, Navi Mumbai**

This document details the production cloud deployment strategy for the **Husqvarna AI Query Assistant** web application using Docker containers exclusively architected on **Amazon Web Services (AWS)**.

---

## 1. Architectural Overview & AWS Cloud Topology

The application is deployed as a decoupled, resilient, and containerized micro-architecture on AWS. Static single-page application (SPA) assets are distributed globally via **Amazon CloudFront** backed by **Amazon S3** with **Origin Access Control (OAC)**, while the Node.js backend container runs serverlessly on **AWS ECS Fargate** inside a dedicated multi-AZ **Virtual Private Cloud (VPC)**.

```mermaid
graph TD
    User["End User Browser"]

    subgraph Edge ["AWS Edge & Ingress Layer"]
        R53["Amazon Route 53 (DNS / TLS 1.3)"]
        ACM["AWS Certificate Manager (ACM)"]
        WAF["AWS WAF (DDoS, OWASP Top 10, Rate Limiting)"]
        CF["Amazon CloudFront (Edge CDN)"]
        S3["Amazon S3 Bucket (React SPA Static Assets with OAC)"]
        ALB["Application Load Balancer (ALB, Dual-AZ)"]
    end

    subgraph VPC ["AWS Virtual Private Cloud (VPC: 10.0.0.0/16)"]
        subgraph PublicSubnets ["Public Subnets (AZ-a & AZ-b)"]
            ALB
            NAT["NAT Gateways (AZ-a & AZ-b)"]
            IGW["Internet Gateway (IGW)"]
        end

        subgraph PrivateSubnets ["Private Application Subnets (Zero Inbound Internet)"]
            subgraph ECSCluster ["AWS ECS Fargate Cluster"]
                Task1["Backend Task 1 (Node 22 Container - AZ-a)"]
                Task2["Backend Task 2 (Node 22 Container - AZ-b)"]
                AutoScaler["Application Auto Scaling (Target Tracking)"]
            end
            VPCE["VPC Endpoints (PrivateLink: ECR, S3, Secrets Manager, CloudWatch)"]
        end
    end

    subgraph AWSManagement ["AWS Security, Secrets & Observability"]
        SECRETS["AWS Secrets Manager (GEMINI_API_KEY, JWT_SECRET with KMS)"]
        CW["Amazon CloudWatch (Container Insights, Logs, Metric Alarms)"]
        ECR["Amazon ECR (Encrypted Container Registry with Vulnerability Scanning)"]
        SNS["Amazon SNS (Alert Notifications to Slack / PagerDuty)"]
    end

    subgraph ExternalServices ["External AI APIs"]
        GEMINI["Google Gemini API (Gemini Flash Inference)"]
    end

    User --> R53
    R53 --> CF
    ACM -.->|TLS 1.3 Certificate| CF
    WAF --> CF
    CF -->|Static Assets /*| S3
    CF -->|API Requests /api/*| ALB
    ALB --> Task1
    ALB --> Task2
    AutoScaler -.->|Scale Out / In| ECSCluster

    Task1 --> NAT
    Task2 --> NAT
    NAT --> IGW
    IGW -->|Outbound HTTPS (443)| GEMINI

    Task1 -.->|Task Execution Role| SECRETS
    Task2 -.->|Task Execution Role| SECRETS
    Task1 -.->|awslogs Driver| CW
    Task2 -.->|awslogs Driver| CW
    CW --> SNS
    ECR -.->|Image Pull via VPCE| ECSCluster
```

---

## 2. Compute & Container Orchestration (AWS ECS Fargate)

### 2.1 Serverless Fargate Compute Engine
- **AWS ECS with AWS Fargate**: Serverless container execution that completely eliminates the operational burden of managing, patching, and scaling EC2 host instances.
- **Hardware Architecture**: Supports `Linux/ARM64` (AWS Graviton3) for a ~20% price-performance advantage, or `Linux/X86_64`.
- **Isolation**: Each Fargate task executes within its own dedicated kernel boundary, utilizing dedicated Elastic Network Interfaces (ENIs) with private IP addressing.

### 2.2 ECS Task Definition Specification
```json
{
  "family": "husqvarna-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/husqvarna-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::123456789012:role/husqvarna-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789012.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest",
      "essential": true,
      "user": "node",
      "readonlyRootFilesystem": false,
      "portMappings": [
        {
          "containerPort": 5001,
          "hostPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "5001" },
        { "name": "GEMINI_MODEL", "value": "gemini-2.5-flash" },
        { "name": "LLM_PROVIDER", "value": "gemini" },
        { "name": "LLM_TIMEOUT_MS", "value": "15000" }
      ],
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:123456789012:secret:husqvarna/gemini_key:GEMINI_API_KEY::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:123456789012:secret:husqvarna/jwt_secret:JWT_SECRET::"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/husqvarna-backend",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 3. Network Topology & VPC Architecture

### 3.1 Multi-AZ Subnet Design
The infrastructure is provisioned inside an AWS Virtual Private Cloud (VPC) spanning two Availability Zones (e.g., `ap-south-1a` and `ap-south-1b`) for high availability:
- **VPC CIDR**: `10.0.0.0/16`
- **Public Subnets**: `10.0.1.0/24` (AZ-a) and `10.0.2.0/24` (AZ-b)
  - Hosts the Application Load Balancer (ALB) and NAT Gateways.
  - Attached to an AWS Internet Gateway (IGW) for public routing.
- **Private Subnets**: `10.0.10.0/24` (AZ-a) and `10.0.20.0/24` (AZ-b)
  - Hosts the ECS Fargate container tasks.
  - Zero direct ingress from the public internet.
  - Egress routing is strictly directed through the NAT Gateways for outbound external API requests (e.g., Google Gemini Flash).

### 3.2 Security Group Firewall Rules
Strict least-privilege ingress/egress rules prevent unauthorized lateral movement:

| Security Group | Direction | Protocol | Port | Source / Destination | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ALB-SG`** | Inbound | HTTPS | 443 | `0.0.0.0/0` (or CloudFront Prefix List) | Client traffic routed via CloudFront Edge |
| **`ALB-SG`** | Outbound | HTTP | 5001 | `ECS-Task-SG` | Forwarding traffic to backend tasks |
| **`ECS-Task-SG`** | Inbound | HTTP | 5001 | `ALB-SG` | Ingress permitted **only** from Application Load Balancer |
| **`ECS-Task-SG`** | Outbound | HTTPS | 443 | `0.0.0.0/0` (via NAT Gateway) | Secure outbound calls to Google Gemini API |

### 3.3 AWS PrivateLink (VPC Endpoints)
To optimize data transfer costs and enhance network security, Interface VPC Endpoints are provisioned directly inside the VPC:
- `com.amazonaws.ap-south-1.ecr.api` & `ecr.dkr` (ECR image pulls without traversing NAT)
- `com.amazonaws.ap-south-1.secretsmanager` (Direct encrypted secret retrieval)
- `com.amazonaws.ap-south-1.logs` (Direct CloudWatch log ingestion)
- `com.amazonaws.ap-south-1.s3` (Gateway Endpoint: zero data transfer charge for S3)

---

## 4. Security, Identity & Secrets Management

### 4.1 Secrets Injection via AWS Secrets Manager
- **Zero Plaintext Credentials**: No secrets or private keys are ever stored in Git repositories, Dockerfiles, or container image layers.
- **Encrypted at Rest**: Sensitive values (`GEMINI_API_KEY`, `JWT_SECRET`) are stored in **AWS Secrets Manager** and encrypted using a Customer Managed Key (CMK) in **AWS KMS**.
- **Automated Task Injection**: The ECS task execution agent retrieves secrets directly at task launch time and injects them as environment variables into the container runtime.
- **Automatic Secret Rotation**: Integrates with AWS Lambda rotation templates to rotate JWT signing keys every 90 days.

### 4.2 IAM Roles & Least-Privilege Architecture
Two distinct IAM roles govern container execution:
1. **ECS Task Execution Role (`ecsTaskExecutionRole`)**:
   - Assumed by the AWS ECS agent.
   - Permissions:
     - `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`
     - `logs:CreateLogStream`, `logs:PutLogEvents`
     - `secretsmanager:GetSecretValue` on the specific secret ARNs
     - `kms:Decrypt` on the KMS key ARN
2. **ECS Task Role (`ecsTaskRole`)**:
   - Assumed by the Node.js application process running inside the container.
   - Limited strictly to required application-level AWS SDK permissions (e.g., CloudWatch custom metric emissions). No administrative AWS permissions.

### 4.3 Web Application Firewall (AWS WAF)
AWS WAF is deployed on the CloudFront distribution to protect both static assets and API routes:
- **AWSManagedRulesCommonRuleSet**: Defends against OWASP Top 10 vulnerabilities (SQL injection, XSS, SSRF).
- **AWSManagedRulesKnownBadInputsRuleSet**: Blocks known malicious request patterns.
- **Rate-Based Rule**: Throttles any single client IP attempting more than 300 requests per 5-minute period to mitigate Layer 7 DDoS and brute-force attacks.

---

## 5. High Availability & Application Auto-Scaling

### 5.1 Multi-AZ Task Distribution
- **Minimum Desired Count**: 2 tasks distributed across distinct Availability Zones (`ap-south-1a` and `ap-south-1b`) for 99.99% infrastructure availability.
- **Maximum Count**: 10 tasks.
- **Zero-Downtime Deployments**: Configured with:
  - `minimumHealthyPercent: 100` (Ensures full capacity is maintained during deployments)
  - `maximumPercent: 200` (Spins up new version tasks before terminating old version tasks)
  - **Deployment Circuit Breaker**: Automatically rolls back to the previous stable task definition revision if new tasks fail health checks.

### 5.2 Application Auto Scaling (Target Tracking)
AWS Application Auto Scaling dynamically scales ECS tasks based on real-time workload telemetry:
1. **CPU Utilization Policy**:
   - Metric: `ECSServiceAverageCPUUtilization`
   - Target Value: `70%`
   - Scale-Out Cooldown: 60 seconds
   - Scale-In Cooldown: 300 seconds (prevents scaling flapping)
2. **ALB Request Count Per Target Policy**:
   - Metric: `ALBRequestCountPerTarget`
   - Target Value: `50` requests per target per minute
   - Scales the fleet out proactively during unexpected query spikes.

---

## 6. Container Registry & Automated CI/CD Pipeline

```
Git Push (main branch)
       │
       ▼
GitHub Actions CI / AWS CodePipeline
       │
       ├─► 1. Static Analysis & Type Checking
       ├─► 2. Multi-Stage Docker Container Build (Docker/Dockerfile.server)
       ├─► 3. Container Security Scan (AWS Inspector / Trivy CVE Check)
       ├─► 4. Authenticate with Amazon ECR (aws ecr get-login-password)
       ├─► 5. Push Image to ECR with Immutable Git SHA Tag (e.g., :sha-7f2a1b9)
       └─► 6. Update ECS Task Definition & Trigger Zero-Downtime Rolling Deployment
```

### 6.1 Amazon ECR Repository Configuration
- **Repository**: `husqvarna-backend`
- **KMS Encryption**: AES-256 server-side encryption with AWS KMS.
- **Image Tag Immutability**: Enabled to guarantee that image tags cannot be overwritten, ensuring tamper-proof audit trails.
- **Enhanced Scanning**: Continuous vulnerability scanning powered by **AWS Inspector**, flagging CVEs across OS packages and application dependencies.
- **Lifecycle Policy**: Automatically expires untagged images and retains the latest 30 tagged production releases to control storage costs.

---

## 7. Observability, Monitoring & Reliability (CloudWatch)

### 7.1 Container Health Check & Graceful Draining
- **Container Health Probe**: Built-in HTTP probe calls `/api/health` every 30 seconds. If an unhandled process crash occurs, ECS marks the task unhealthy and provisions a fresh replacement.
- **ALB Target Group Health Check**:
  - Path: `/api/health`
  - Healthy Threshold: 2 consecutive successes
  - Unhealthy Threshold: 3 consecutive failures
  - Timeout: 5 seconds | Interval: 15 seconds
- **Deregistration Delay (Connection Draining)**: Configured to 15 seconds on the ALB Target Group to allow in-flight LLM queries to complete before stopping tasks.
- **Process Signal Handling**: The Node.js application intercepts `SIGTERM` and `SIGINT`, ceases accepting new HTTP connections, and gracefully flushes pending responses within a 10-second window.

### 7.2 Structured Logging & Telemetry
- All application logs are emitted as structured JSON lines to `stdout`/`stderr` and ingested by **Amazon CloudWatch Logs** under `/ecs/husqvarna-backend`.
- **Log Retention**: Set to 30 days with automated transition to S3 Glacier for long-term audit compliance.
- **CloudWatch Container Insights**: Captures task-level CPU, memory, network I/O, and disk telemetry.

### 7.3 CloudWatch Metric Alarms & Incident Response
| Alarm Name | Evaluation Criterion | Severity | Notification Action |
| :--- | :--- | :--- | :--- |
| **`High-5XX-Error-Rate`** | HTTP 5XX rate > 1% over 5 minutes | Critical | Amazon SNS -> PagerDuty / Slack |
| **`Target-Response-Time-P95`** | P95 latency > 2500ms over 3 minutes | Warning | Amazon SNS -> Slack DevOps Channel |
| **`ECS-High-Memory-Utilization`** | Memory > 85% for 2 consecutive periods | Warning | Auto-scaler triggers; SNS notification |
| **`Unhealthy-Host-Count`** | Unhealthy hosts >= 1 for 2 minutes | Critical | Amazon SNS -> On-Call Engineer |

---

## 8. Sizing & Estimated AWS Monthly Cost Breakdown

The following estimate is based on the **AWS Base Profile** deployed in the `ap-south-1` (Mumbai) or `eu-west-1` (Ireland) region:

| Component | AWS Resource | Specification / Tier | Est. Cost (USD/mo) |
| :--- | :--- | :--- | :--- |
| **Backend Compute** | AWS ECS Fargate | 2 Tasks (0.5 vCPU, 1 GB RAM, 24/7) | ~$30.00 |
| **Ingress & TLS** | Application Load Balancer | 1 ALB (15 LCU usage, SSL termination) | ~$22.50 |
| **Frontend CDN** | Amazon CloudFront + S3 | Global Edge Network (100 GB egress + S3 hosting) | ~$9.00 |
| **Network Egress** | AWS NAT Gateway | 1 Multi-AZ NAT Gateway + data processed | ~$35.00 |
| **DNS & Secrets** | Route 53 + Secrets Manager | 1 Hosted Zone + 2 Secrets with KMS encryption | ~$2.50 |
| **Observability** | Amazon CloudWatch | Logs ingestion (10 GB) + Metrics & Alarms | ~$5.50 |
| **Container Registry** | Amazon ECR | 5 GB storage + continuous vulnerability scanning | ~$0.50 |
| **Total Base AWS Infrastructure** | | | **~$105.00 / month** |

### Cost Optimization Levers
- **AWS Compute Savings Plans**: Committing to a 1-year or 3-year Fargate Savings Plan reduces compute costs by up to **40–50%**.
- **ECS Fargate Spot**: Utilizing a Fargate Spot provider strategy (e.g., 50% on-demand baseline + 50% spot) reduces compute costs by **70%** for non-critical workloads.
- **S3 Gateway Endpoints**: Routing S3 traffic through free Gateway VPC Endpoints eliminates NAT Gateway data processing charges for static asset syncing.

---

## 9. Step-by-Step AWS Deployment Runbook

### Step 1: Create Amazon ECR Repository
```bash
aws ecr create-repository \
  --repository-name husqvarna-backend \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES256 \
  --region ap-south-1
```

### Step 2: Build & Push Container Image
```bash
# Authenticate Docker client to Amazon ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-south-1.amazonaws.com

# Build production backend image using the root Dockerfile
docker build -f Docker/Dockerfile.server -t husqvarna-backend:latest .

# Tag image with immutable git commit SHA and latest
docker tag husqvarna-backend:latest 123456789012.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:sha-$(git rev-parse --short HEAD)
docker tag husqvarna-backend:latest 123456789012.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest

# Push to Amazon ECR
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:sha-$(git rev-parse --short HEAD)
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest
```

### Step 3: Register ECS Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://Docker/ecs-task-definition.json \
  --region ap-south-1
```

### Step 4: Deploy / Update ECS Fargate Service
```bash
aws ecs update-service \
  --cluster husqvarna-cluster \
  --service husqvarna-query-service \
  --task-definition husqvarna-backend-task \
  --force-new-deployment \
  --region ap-south-1
```

### Step 5: Verify Deployment Status & Service Health
```bash
# Check service rollout progress
aws ecs describe-services \
  --cluster husqvarna-cluster \
  --services husqvarna-query-service \
  --region ap-south-1 \
  --query "services[0].deployments"

# Verify ALB target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:123456789012:targetgroup/husqvarna-tg/abcdef1234567890 \
  --region ap-south-1
```
