# Defang Documentation

## Introduction

Defang is a radically simpler platform for building and deploying production-ready cloud applications. It eliminates the complexity of learning hundreds of cloud services by allowing developers to use familiar Docker Compose files to define multi-container applications and deploy them to AWS or GCP. The platform handles all the heavy lifting including VPC configuration, load balancing, security groups, observability, SSL certificates, and DNS management, transforming what typically requires weeks of cloud infrastructure knowledge into a single command deployment process.

The Defang CLI includes an AI-powered agent that translates natural language prompts into complete project scaffolding with Dockerfiles, compose files, and application code. It supports Bring-Your-Own-Cloud (BYOC) deployments to your own AWS or GCP accounts. With managed services for PostgreSQL, Redis, MongoDB, object storage, and LLM integrations (AWS Bedrock, GCP Vertex AI), Defang enables developers to focus on building features rather than wrestling with cloud infrastructure, while maintaining best practices for security, scalability, and zero-downtime deployments.

## APIs and Key Functions

### AI-Powered Project Generation

Generate complete project scaffolding from natural language descriptions using the Defang AI agent. The agent creates all necessary files including Dockerfiles, compose.yaml, and application code based on your prompt.

```bash
# Interactive project generation
defang generate

# The CLI prompts for:
# 1. Language selection (Nodejs, Golang, Python)
# 2. Sample service or AI generation
# 3. Service description prompt
# 4. Folder name for the project

# Example prompt:
# "A basic service with 2 REST endpoints. The default endpoint will be for
# health check and should return a JSON object like this: { "status": "OK" }.
# The /echo endpoint will echo back all request parameters in the response."

# Generated project structure:
# project1/
# ├── compose.yaml
# ├── Dockerfile
# ├── package.json
# └── index.js

# Deploy the generated project
cd project1
defang compose up
```

### Deploy to AWS BYOC

Deploy applications to your own AWS account with automatic infrastructure provisioning including ECS Fargate, VPC, ALB, RDS, and more.

```bash
# Set AWS credentials (option 1: profile)
export AWS_PROFILE=my-profile
export AWS_REGION=us-east-1

# Set AWS credentials (option 2: access keys)
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_REGION=us-east-1

# Verify AWS authentication (optional)
aws sts get-caller-identity

# Deploy to AWS
defang compose up --provider=aws

# Or set provider via environment variable
export DEFANG_PROVIDER=aws
defang compose up

# Defang provisions in your AWS account:
# - VPC with public/private subnets
# - ECS Fargate cluster
# - Application Load Balancer
# - ECR repositories
# - CloudWatch logs
# - IAM roles and security groups
# - Route 53 DNS records
```

### Compose File Specification

Define multi-container applications using Docker Compose syntax with Defang-specific extensions for cloud deployment.

```yaml
# Basic compose.yaml with all required properties
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - mode: ingress
        target: 8080
        published: 8080
    environment:
      NODE_ENV: production
      API_KEY:  # Load from defang config (sensitive)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 90s
      retries: 3
    deploy:
      replicas: 2
      reservations:
        cpus: '0.5'
        memory: 512M
    restart: unless-stopped
    networks:
      default:

networks:
  default:

# Advanced example with multiple services
services:
  frontend:
    build:
      context: ./frontend
    ports:
      - mode: ingress
        target: 3000
    environment:
      BACKEND_URL: http://backend:8080
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/"]
      interval: 30s
    networks:
      default:
        aliases:
          - web

  backend:
    image: node:18-alpine
    command: node server.js
    ports:
      - mode: host
        target: 8080
    environment:
      DATABASE_HOST: db
      DATABASE_USER: postgres
      DATABASE_PASSWORD:  # defang config
    networks:
      default:
```

### Sensitive Configuration Management

Securely store and manage sensitive values like API keys, passwords, and credentials using the Defang config system.

