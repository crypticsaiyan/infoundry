#!/usr/bin/env node
/**
 * InFoundry MCP Server
 * 
 * Exposes cloud architecture tools to Cline via Model Context Protocol.
 * Tools: analyze_repo, propose_architecture, generate_iac, validate_iac
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "infoundry-architect",
  version: "1.0.0",
});

/**
 * Validate and sanitize a path to prevent command injection.
 * Returns the resolved absolute path or throws if invalid.
 */
function validatePath(inputPath: string): string {
  // Resolve to absolute path
  const resolved = path.resolve(inputPath);
  
  // Check for dangerous patterns
  if (inputPath.includes(';') || inputPath.includes('&&') || 
      inputPath.includes('|') || inputPath.includes('`') ||
      inputPath.includes('$(') || inputPath.includes('\n')) {
    throw new Error(`Invalid path: contains dangerous characters`);
  }
  
  // Verify the path exists and is a directory
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  
  const stats = fs.statSync(resolved);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }
  
  return resolved;
}

// ============== TOOL: analyze_repo ==============
server.tool(
  "analyze_repo",
  "Analyze a codebase to detect services, databases, and API endpoints",
  {
    repoPath: z.string().describe("Path to the repository to analyze"),
  },
  async ({ repoPath }) => {
    const services: Record<string, any> = {};
    const databases: string[] = [];
    const queues: string[] = [];

    try {
      // Validate path to prevent command injection
      const safePath = validatePath(repoPath);
      
      // Use execFileSync with argument array to prevent shell injection
      // Find package.json files (Node.js services)
      const findResult = spawnSync('find', [
        safePath,
        '-name', 'package.json',
        '-not', '-path', '*/node_modules/*'
      ], { encoding: 'utf-8', timeout: 30000 });
      
      const packageJsons = (findResult.stdout || '').trim().split('\n').filter(Boolean);

      for (const pkg of packageJsons) {
        const dir = path.dirname(pkg);
        const name = path.basename(dir);
        // Use resolved paths to properly exclude repo root
        if (path.resolve(dir) !== path.resolve(safePath) && name !== '.') {
          services[name] = { type: 'nodejs', path: dir };
        }
      }

      // Find Python services using argument array
      const pythonResult = spawnSync('find', [
        safePath,
        '(', '-name', 'main.py', '-o', '-name', 'app.py', '-o', '-name', 'serve.py', ')'
      ], { encoding: 'utf-8', timeout: 30000 });
      
      const pythonApps = (pythonResult.stdout || '').trim().split('\n').filter(Boolean);

      for (const app of pythonApps) {
        const dir = path.dirname(app);
        const name = path.basename(dir);
        // Use resolved paths to properly exclude repo root
        if (!services[name] && path.resolve(dir) !== path.resolve(safePath) && name !== '.') {
          services[name] = { type: 'python', path: dir };
        }
      }

      // Detect databases from docker-compose (file read is safe)
      const dockerCompose = path.join(safePath, 'docker-compose.yml');
      if (fs.existsSync(dockerCompose)) {
        const content = fs.readFileSync(dockerCompose, 'utf-8');
        if (content.includes('postgres')) databases.push('postgres');
        if (content.includes('mysql')) databases.push('mysql');
        if (content.includes('mongo')) databases.push('mongodb');
        if (content.includes('redis')) queues.push('redis');
        if (content.includes('rabbitmq')) queues.push('rabbitmq');
      }

      const profile = {
        services,
        databases,
        queues,
        serviceCount: Object.keys(services).length,
        hasInfrastructure: fs.existsSync(path.join(safePath, 'infra')),
        analyzedAt: new Date().toISOString(),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error analyzing repo: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============== TOOL: propose_architecture ==============
server.tool(
  "propose_architecture",
  "Propose optimal cloud architecture using InFoundry's Oumi model",
  {
    serviceProfile: z.string().describe("JSON string of service profile from analyze_repo"),
    cloudProvider: z.string().optional().describe("Target cloud: aws, gcp, or azure"),
  },
  async ({ serviceProfile, cloudProvider = "aws" }) => {
    // Helper function to build heuristic architecture
    function buildHeuristicArchitecture(serviceCount: number, profile: any, cloudProvider: string) {
      let pattern: string;
      let components: string[];

      if (serviceCount <= 2) {
        pattern = "serverless";
        components = ["api_gateway", "lambda_functions", "dynamodb"];
      } else if (serviceCount > 4) {
        pattern = "kubernetes";
        components = ["eks_cluster", "alb", "rds", "elasticache"];
      } else {
        pattern = "microservices_ecs";
        components = ["ecs_cluster", "alb", "rds"];
      }

      if (profile.databases?.includes("postgres")) {
        if (!components.includes("rds")) components.push("rds");
      }
      if (profile.queues?.includes("redis")) {
        components.push("elasticache");
      }

      return {
        pattern,
        components,
        topology: `${serviceCount} services with ${pattern} on ${cloudProvider}`,
        scaling_strategy: serviceCount > 3 ? "horizontal_autoscaling" : "vertical_scaling",
        estimated_cost_tier: serviceCount > 4 ? "high" : serviceCount > 2 ? "medium" : "low",
        rationale: `Selected ${pattern} for ${serviceCount} services on ${cloudProvider}`,
        source: "heuristic",
      };
    }

    try {
      const profile = JSON.parse(serviceProfile);
      const serviceCount = profile.serviceCount || Object.keys(profile.services || {}).length;

      let architecture: any = null;
      
      // Try to call local Oumi server first
      try {
        const response = await fetch("http://localhost:8000/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_count: serviceCount,
            cloud_provider: cloudProvider,
            has_database: profile.databases?.length > 0,
            has_queue: profile.queues?.length > 0,
          }),
        });
        
        if (response.ok) {
          // Wrap JSON parsing in try/catch
          try {
            architecture = await response.json();
            architecture.source = "oumi_model";
          } catch {
            // JSON parse error - fall through to heuristic
            architecture = null;
          }
        }
        // If response.ok is false, architecture remains null and fallback runs
      } catch {
        // Network/fetch error - architecture remains null
      }
      
      // Fallback to heuristics if Oumi didn't return valid architecture
      if (!architecture) {
        architecture = buildHeuristicArchitecture(serviceCount, profile, cloudProvider);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(architecture, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============== TOOL: generate_iac ==============
server.tool(
  "generate_iac",
  "Generate Terraform IaC from architecture proposal",
  {
    architecture: z.string().describe("JSON string of architecture from propose_architecture"),
    outputDir: z.string().describe("Directory to write generated Terraform files"),
  },
  async ({ architecture, outputDir }) => {
    try {
      const arch = JSON.parse(architecture);
      const components: string[] = arch.components || [];
      const pattern = arch.pattern || "unknown";

      // Validate output path - create if doesn't exist
      const resolvedDir = path.resolve(outputDir);
      if (outputDir.includes(';') || outputDir.includes('&&') || outputDir.includes('|')) {
        throw new Error("Invalid output directory path");
      }
      
      fs.mkdirSync(resolvedDir, { recursive: true });

      // Complete, valid Terraform templates
      const templates: Record<string, string> = {
        api_gateway: `resource "aws_api_gateway_rest_api" "main" {
  name        = "infoundry-api"
  description = "InFoundry API Gateway"
}`,

        lambda_functions: `resource "aws_iam_role" "lambda" {
  name = "infoundry-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "main" {
  function_name = "infoundry-handler"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "main.handler"
  filename      = var.lambda_zip_path
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
}`,

        dynamodb: `resource "aws_dynamodb_table" "main" {
  name         = "infoundry-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = var.environment
  }
}`,

        ecs_cluster: `resource "aws_ecs_cluster" "main" {
  name = "infoundry-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}`,

        eks_cluster: `resource "aws_iam_role" "eks" {
  name = "infoundry-eks-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster" {
  role       = aws_iam_role.eks.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "main" {
  name     = "infoundry-eks"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}`,

        alb: `resource "aws_lb" "main" {
  name               = "infoundry-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  tags = {
    Environment = var.environment
  }
}`,

        rds: `resource "aws_db_instance" "main" {
  identifier           = "infoundry-db"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  db_name              = "infoundry"
  username             = var.db_username
  password             = var.db_password
  skip_final_snapshot  = true
  publicly_accessible  = false

  tags = {
    Environment = var.environment
  }
}`,

        elasticache: `resource "aws_elasticache_cluster" "main" {
  cluster_id           = "infoundry-cache"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.cache_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  tags = {
    Environment = var.environment
  }
}`,
      };

      // Build main.tf
      let mainTf = `# Generated by InFoundry Architect
# Pattern: ${pattern}
# Generated: ${new Date().toISOString()}

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

`;

      for (const component of components) {
        if (templates[component]) {
          mainTf += `\n# ============ ${component.toUpperCase()} ============\n${templates[component]}\n`;
        }
      }

      // Build variables.tf with all required variables
      let variablesTf = `# Variables for InFoundry Infrastructure
# Pattern: ${pattern}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

`;

      // Add component-specific variables
      if (components.includes('lambda_functions')) {
        variablesTf += `variable "lambda_zip_path" {
  description = "Path to Lambda deployment package"
  type        = string
  default     = "lambda.zip"
}

`;
      }

      if (components.includes('eks_cluster') || components.includes('ecs_cluster')) {
        variablesTf += `variable "subnet_ids" {
  description = "Subnet IDs for EKS/ECS"
  type        = list(string)
  default     = []
}

`;
      }

      if (components.includes('alb')) {
        variablesTf += `variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
  default     = []
}

`;
      }

      if (components.includes('rds')) {
        variablesTf += `variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_username" {
  description = "Database master username - provide via tfvars or TF_VAR_db_username"
  type        = string
  sensitive   = true
  # No default - must be provided via tfvars or environment variable
}

variable "db_password" {
  description = "Database master password - provide via tfvars or TF_VAR_db_password"
  type        = string
  sensitive   = true
  # No default - must be provided via tfvars or environment variable
}

`;
      }

      if (components.includes('elasticache')) {
        variablesTf += `variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

`;
      }

      // Build outputs.tf only for generated resources
      let outputsTf = `# Outputs for InFoundry Infrastructure\n\n`;
      
      const outputMap: Record<string, string> = {
        api_gateway: `output "api_gateway_id" {\n  description = "API Gateway ID"\n  value       = aws_api_gateway_rest_api.main.id\n}\n`,
        lambda_functions: `output "lambda_function_arn" {\n  description = "Lambda function ARN"\n  value       = aws_lambda_function.main.arn\n}\n`,
        dynamodb: `output "dynamodb_table_name" {\n  description = "DynamoDB table name"\n  value       = aws_dynamodb_table.main.name\n}\n`,
        ecs_cluster: `output "ecs_cluster_arn" {\n  description = "ECS cluster ARN"\n  value       = aws_ecs_cluster.main.arn\n}\n`,
        eks_cluster: `output "eks_cluster_endpoint" {\n  description = "EKS cluster endpoint"\n  value       = aws_eks_cluster.main.endpoint\n}\n`,
        alb: `output "alb_dns_name" {\n  description = "ALB DNS name"\n  value       = aws_lb.main.dns_name\n}\n`,
        rds: `output "rds_endpoint" {\n  description = "RDS endpoint"\n  value       = aws_db_instance.main.endpoint\n}\n`,
        elasticache: `output "elasticache_endpoint" {\n  description = "ElastiCache endpoint"\n  value       = aws_elasticache_cluster.main.cache_nodes[0].address\n}\n`,
      };

      for (const component of components) {
        if (outputMap[component]) {
          outputsTf += outputMap[component] + '\n';
        }
      }

      fs.writeFileSync(path.join(resolvedDir, "main.tf"), mainTf);
      fs.writeFileSync(path.join(resolvedDir, "variables.tf"), variablesTf);
      fs.writeFileSync(path.join(resolvedDir, "outputs.tf"), outputsTf);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, outputDir: resolvedDir, files: ["main.tf", "variables.tf", "outputs.tf"], pattern, components }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  }
);

// ============== TOOL: validate_iac ==============
server.tool(
  "validate_iac",
  "Validate generated Terraform using terraform validate and tflint",
  {
    iacDir: z.string().describe("Directory containing Terraform files"),
  },
  async ({ iacDir }) => {
    const results: Record<string, any> = { terraform_fmt: null, terraform_validate: null, tflint: null };

    try {
      // Validate path to prevent command injection
      const safePath = validatePath(iacDir);
      
      // terraform fmt check - using execFileSync with argument array
      try {
        execFileSync('terraform', ['fmt', '-check', '-recursive', safePath], { encoding: 'utf-8' });
        results.terraform_fmt = { success: true, message: "Format check passed" };
      } catch (e: any) {
        results.terraform_fmt = { success: false, message: e.message };
      }

      // terraform init and validate - run in sequence with spawnSync
      try {
        const initResult = spawnSync('terraform', ['init', '-backend=false'], { 
          cwd: safePath, 
          encoding: 'utf-8' 
        });
        if (initResult.status === 0) {
          const validateResult = spawnSync('terraform', ['validate'], { 
            cwd: safePath, 
            encoding: 'utf-8' 
          });
          results.terraform_validate = { 
            success: validateResult.status === 0, 
            message: validateResult.status === 0 ? "Validation passed" : validateResult.stderr 
          };
        } else {
          results.terraform_validate = { success: false, message: initResult.stderr };
        }
      } catch (e: any) {
        results.terraform_validate = { success: false, message: e.message };
      }

      // tflint - using spawnSync with argument array
      try {
        const lintResult = spawnSync('tflint', ['--format=json'], { 
          cwd: safePath, 
          encoding: 'utf-8' 
        });
        
        // Check if tflint binary was not found
        if (lintResult.error && (lintResult.error as NodeJS.ErrnoException).code === 'ENOENT') {
          results.tflint = { success: true, skipped: true, message: "tflint not installed" };
        } else if (lintResult.status === 0) {
          // Success - parse JSON output
          try {
            results.tflint = { success: true, output: JSON.parse(lintResult.stdout || '{}') };
          } catch {
            results.tflint = { success: true, output: lintResult.stdout };
          }
        } else {
          // Non-zero exit - capture exit code and output
          results.tflint = { 
            success: false, 
            exitCode: lintResult.status,
            output: lintResult.stdout,
            error: lintResult.stderr
          };
        }
      } catch (e: any) {
        // Catch any other errors
        if (e.code === 'ENOENT') {
          results.tflint = { success: true, skipped: true, message: "tflint not installed" };
        } else {
          results.tflint = { success: false, message: e.message };
        }
      }

      // allPassed treats skipped as not failing
      const allPassed = Object.values(results).every((r: any) => r?.success || r?.skipped);

      return {
        content: [{ type: "text", text: JSON.stringify({ valid: allPassed, checks: results }, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InFoundry MCP Server running on stdio");
}

main().catch(console.error);
