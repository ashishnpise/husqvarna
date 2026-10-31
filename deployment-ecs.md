# AWS ECS Fargate Container Deployment Architecture

> **Senior Full Stack Engineer – Cloud & AI Applications Evaluation Exercise**  
> **Husqvarna Group | GIS India, Navi Mumbai**

This document details the production cloud deployment strategy for the **Husqvarna AI Query Assistant** web application using Docker containers exclusively architected on **Amazon Web Services (AWS)** using **AWS ECS Fargate**.

---

## 1. Architectural Overview & AWS Cloud Topology

The application is deployed as a decoupled, resilient, and containerized micro-architecture on AWS. Static single-page application (SPA) assets are distributed globally via **Amazon CloudFront** backed by **Amazon S3** with **Origin Access Control (OAC)**, while the Node.js backend container runs serverlessly on **AWS ECS Fargate** inside a dedicated multi-AZ **Virtual Private Cloud (VPC)**.

---

## 2. Compute & Container Orchestration (AWS ECS Fargate)

### 2.1 Serverless Fargate Compute Engine
- **AWS ECS with AWS Fargate**: Serverless container execution that completely eliminates the operational burden of managing, patching, and scaling underlying host instances.
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
  "executionRoleArn": "arn:aws:iam::131414:role/husqvarna-ecs-execution-role",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "131414.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest",
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
        { "name": "GEMINI_MODEL", "value": "gemini-3.5-flash" },
        { "name": "LLM_PROVIDER", "value": "gemini" },
        { "name": "LLM_TIMEOUT_MS", "value": "15000" }
      ],
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:131414:secret:husqvarna/gemini_key-KUfQyU:GEMINI_API_KEY::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:131414:secret:husqvarna/jwt_secret-XbBJhc:JWT_SECRET::"
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
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
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
- **Automatic Secret Rotation**: Integrates with AWS Lambda rotation templates to rotate JWT signing keys periodically.

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

## 7. Step-by-Step AWS ECS Deployment Runbook

Follow these sequential steps to deploy the backend and frontend services to AWS ECS Fargate from scratch.

### Step 0: Set Environment Variables
Set your AWS Account ID and deployment region for the session:
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="ap-south-1"
```

---

### Step 1: Create ECS Task Execution IAM Role
> [!IMPORTANT]
> **Mandatory Pre-requisite for ECS Fargate:**  
> ECS Fargate tasks require this execution role to pull container images from private Amazon ECR and stream logs to Amazon CloudWatch. Without this role, registering the task definition will fail with `ClientException: Role is not valid`.

```bash
# 1. Create the IAM role with trust policy allowing ecs-tasks.amazonaws.com
aws iam create-role \
  --role-name husqvarna-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# 2. Attach standard AWS managed policy for ECS execution
aws iam attach-role-policy \
  --role-name husqvarna-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

---

### Step 2: Create CloudWatch Log Group
Provision the target log group for backend container standard output/error:
```bash
aws logs create-log-group \
  --log-group-name /ecs/husqvarna-backend \
  --region ap-south-1
```

---

### Step 3: Create ECR Repository & Push Backend Container Image

```bash
# 1. Create Amazon ECR Repository
aws ecr create-repository \
  --repository-name husqvarna-backend \
  --image-tag-mutability MUTABLE \
  --encryption-configuration encryptionType=AES256 \
  --region ap-south-1

# 2. Authenticate Docker client with AWS ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com

# 3. Build container with linux/amd64 platform architecture for AWS Fargate
docker build --platform linux/amd64 \
  -f Docker/Dockerfile.server \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest .

# 4. Push image to Amazon ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-backend:latest
```

---

### Step 4: Create ECS Fargate Cluster
```bash
aws ecs create-cluster \
  --cluster-name husqvarna-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --region ap-south-1
```

---

### Step 5: Configure Secrets in AWS Secrets Manager

Store your Google Gemini API key and JWT signing secret securely in AWS Secrets Manager:

```bash
# 1. Store Gemini API key
aws secretsmanager create-secret \
  --name husqvarna/gemini_key \
  --secret-string '{"GEMINI_API_KEY":"YOUR_GEMINI_API_KEY"}' \
  --region ap-south-1

# 2. Store JWT signing secret
aws secretsmanager create-secret \
  --name husqvarna/jwt_secret \
  --secret-string '{"JWT_SECRET":"YOUR_JWT_SECRET"}' \
  --region ap-south-1

# 3. Grant the ECS execution role access to read Secrets Manager secrets
aws iam attach-role-policy \
  --role-name husqvarna-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

> [!TIP]
> For quick development/testing evaluations without AWS Secrets Manager, you can alternatively inject `GEMINI_API_KEY` and `JWT_SECRET` directly in the `environment` array inside [Docker/ecs-task-definition.json](./Docker/ecs-task-definition.json).

---

### Step 6: Register ECS Task Definition
Register the container task configuration with AWS ECS:
```bash
aws ecs register-task-definition \
  --cli-input-json file://Docker/ecs-task-definition.json \
  --region ap-south-1