```bash
# Set sensitive configuration value
defang config set API_KEY
# Prompts securely for the value

# Set multiple config values
defang config set DATABASE_PASSWORD
defang config set AWS_SECRET_KEY

# List configuration keys (without values)
defang config list

# Delete a configuration value
defang config delete API_KEY

# Use in compose.yaml (list notation)
services:
  app:
    environment:
      - API_KEY              # Load from defang config
      - DATABASE_PASSWORD    # Load from defang config
      - NODE_ENV=production  # Literal value

# Use in compose.yaml (map notation)
services:
  app:
    environment:
      API_KEY:               # Load from defang config
      DATABASE_PASSWORD:     # Load from defang config
      NODE_ENV: production   # Literal value

# Interpolation with config values
services:
  app:
    environment:
      USER_NAME:
      USER_PASSWORD:
      # Construct connection string from config
      CONNECT_URL: postgresql://${USER_NAME}:${USER_PASSWORD}@db:5432/myapp
      DATABASE_URL: postgres://postgres:${DATABASE_PASSWORD}@db:5432/postgres?sslmode=${SSL_MODE}

# Environment variable precedence (highest to lowest):
# 1. .env files (dotenv)
# 2. compose.yaml environment variables
# 3. defang config (sensitive values)
```

### Managed PostgreSQL Database

Provision fully managed PostgreSQL instances on AWS RDS or GCP Cloud SQL using the x-defang-postgres extension.

```yaml
# Basic managed Postgres setup
services:
  app:
    build:
      context: .
    environment:
      POSTGRES_HOST: database
      POSTGRES_USER: postgres
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD:  # Required: set via defang config
      # Connection string with SSL (required in production)
      POSTGRES_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}?sslmode=${SSL_MODE}
    depends_on:
      - database

  database:
    image: postgres:18
    x-defang-postgres: true  # Provisions managed instance
    ports:
      - mode: host
        target: 5432
    environment:
      POSTGRES_PASSWORD:  # Required: set via defang config
      POSTGRES_USER: postgres  # Optional: defaults to postgres
      POSTGRES_DB: postgres    # Optional: defaults to postgres

# Set required password before deployment
# defang config set POSTGRES_PASSWORD
# defang config set SSL_MODE=require

# Provider support:
# - AWS: RDS Postgres (fully managed)
# - GCP: Cloud SQL Postgres (fully managed)

# Connection from application code (Node.js example):
# const { Pool } = require('pg')
# const pool = new Pool({
#   host: process.env.POSTGRES_HOST,
#   user: process.env.POSTGRES_USER,
#   password: process.env.POSTGRES_PASSWORD,
#   database: process.env.POSTGRES_DB,
#   ssl: { rejectUnauthorized: false }
# })

# Final snapshots created automatically on deletion:
# Format: <project-name>-<service>-postgres-<id>-final-snapshot
```

### Managed LLM Integration

Enable cloud-native managed language models (AWS Bedrock, GCP Vertex AI) with automatic role and permission configuration.

```yaml
# Enable managed LLM access for a service
services:
  ai-app:
    build:
      context: .
    x-defang-llm: true  # Automatically configures IAM roles and permissions
    environment:
      MODEL: anthropic.claude-3-sonnet-20240229-v1:0  # AWS Bedrock model ID
      # or MODEL: claude-3-sonnet@20240229  # GCP Vertex AI model ID
    ports:
      - mode: ingress
        target: 8080

# Provider support:
# - AWS: Bedrock (requires model access enabled)
# - GCP: Vertex AI (requires model access enabled)

# Before deployment, enable model access:
# AWS: https://docs.aws.amazon.com/bedrock/latest/userguide/model-access-modify.html
# GCP: https://cloud.google.com/vertex-ai/generative-ai/docs/control-model-access

# Example using AWS Bedrock SDK (Node.js):
# const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime')
# const client = new BedrockRuntimeClient({ region: 'us-east-1' })
# const response = await client.send(new InvokeModelCommand({
#   modelId: process.env.MODEL,
#   body: JSON.stringify({ prompt: "Hello, world!", max_tokens: 100 })
# }))

# Example using OpenAI Access Gateway (compatibility layer):
# services:
#   ai-app:
#     build:
#       context: .
#     x-defang-llm: true
#     environment:
#       OPENAI_API_BASE: http://openai-gateway:8080/v1
#   openai-gateway:
#     image: defang/openai-access-gateway
#     x-defang-llm: true
```

### Custom Domain Configuration

Use your own domain names with automatic SSL certificate provisioning and DNS management via AWS Route 53.

