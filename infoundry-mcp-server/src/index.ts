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
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "infoundry-architect",
  version: "1.0.0",
});

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
      // Detect package.json files (Node.js services)
      const packageJsons = execSync(
        `find ${repoPath} -name "package.json" -not -path "*/node_modules/*" 2>/dev/null || true`,
        { encoding: "utf-8" }
      ).trim().split("\n").filter(Boolean);

      for (const pkg of packageJsons) {
        const dir = path.dirname(pkg);
        const name = path.basename(dir);
        if (name !== repoPath && name !== ".") {
          services[name] = { type: "nodejs", path: dir };
        }
      }

      // Detect Python services
      const pythonApps = execSync(
        `find ${repoPath} -name "main.py" -o -name "app.py" -o -name "serve.py" 2>/dev/null || true`,
        { encoding: "utf-8" }
      ).trim().split("\n").filter(Boolean);

      for (const app of pythonApps) {
        const dir = path.dirname(app);
        const name = path.basename(dir);
        if (!services[name]) {
          services[name] = { type: "python", path: dir };
        }
      }

      // Detect databases from docker-compose
      const dockerCompose = path.join(repoPath, "docker-compose.yml");
      if (fs.existsSync(dockerCompose)) {
        const content = fs.readFileSync(dockerCompose, "utf-8");
        if (content.includes("postgres")) databases.push("postgres");
        if (content.includes("mysql")) databases.push("mysql");
        if (content.includes("mongo")) databases.push("mongodb");
        if (content.includes("redis")) queues.push("redis");
        if (content.includes("rabbitmq")) queues.push("rabbitmq");
      }

      const profile = {
        services,
        databases,
        queues,
        serviceCount: Object.keys(services).length,
        hasInfrastructure: fs.existsSync(path.join(repoPath, "infra")),
        analyzedAt: new Date().toISOString(),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error analyzing repo: ${error}` }],
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
    try {
      const profile = JSON.parse(serviceProfile);
      const serviceCount = profile.serviceCount || Object.keys(profile.services || {}).length;

      let architecture: any;
      
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
          architecture = await response.json();
          architecture.source = "oumi_model";
        }
      } catch {
        // Fallback to heuristics
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

        architecture = {
          pattern,
          components,
          topology: `${serviceCount} services with ${pattern} on ${cloudProvider}`,
          scaling_strategy: serviceCount > 3 ? "horizontal_autoscaling" : "vertical_scaling",
          estimated_cost_tier: serviceCount > 4 ? "high" : serviceCount > 2 ? "medium" : "low",
          rationale: `Selected ${pattern} for ${serviceCount} services on ${cloudProvider}`,
          source: "heuristic",
        };
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
      const components = arch.components || [];
      const pattern = arch.pattern || "unknown";

      fs.mkdirSync(outputDir, { recursive: true });

      const templates: Record<string, string> = {
        api_gateway: `resource "aws_api_gateway_rest_api" "main" {\n  name = "infoundry-api"\n}`,
        lambda_functions: `resource "aws_lambda_function" "main" {\n  function_name = "infoundry-handler"\n  runtime = "python3.11"\n  handler = "main.handler"\n  role = aws_iam_role.lambda.arn\n}`,
        dynamodb: `resource "aws_dynamodb_table" "main" {\n  name = "infoundry-data"\n  billing_mode = "PAY_PER_REQUEST"\n  hash_key = "id"\n  attribute { name = "id"; type = "S" }\n}`,
        ecs_cluster: `resource "aws_ecs_cluster" "main" {\n  name = "infoundry-cluster"\n  setting { name = "containerInsights"; value = "enabled" }\n}`,
        eks_cluster: `resource "aws_eks_cluster" "main" {\n  name = "infoundry-eks"\n  role_arn = aws_iam_role.eks.arn\n  vpc_config { subnet_ids = var.subnet_ids }\n}`,
        alb: `resource "aws_lb" "main" {\n  name = "infoundry-alb"\n  load_balancer_type = "application"\n  subnets = var.public_subnet_ids\n}`,
        rds: `resource "aws_db_instance" "main" {\n  identifier = "infoundry-db"\n  engine = "postgres"\n  instance_class = "db.t3.micro"\n  allocated_storage = 20\n  skip_final_snapshot = true\n}`,
        elasticache: `resource "aws_elasticache_cluster" "main" {\n  cluster_id = "infoundry-cache"\n  engine = "redis"\n  node_type = "cache.t3.micro"\n  num_cache_nodes = 1\n}`,
      };

      let mainTf = `# Generated by InFoundry Architect\n# Pattern: ${pattern}\n\nterraform {\n  required_version = ">= 1.0"\n  required_providers {\n    aws = { source = "hashicorp/aws"; version = "~> 5.0" }\n  }\n}\n\nprovider "aws" { region = var.aws_region }\n\n`;

      for (const component of components) {
        if (templates[component]) {
          mainTf += `\n# ${component}\n${templates[component]}\n`;
        }
      }

      fs.writeFileSync(path.join(outputDir, "main.tf"), mainTf);
      fs.writeFileSync(path.join(outputDir, "variables.tf"), `variable "aws_region" { default = "us-east-1" }\nvariable "subnet_ids" { type = list(string); default = [] }\nvariable "public_subnet_ids" { type = list(string); default = [] }`);
      fs.writeFileSync(path.join(outputDir, "outputs.tf"), components.map((c: string) => `output "${c}_enabled" { value = true }`).join("\n"));

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, outputDir, files: ["main.tf", "variables.tf", "outputs.tf"], pattern, components }, null, 2) }],
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
      // terraform fmt check
      try {
        execSync(`terraform fmt -check -recursive ${iacDir}`, { encoding: "utf-8" });
        results.terraform_fmt = { success: true, message: "Format check passed" };
      } catch (e: any) {
        results.terraform_fmt = { success: false, message: e.message };
      }

      // terraform validate
      try {
        execSync(`cd ${iacDir} && terraform init -backend=false && terraform validate`, { encoding: "utf-8" });
        results.terraform_validate = { success: true, message: "Validation passed" };
      } catch (e: any) {
        results.terraform_validate = { success: false, message: e.message };
      }

      // tflint (if available)
      try {
        const lint = execSync(`cd ${iacDir} && tflint --format=json 2>/dev/null || echo "{}"`, { encoding: "utf-8" });
        results.tflint = { success: true, output: JSON.parse(lint) };
      } catch {
        results.tflint = { success: false, message: "tflint not available" };
      }

      const allPassed = Object.values(results).every((r: any) => r?.success);

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