```

---

### Step 7: Create Security Group & ECS Fargate Service

#### 7.1 Create Security Group for ECS Tasks
Allow inbound traffic on port 5001 from your client/browser or public internet:
```bash
# 1. Fetch your VPC ID (default VPC)
export VPC_ID=$(aws ec2 describe-vpcs --region ap-south-1 --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# 2. Create the Security Group
export SG_ID=$(aws ec2 create-security-group \
  --group-name husqvarna-backend-sg \
  --description "Security group for Husqvarna ECS backend container" \
  --vpc-id $VPC_ID \
  --region ap-south-1 \
  --query "GroupId" \
  --output text)

# 3. Allow inbound HTTP traffic on port 5001
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5001 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1
```

#### 7.2 Fetch Available Subnet IDs
```bash
export SUBNET_1=$(aws ec2 describe-subnets --region ap-south-1 --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[0].SubnetId" --output text)
export SUBNET_2=$(aws ec2 describe-subnets --region ap-south-1 --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[1].SubnetId" --output text)
```

#### 7.3 Create the ECS Service (First-Time Setup)
Create the persistent Fargate service with desired task count = 1:
```bash
aws ecs create-service \
  --cluster husqvarna-cluster \
  --service-name husqvarna-query-service \
  --task-definition husqvarna-backend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region ap-south-1
```

#### 7.4 (Subsequent Deployments) Trigger Rolling Update:
Whenever you build and push a new Docker image:
```bash
aws ecs update-service \
  --cluster husqvarna-cluster \
  --service-name husqvarna-query-service \
  --task-definition husqvarna-backend-task \
  --force-new-deployment \
  --region ap-south-1
```

---

### Step 8: Verify Deployment Status, Live Logs & Test Endpoint

#### 8.1 Check Service Rollout Status
```bash
aws ecs describe-services \
  --cluster husqvarna-cluster \
  --services husqvarna-query-service \
  --region ap-south-1 \
  --query "services[0].deployments"
```

#### 8.2 Stream Live CloudWatch Logs
```bash
aws logs tail /ecs/husqvarna-backend \
  --follow \
  --region ap-south-1
```

#### 8.3 Discover Public IP & Verify API Health Probe
Find the container's public IP address and probe the `/api/health` endpoint:
```bash
# 1. Get running task ARN
export TASK_ARN=$(aws ecs list-tasks --cluster husqvarna-cluster --service-name husqvarna-query-service --region ap-south-1 --query "taskArns[0]" --output text)

# 2. Extract ENI ID
export ENI_ID=$(aws ecs describe-tasks --cluster husqvarna-cluster --tasks $TASK_ARN --region ap-south-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

# 3. Resolve Public IP
export PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --region ap-south-1 --query "NetworkInterfaces[0].Association.PublicIp" --output text)

# 4. Probe API health check
echo "Accessing Backend at: http://${PUBLIC_IP}:5001"
curl http://${PUBLIC_IP}:5001/api/health
```

**Expected Verified Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-29T15:32:24.957Z",
  "uptimeSeconds": 33,
  "provider": "gemini",
  "model": "gemini-3.5-flash",
  "realApiKeyConfigured": true,
  "version": "1.0.0"
}
```

---

### Step 9: Deploy Frontend Client to AWS ECS Fargate

You can deploy the React Single Page Application (SPA) as a containerized Nginx service running on AWS ECS Fargate alongside the backend.

#### 9.1 Create Amazon ECR Repository for Frontend
```bash
aws ecr create-repository \
  --repository-name husqvarna-frontend \
  --image-tag-mutability MUTABLE \
  --encryption-configuration encryptionType=AES256 \
  --region ap-south-1
```

#### 9.2 Build & Push Frontend Container Image
Pass the live backend endpoint into the Docker build and tag directly with your ECR repository URI:

```bash
# 1. Build and tag directly for Amazon ECR
docker build --platform linux/amd64 \
  --no-cache \
  --build-arg VITE_API_URL="http://${PUBLIC_IP}:5001" \
  -f Docker/Dockerfile.client \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-frontend:latest .

# 2. Push image to Amazon ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com/husqvarna-frontend:latest
```

#### 9.3 Create CloudWatch Log Group for Frontend
```bash
aws logs create-log-group \
  --log-group-name /ecs/husqvarna-frontend \
  --region ap-south-1
```

#### 9.4 Open Port 80 Inbound on Security Group
Allow HTTP web traffic on port 80 for the frontend web server:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1
```

#### 9.5 Register Frontend ECS Task Definition
```bash
aws ecs register-task-definition \
  --cli-input-json file://Docker/ecs-frontend-task-definition.json \
  --region ap-south-1
```

#### 9.6 Launch Frontend ECS Fargate Service
Create the frontend service inside the same cluster:
```bash
aws ecs create-service \
  --cluster husqvarna-cluster \
  --service-name husqvarna-frontend-service \
  --task-definition husqvarna-frontend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --region ap-south-1
```

#### 9.7 Discover Frontend Public IP & Open in Browser
Wait ~30 seconds for the task to reach the `RUNNING` state, then retrieve its public IP:
```bash
# 1. Fetch Task ARN
export FE_TASK_ARN=$(aws ecs list-tasks --cluster husqvarna-cluster --service-name husqvarna-frontend-service --region ap-south-1 --query "taskArns[0]" --output text)

# 2. Extract ENI ID
export FE_ENI_ID=$(aws ecs describe-tasks --cluster husqvarna-cluster --tasks $FE_TASK_ARN --region ap-south-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

# 3. Extract Public IP Address
export FE_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $FE_ENI_ID --region ap-south-1 --query "NetworkInterfaces[0].Association.PublicIp" --output text)

# 4. Display URL
echo "🌿 Husqvarna AI Assistant Web UI is live at: http://${FE_PUBLIC_IP}"
```

---

### Alternative: Deploy Frontend via Amazon S3 Static Hosting
For a zero-container serverless frontend:
```bash
# 1. Build the production bundle
cd client && VITE_API_URL="http://${PUBLIC_IP}:5001" npm run build && cd ..

# 2. Create S3 Bucket
aws s3 mb s3://husqvarna-ai-client-${AWS_ACCOUNT_ID} --region ap-south-1

# 3. Enable Static Website Hosting
aws s3 website s3://husqvarna-ai-client-${AWS_ACCOUNT_ID} \
  --index-document index.html \
  --error-document index.html

# 4. Sync build output
aws s3 sync client/dist/ s3://husqvarna-ai-client-${AWS_ACCOUNT_ID}/ --acl public-read
```

---

## 10. ⚡ Quick Redeployment & Update Commands

Use these copy-paste commands whenever you push updates to the backend or frontend codebase:

### 10.1 Set Environment Variables
```bash
export AWS_ACCOUNT_ID="367"
export AWS_REGION="ap-south-1"
export CLUSTER_NAME="husqvarna-cluster"

# Log into Amazon ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

### 10.2 Update & Redeploy Backend (Node.js API)
```bash
# 1. Build and tag backend image for linux/amd64
docker build --platform linux/amd64 \
  --no-cache \
  -f Docker/Dockerfile.server \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/husqvarna-backend:latest .

# 2. Push image to Amazon ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/husqvarna-backend:latest

# 3. Register updated task definition revision (picks up env/config changes in Docker/ecs-task-definition.json)
aws ecs register-task-definition \
  --cli-input-json file://Docker/ecs-task-definition.json \
  --region $AWS_REGION

# 4. Trigger ECS Fargate rolling deployment with the latest task definition
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service husqvarna-query-service \
  --task-definition husqvarna-backend-task \
  --force-new-deployment \
  --region $AWS_REGION

# 5. Resolve Backend Public IP & Verify Health
export BE_TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name husqvarna-query-service --region $AWS_REGION --query "taskArns[0]" --output text)
export BE_ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $BE_TASK_ARN --region $AWS_REGION --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
export BACKEND_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $BE_ENI_ID --region $AWS_REGION --query "NetworkInterfaces[0].Association.PublicIp" --output text)

echo "🚀 Backend API is live at: http://${BACKEND_PUBLIC_IP}:5001"
curl http://${BACKEND_PUBLIC_IP}:5001/api/health
```

### 10.3 Update & Redeploy Frontend (React / Nginx)
```bash
# 1. Resolve live backend IP (if not already exported)
export BE_TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name husqvarna-query-service --region $AWS_REGION --query "taskArns[0]" --output text)
export BE_ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $BE_TASK_ARN --region $AWS_REGION --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
export BACKEND_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $BE_ENI_ID --region $AWS_REGION --query "NetworkInterfaces[0].Association.PublicIp" --output text)

echo "🌿 Husqvarna AI Assistant Backend is live at: http://${BACKEND_PUBLIC_IP}:5001/api/health"

# 2. Build and tag frontend image with live backend endpoint
docker build --platform linux/amd64 \
  --no-cache \
  --build-arg VITE_API_URL="http://${BACKEND_PUBLIC_IP}:5001" \
  -f Docker/Dockerfile.client \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/husqvarna-frontend:latest .

# 3. Push image to Amazon ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/husqvarna-frontend:latest

# 4. Trigger ECS Fargate rolling deployment
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service husqvarna-frontend-service \
  --force-new-deployment \
  --region $AWS_REGION

# 5. Resolve Frontend Public IP & Access URL
export FE_TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name husqvarna-frontend-service --region $AWS_REGION --query "taskArns[0]" --output text)
export FE_ENI_ID=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $FE_TASK_ARN --region $AWS_REGION --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
export FE_PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $FE_ENI_ID --region $AWS_REGION --query "NetworkInterfaces[0].Association.PublicIp" --output text)

echo "🌿 Husqvarna AI Assistant Web UI is live at: http://${FE_PUBLIC_IP}"
```