```yaml
# Compose file with custom domain
services:
  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    domainname: nextjs.mycompany.com  # Your custom domain
    ports:
      - target: 3000
        mode: ingress
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s

# Prerequisites:
# 1. Create public hosted zone in AWS Route 53
# 2. Get four AWS nameservers from hosted zone
# 3. Configure NS records in your domain registrar pointing to AWS nameservers

# Example NS records in domain registrar (e.g., CloudFlare):
# Type  Name              Value
# NS    mycompany.com     ns-123.awsdns-45.com
# NS    mycompany.com     ns-678.awsdns-90.net
# NS    mycompany.com     ns-901.awsdns-23.org
# NS    mycompany.com     ns-234.awsdns-56.co.uk

# Deploy with custom domain
defang compose up --provider=aws

# Defang automatically:
# - Creates SSL certificate via ACM
# - Validates certificate via DNS
# - Creates Route 53 A/AAAA records
# - Configures ALB listener rules
# - Enables HTTPS with automatic redirect

# Access your service at:
# https://nextjs.mycompany.com

# Multiple domains for different services:
services:
  api:
    domainname: api.mycompany.com
    ports:
      - target: 8080
        mode: ingress

  frontend:
    domainname: app.mycompany.com
    ports:
      - target: 3000
        mode: ingress
```

### Service Management and Monitoring

Monitor, scale, and manage deployed services with CLI commands and status tracking.

```bash
# View service status
defang compose ps
# Output shows: service name, status, endpoints, replicas

# Service statuses:
# - BUILD_QUEUED: Waiting to build image
# - BUILD_RUNNING: Building container image
# - BUILD_FAILED: Build failed (check logs)
# - UPDATE_QUEUED: Waiting to deploy
# - SERVICE_DEPLOYMENT_PENDING: Provisioning resources
# - SERVICE_DEPLOYMENT_COMPLETED: Deployed and healthy
# - SERVICE_DEPLOYMENT_FAILED: Deployment failed

# View real-time logs
defang logs app
defang logs app --follow
defang logs app --since 1h

# Service naming and DNS resolution:
# BYOC: <service-name>--<port>.<project-name>.<username>.defang.app

# Scale service replicas (update compose.yaml)
services:
  app:
    deploy:
      replicas: 5  # Scale to 5 instances
      reservations:
        cpus: '1.0'
        memory: 1G

# Apply scaling changes
defang compose up

# Update service with zero downtime
# 1. Modify code or compose.yaml
# 2. Run: defang compose up
# Defang performs rolling update automatically

# Monitor deployment in Defang Portal
# https://portal.defang.dev/service/<service-name>
```

### AI-Assisted Debugging

Automatically troubleshoot deployment failures using the AI debugger that analyzes logs and project files.

```bash
# Debugging is triggered automatically during deployment
defang compose up

# If a service fails to deploy, the AI debugger:
# 1. Asks for permission to analyze the failure
# 2. Examines service logs
# 3. Reviews project files (Dockerfile, compose.yaml, source code)
# 4. Identifies the root cause
# 5. Provides suggested fixes in the terminal

# Common issues detected:
# - Missing dependencies in Dockerfile
# - Incorrect port configurations
# - Healthcheck failures
# - Environment variable issues
# - Build errors
# - Runtime crashes

# Example debugging output:
# ❌ Service 'app' failed to deploy
# 🤖 AI Debugger: Analyzing logs and project files...
#
# Issue found: Healthcheck is failing because curl is not installed
#
# Suggested fix:
# Add this to your Dockerfile:
# RUN apt-get update && apt-get install -y curl
#
# Or change healthcheck to use wget instead:
# healthcheck:
#   test: ["CMD", "wget", "--spider", "http://localhost:3000/"]

# Note: AI debugger does not modify files automatically
# Review suggestions and apply changes manually
```

### GitHub Actions CI/CD Integration

Automate deployments using the Defang GitHub Action with support for multi-environment workflows.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Defang

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Defang
        uses: DefangLabs/defang-github-action@v1
        with:
          defang-token: ${{ secrets.DEFANG_TOKEN }}
          provider: aws
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

# Multi-environment deployment
name: Deploy to Multiple Environments

on:
  push:
    branches: [main, staging]

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: DefangLabs/defang-github-action@v1
        with:
          defang-token: ${{ secrets.DEFANG_TOKEN }}
          provider: gcp
          gcp-project-id: ${{ secrets.GCP_PROJECT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: DefangLabs/defang-github-action@v1
        with:
          defang-token: ${{ secrets.DEFANG_TOKEN }}
          provider: aws
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

# Managing sensitive config in GitHub Actions
# 1. Set GitHub repository secrets
# 2. Reference in workflow with CONFIG_ prefix
# 3. Action automatically runs `defang config set` for each

# Example with database password:
# GitHub Secret: CONFIG_DATABASE_PASSWORD=mysecretpassword
# Referenced in workflow:
env:
  CONFIG_DATABASE_PASSWORD: ${{ secrets.CONFIG_DATABASE_PASSWORD }}
  CONFIG_API_KEY: ${{ secrets.CONFIG_API_KEY }}
```

### Deploy to GCP

Deploy applications to Google Cloud Platform with provider-specific configurations.

```bash
# Deploy to GCP
# Prerequisites:
# 1. GCP project with billing enabled
# 2. Service account with necessary permissions
# 3. Service account key JSON file

# Set GCP credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
export GCP_PROJECT_ID=my-project-id

# Deploy to GCP
defang compose up --provider=gcp

# GCP provisions:
# - Cloud Run services
# - Cloud Load Balancing
# - Cloud SQL (managed Postgres)
# - Memorystore (managed Redis)
# - Vertex AI (managed LLMs)
# - Secret Manager
# - Cloud Build

# Provider comparison:
# AWS (GA): Full feature support, best for production
# GCP (Public Preview): Core features, managed services
```

### Pulumi Integration

Use Pulumi for infrastructure-as-code deployment with full programmatic control over cloud resources.

```typescript
// index.ts - Pulumi program
import * as pulumi from "@pulumi/pulumi";
import * as defang from "@defang-io/pulumi-defang";

// Create a Defang service
const app = new defang.DefangService("app", {
  build: {
    context: "./app",
    dockerfile: "./app/Dockerfile",
  },
  ports: [{
    mode: "ingress",
    target: 8080,
  }],
  environment: [
    { name: "NODE_ENV", value: "production" },
    { name: "API_KEY" },  // Load from Pulumi config
  ],
  deploy: {
    replicas: 2,
    resources: {
      reservations: {
        cpu: "0.5",
        memory: "512M",
      },
    },
  },
});

// Export the service endpoint
export const endpoint = app.endpoints[0];

// Managed Postgres with Pulumi
const db = new defang.DefangPostgres("database", {
  image: "postgres:18",
  environment: [
    { name: "POSTGRES_PASSWORD" },  // Load from Pulumi secrets
  ],
});

// Set configuration values
// pulumi config set --secret API_KEY mysecretkey
// pulumi config set --secret POSTGRES_PASSWORD dbpassword

// Deploy with Pulumi
// pulumi up --provider=aws

// Use different stacks for environments
// pulumi stack init dev
// pulumi stack init staging
// pulumi stack init prod

// Deploy to specific stack
// pulumi up --stack prod --provider=aws
```

## Summary

Defang transforms cloud deployment from a complex, time-consuming process into a streamlined developer experience. By leveraging familiar Docker Compose files and adding intelligent cloud automation, it enables teams to deploy production-ready applications in minutes rather than weeks. The platform's core use cases include: production deployments to AWS or GCP with full infrastructure automation; microservices architectures with automatic service discovery and networking; stateful applications using managed PostgreSQL, Redis, and MongoDB; and AI-powered applications with integrated LLM services from AWS Bedrock or GCP Vertex AI.

Integration patterns center around a "develop once, deploy anywhere" philosophy. Teams can start with local Docker Compose development, then deploy to production cloud environments on AWS or GCP with zero code changes. The AI-powered generate command accelerates project setup, while the debug command reduces troubleshooting time when issues occur. For CI/CD workflows, the GitHub Action enables automated deployments with proper secret management and multi-environment support. The platform maintains security best practices automatically, including VPC isolation, SSL certificate management, encrypted secrets storage, and principle-of-least-privilege IAM roles, allowing developers to focus on building features while Defang handles the operational complexity of cloud infrastructure.
