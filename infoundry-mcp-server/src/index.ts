#!/usr/bin/env node
/**
 * InFoundry MCP Server
 * 
 * Exposes cloud architecture tools to Cline via Model Context Protocol.
 * Tools mirror the InFoundry Kestra pipeline exactly:
 * 1. ingest_repo - Analyze repository
 * 2. ingest_telemetry - Collect service telemetry
 * 3. propose_architecture - AI architecture proposal (Oumi)
 * 4. render_graph - Convert architecture to React Flow graph
 * 5. generate_iac - Generate Terraform from graph
 * 6. validate_iac - Validate Terraform
 * 7. create_pr - Create GitHub PR with IaC
 * 8. validate_pr - Check PR status and reviews
 * 9. evaluate - AI evaluation of deployment results
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "infoundry-architect",
  version: "1.0.0",
});

/**
 * Validate and sanitize a path to prevent command injection.
 */
function validatePath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  
  if (inputPath.includes(';') || inputPath.includes('&&') || 
      inputPath.includes('|') || inputPath.includes('`') ||
      inputPath.includes('$(') || inputPath.includes('\n')) {
    throw new Error(`Invalid path: contains dangerous characters`);
  }
  
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  
  const stats = fs.statSync(resolved);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }
  
  return resolved;
}

// ============== STEP 1: ingest_repo ==============
server.tool(
  "ingest_repo",
  "Analyze a repository to detect services, databases, and queues. Supports local paths or GitHub URLs.",
  {
    repoPath: z.string().describe("Local path OR GitHub URL (e.g., https://github.com/owner/repo)"),
  },
  async ({ repoPath }) => {
    const services: Record<string, any> = {};
    const databases: string[] = [];
    const queues: string[] = [];
    let tempDir: string | null = null;
    let analyzePath: string;
    let primaryLanguage = "unknown";
    let sourceUrl = repoPath;

    try {
      const githubMatch = repoPath.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/);
      
      if (githubMatch) {
        const owner = githubMatch[1];
        const repo = githubMatch[2];
        tempDir = `/tmp/infoundry-analyze-${owner}-${repo}-${Date.now()}`;
        
        const cloneResult = spawnSync('git', ['clone', '--depth', '1', repoPath, tempDir], {
          encoding: 'utf-8',
          timeout: 60000,
        });
        
        if (cloneResult.status !== 0) {
          throw new Error(`Failed to clone repository: ${cloneResult.stderr}`);
        }
        
        analyzePath = tempDir;
      } else {
        analyzePath = validatePath(repoPath);
        sourceUrl = "local";
      }
      
      // Find Node.js services
      const findResult = spawnSync('find', [
        analyzePath, '-name', 'package.json',
        '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.git/*'
      ], { encoding: 'utf-8', timeout: 30000 });
      
      const packageJsons = (findResult.stdout || '').trim().split('\n').filter(Boolean);
      for (const pkg of packageJsons) {
        const dir = path.dirname(pkg);
        const name = path.basename(dir);
        if (path.resolve(dir) !== path.resolve(analyzePath) && name !== '.' && !name.startsWith('.')) {
          services[name] = { type: 'nodejs', path: dir.replace(tempDir || '', '') };
          primaryLanguage = "nodejs";
        }
      }

      // Find Python services
      const pythonResult = spawnSync('find', [
        analyzePath, '(', '-name', 'main.py', '-o', '-name', 'app.py', '-o', '-name', 'serve.py', ')',
        '-not', '-path', '*/.git/*', '-not', '-path', '*/venv/*', '-not', '-path', '*/site-packages/*'
      ], { encoding: 'utf-8', timeout: 30000 });
      
      const pythonApps = (pythonResult.stdout || '').trim().split('\n').filter(Boolean);
      for (const app of pythonApps) {
        const dir = path.dirname(app);
        const name = path.basename(dir);
        if (!services[name] && path.resolve(dir) !== path.resolve(analyzePath) && name !== '.') {
          services[name] = { type: 'python', path: dir.replace(tempDir || '', '') };
          if (primaryLanguage === "unknown") primaryLanguage = "python";
        }
      }

      // Detect databases/queues from docker-compose
      const dockerCompose = path.join(analyzePath, 'docker-compose.yml');
      if (fs.existsSync(dockerCompose)) {
        const content = fs.readFileSync(dockerCompose, 'utf-8');
        if (content.includes('postgres')) databases.push('postgres');
        if (content.includes('mysql')) databases.push('mysql');
        if (content.includes('mongo')) databases.push('mongodb');
        if (content.includes('redis')) queues.push('redis');
        if (content.includes('rabbitmq')) queues.push('rabbitmq');
      }

      const profile = {
        source: sourceUrl,
        services,
        databases,
        queues,
        service_count: Object.keys(services).length,
        primary_language: primaryLanguage,
        has_infrastructure: fs.existsSync(path.join(analyzePath, 'infra')) || fs.existsSync(path.join(analyzePath, 'terraform')),
        analyzed_at: new Date().toISOString(),
      };

      if (tempDir && fs.existsSync(tempDir)) {
        spawnSync('rm', ['-rf', tempDir], { timeout: 10000 });
      }

      return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
    } catch (error) {
      if (tempDir && fs.existsSync(tempDir)) {
        spawnSync('rm', ['-rf', tempDir], { timeout: 10000 });
      }
      return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 2: ingest_telemetry ==============
server.tool(
  "ingest_telemetry",
  "Collect and summarize service telemetry metrics (latency, error rate, CPU, memory)",
  {
    services: z.string().describe("Comma-separated service names to collect telemetry for"),
    metricsJson: z.string().optional().describe("Optional JSON with real metrics, otherwise generates mock data"),
  },
  async ({ services, metricsJson }) => {
    try {
      const serviceList = services.split(',').map(s => s.trim()).filter(Boolean);
      let summary: Record<string, any> = {};

      if (metricsJson) {
        summary = JSON.parse(metricsJson);
      } else {
        // Generate mock telemetry for demo
        for (const service of serviceList) {
          summary[service] = {
            p50: Math.floor(Math.random() * 200) + 50,
            p95: Math.floor(Math.random() * 400) + 150,
            avg_latency: Math.floor(Math.random() * 250) + 80,
            error_rate: Math.random() * 0.05,
            cost: Math.floor(Math.random() * 80) + 20,
            cpu_usage: Math.random() * 0.8 + 0.1,
            memory_mb: Math.floor(Math.random() * 512) + 128,
          };
        }
      }

      const result = {
        summary,
        collected_at: new Date().toISOString(),
        source: metricsJson ? "provided" : "mock",
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 3: propose_architecture ==============
server.tool(
  "propose_architecture",
  "Propose optimal cloud architecture using InFoundry's Oumi AI model",
  {
    serviceProfile: z.string().describe("JSON string of service profile from ingest_repo"),
    telemetrySummary: z.string().optional().describe("JSON string of telemetry from ingest_telemetry"),
    cloudProvider: z.string().optional().describe("Target cloud: aws, gcp, or azure (default: aws)"),
  },
  async ({ serviceProfile, telemetrySummary, cloudProvider = "aws" }) => {
    try {
      const profile = JSON.parse(serviceProfile);
      const serviceCount = profile.service_count || Object.keys(profile.services || {}).length;
      const hasDatabase = (profile.databases?.length || 0) > 0;
      const hasQueue = (profile.queues?.length || 0) > 0;

      let architecture: any = null;
      
      // Try Oumi model first (OpenAI-compatible endpoint)
      try {
        const prompt = `Recommend cloud architecture for: ${serviceCount} services, ${cloudProvider}, ${hasDatabase ? 'with database' : 'no database'}, ${hasQueue ? 'with queue' : 'no queue'}`;
        
        const response = await fetch("http://localhost:8000/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "oumi",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;
          if (content) {
            try {
              // Parse JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                architecture = JSON.parse(jsonMatch[0]);
                architecture.source = "oumi";
              }
            } catch {
              // JSON parse failed, use heuristic
            }
          }
        }
      } catch {
        // Oumi not available
      }
      
      // Fallback to heuristics
      if (!architecture) {
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

        if (hasDatabase && !components.includes("rds")) components.push("rds");
        if (hasQueue) components.push("sqs");

        architecture = {
          pattern,
          components,
          topology: `${serviceCount} services with ${pattern} on ${cloudProvider}`,
          scaling_strategy: serviceCount > 3 ? "horizontal_autoscaling" : "vertical_scaling",
          estimated_cost_tier: serviceCount > 4 ? "high" : serviceCount > 2 ? "medium" : "low",
          rationale: `Selected ${pattern} for ${serviceCount} services with ${hasDatabase ? 'database' : 'no database'}`,
          source: "heuristic",
        };
      }

      const result = {
        architecture,
        inputs: {
          service_count: serviceCount,
          cloud_provider: cloudProvider,
          primary_language: profile.primary_language || "unknown",
        },
        source: architecture.source,
        proposed_at: new Date().toISOString(),
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 4: render_graph ==============
server.tool(
  "render_graph",
  "Convert architecture plan to React Flow graph format for UI visualization",
  {
    architecturePlan: z.string().describe("JSON string of architecture plan from propose_architecture"),
  },
  async ({ architecturePlan }) => {
    try {
      const plan = JSON.parse(architecturePlan);
      const arch = plan.architecture || plan;
      const components: string[] = arch.components || [];
      const pattern = arch.pattern || "unknown";
      const scalingStrategy = arch.scaling_strategy || "vertical_scaling";

      // Component styling
      const STYLES: Record<string, { icon: string; color: string; category: string; tier: number }> = {
        api_gateway: { icon: "globe", color: "#FF9800", category: "network", tier: 1 },
        alb: { icon: "share-2", color: "#2196F3", category: "network", tier: 1 },
        ecs_cluster: { icon: "box", color: "#4CAF50", category: "compute", tier: 2 },
        eks_cluster: { icon: "layers", color: "#9C27B0", category: "compute", tier: 2 },
        lambda_functions: { icon: "zap", color: "#FF5722", category: "compute", tier: 2 },
        rds: { icon: "database", color: "#3F51B5", category: "database", tier: 3 },
        dynamodb: { icon: "grid", color: "#009688", category: "database", tier: 3 },
        elasticache: { icon: "cpu", color: "#E91E63", category: "cache", tier: 3 },
        sqs: { icon: "mail", color: "#607D8B", category: "messaging", tier: 3 },
        s3: { icon: "archive", color: "#795548", category: "storage", tier: 3 },
      };

      // Create nodes
      const byTier: Record<number, string[]> = {};
      for (const comp of components) {
        const style = STYLES[comp] || { tier: 5 };
        byTier[style.tier] = byTier[style.tier] || [];
        byTier[style.tier].push(comp);
      }

      let xOffset = 0;
      const nodes: any[] = [];
      const positions: Record<string, { x: number; y: number }> = {};

      for (const tier of Object.keys(byTier).map(Number).sort()) {
        const tierComps = byTier[tier];
        const startY = -(tierComps.length * 150) / 2 + 75;
        tierComps.forEach((comp, i) => {
          positions[comp] = { x: xOffset, y: startY + i * 150 };
        });
        xOffset += 280;
      }

      for (const comp of components) {
        const style = STYLES[comp] || { icon: "box", color: "#999", category: "other", tier: 5 };
        nodes.push({
          id: comp,
          type: "infrastructureNode",
          data: {
            label: comp.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            type: comp,
            icon: style.icon,
            category: style.category,
          },
          position: positions[comp] || { x: 0, y: 0 },
          style: { background: style.color, borderRadius: "8px" },
        });
      }

      // Create edges
      const EDGES: Record<string, string[]> = {
        api_gateway: ["lambda_functions", "ecs_cluster", "eks_cluster"],
        alb: ["ecs_cluster", "eks_cluster"],
        ecs_cluster: ["rds", "elasticache", "dynamodb", "sqs", "s3"],
        eks_cluster: ["rds", "elasticache", "dynamodb", "sqs", "s3"],
        lambda_functions: ["dynamodb", "s3", "sqs", "rds"],
      };

      const edges: any[] = [];
      const compSet = new Set(components);
      let edgeId = 0;

      for (const [source, targets] of Object.entries(EDGES)) {
        if (compSet.has(source)) {
          for (const target of targets) {
            if (compSet.has(target)) {
              edges.push({
                id: `e${edgeId++}`,
                source,
                target,
                type: "smoothstep",
                animated: source === "api_gateway" || source === "alb",
              });
            }
          }
        }
      }

      const graph = {
        nodes,
        edges,
        metadata: {
          pattern,
          scaling_strategy: scalingStrategy,
          component_count: nodes.length,
          edge_count: edges.length,
          source: plan.source || "unknown",
          cloud_provider: plan.inputs?.cloud_provider || "aws",
          generated_at: new Date().toISOString(),
        },
      };

      return { content: [{ type: "text", text: JSON.stringify(graph, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 5: generate_iac ==============
server.tool(
  "generate_iac",
  "Generate Terraform IaC from architecture graph",
  {
    graph: z.string().describe("JSON string of graph from render_graph"),
    cloudProvider: z.string().optional().describe("Cloud provider (default: aws)"),
    projectName: z.string().optional().describe("Project name for resource naming"),
    outputDir: z.string().optional().describe("Directory to write files (if provided, writes to disk)"),
  },
  async ({ graph, cloudProvider = "aws", projectName = "infoundry", outputDir }) => {
    try {
      const graphData = JSON.parse(graph);
      const components = graphData.nodes?.map((n: any) => n.id) || graphData.metadata?.components || [];
      const pattern = graphData.metadata?.pattern || "unknown";

      const templates: Record<string, string> = {
        api_gateway: `resource "aws_api_gateway_rest_api" "main" {
  name = "${projectName}-api"
}`,
        lambda_functions: `resource "aws_lambda_function" "main" {
  function_name = "${projectName}-handler"
  runtime       = "python3.11"
  handler       = "main.handler"
  role          = aws_iam_role.lambda.arn
}`,
        dynamodb: `resource "aws_dynamodb_table" "main" {
  name         = "${projectName}-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}`,
        ecs_cluster: `resource "aws_ecs_cluster" "main" {
  name = "${projectName}-cluster"
}`,
        eks_cluster: `resource "aws_eks_cluster" "main" {
  name     = "${projectName}-eks"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}`,
        alb: `resource "aws_lb" "main" {
  name               = "${projectName}-alb"
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}`,
        rds: `resource "aws_db_instance" "main" {
  identifier          = "${projectName}-db"
  engine              = "postgres"
  instance_class      = var.db_instance_class
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true
}`,
        elasticache: `resource "aws_elasticache_cluster" "main" {
  cluster_id      = "${projectName}-cache"
  engine          = "redis"
  node_type       = "cache.t3.micro"
  num_cache_nodes = 1
}`,
        sqs: `resource "aws_sqs_queue" "main" {
  name = "${projectName}-queue"
}`,
        s3: `resource "aws_s3_bucket" "main" {
  bucket = "${projectName}-storage"
}`,
      };

      let mainTf = `# Generated by InFoundry
# Pattern: ${pattern}

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

      for (const comp of components) {
        if (templates[comp]) {
          mainTf += `\n# ${comp.toUpperCase()}\n${templates[comp]}\n`;
        }
      }

      const variablesTf = `variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "dev"
}

variable "db_instance_class" {
  default = "db.t3.micro"
}

variable "db_username" {
  sensitive = true
}

variable "db_password" {
  sensitive = true
}

variable "subnet_ids" {
  type    = list(string)
  default = []
}

variable "public_subnet_ids" {
  type    = list(string)
  default = []
}
`;

      const result: any = {
        success: true,
        pattern,
        components,
        files: {
          "main.tf": mainTf,
          "variables.tf": variablesTf,
        },
        generated_at: new Date().toISOString(),
      };

      if (outputDir) {
        const resolvedDir = path.resolve(outputDir);
        fs.mkdirSync(resolvedDir, { recursive: true });
        fs.writeFileSync(path.join(resolvedDir, "main.tf"), mainTf);
        fs.writeFileSync(path.join(resolvedDir, "variables.tf"), variablesTf);
        result.output_dir = resolvedDir;
      }

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 6: validate_iac ==============
server.tool(
  "validate_iac",
  "Validate Terraform with fmt, init, validate, and optional tflint",
  {
    iacDir: z.string().describe("Directory containing Terraform files"),
  },
  async ({ iacDir }) => {
    const results: Record<string, any> = {};

    try {
      const safePath = validatePath(iacDir);

      // terraform fmt
      try {
        const fmtResult = spawnSync('terraform', ['fmt', '-check', '-recursive'], { cwd: safePath, encoding: 'utf-8' });
        results.terraform_fmt = { success: fmtResult.status === 0, message: fmtResult.status === 0 ? "Passed" : "Needs formatting" };
      } catch (e: any) {
        results.terraform_fmt = { success: false, message: e.message };
      }

      // terraform init + validate
      try {
        const initResult = spawnSync('terraform', ['init', '-backend=false'], { cwd: safePath, encoding: 'utf-8' });
        if (initResult.status === 0) {
          const validateResult = spawnSync('terraform', ['validate'], { cwd: safePath, encoding: 'utf-8' });
          results.terraform_validate = { success: validateResult.status === 0, message: validateResult.status === 0 ? "Valid" : validateResult.stderr };
        } else {
          results.terraform_validate = { success: false, message: "Init failed: " + initResult.stderr };
        }
      } catch (e: any) {
        results.terraform_validate = { success: false, message: e.message };
      }

      // tflint (optional)
      try {
        const lintResult = spawnSync('tflint', [], { cwd: safePath, encoding: 'utf-8' });
        if (lintResult.error && (lintResult.error as any).code === 'ENOENT') {
          results.tflint = { skipped: true, message: "tflint not installed" };
        } else {
          results.tflint = { success: lintResult.status === 0, output: lintResult.stdout };
        }
      } catch {
        results.tflint = { skipped: true, message: "tflint not available" };
      }

      const allPassed = Object.values(results).every((r: any) => r?.success || r?.skipped);

      return {
        content: [{ type: "text", text: JSON.stringify({
          valid: allPassed,
          deploy_status: allPassed ? "validated" : "failed",
          checks: results,
          validated_at: new Date().toISOString(),
        }, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 7: create_pr ==============
server.tool(
  "create_pr",
  "Create a GitHub PR with generated IaC files",
  {
    repository: z.string().describe("GitHub repository in owner/repo format"),
    files: z.union([z.string(), z.record(z.string())]).describe("Files as JSON string or object with filename: content pairs"),
    targetFolder: z.string().optional().describe("Target folder in repo (default: infra)"),
    baseBranch: z.string().optional().describe("Base branch (default: main)"),
    labels: z.union([z.string(), z.array(z.string())]).optional().describe("Labels to add (comma-separated string or array)"),
  },
  async ({ repository, files, targetFolder = "infra", baseBranch = "main", labels }) => {
    // Handle both string and object input for files
    const fileMap: Record<string, string> = typeof files === 'string' ? JSON.parse(files) : files;
    // Handle labels as string or array
    const labelList: string[] = labels 
      ? (typeof labels === 'string' ? labels.split(',').map(l => l.trim()) : labels)
      : ['infoundry', 'infrastructure'];
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return {
        content: [{ type: "text", text: JSON.stringify({
          success: false,
          error: "GITHUB_TOKEN not set",
          hint: "export GITHUB_TOKEN=ghp_...",
        }, null, 2) }],
        isError: true,
      };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const branch = `infoundry/iac-${timestamp}`;
      
      const headers = {
        "Authorization": `token ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "InFoundry-MCP-Server",
      };

      const apiBase = `https://api.github.com/repos/${repository}`;

      // Get base SHA
      const refResponse = await fetch(`${apiBase}/git/refs/heads/${baseBranch}`, { headers });
      if (!refResponse.ok) throw new Error(`Failed to get base branch`);
      const refData = await refResponse.json();
      const baseSha = refData.object.sha;

      // Create branch
      await fetch(`${apiBase}/git/refs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      });

      // Upload files
      for (const [filename, content] of Object.entries(fileMap)) {
        const filePath = `${targetFolder}/${filename}`;
        await fetch(`${apiBase}/contents/${filePath}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `Add ${filename} via InFoundry`,
            content: Buffer.from(content as string).toString("base64"),
            branch,
          }),
        });
      }

      // Create PR
      const prResponse = await fetch(`${apiBase}/pulls`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `[InFoundry] Infrastructure Update ${timestamp}`,
          body: "This PR was automatically generated by InFoundry Architect.",
          head: branch,
          base: baseBranch,
        }),
      });

      if (!prResponse.ok) throw new Error(`Failed to create PR: ${await prResponse.text()}`);
      const prData = await prResponse.json();

      // Add labels to PR
      if (labelList.length > 0) {
        await fetch(`${apiBase}/issues/${prData.number}/labels`, {
          method: "POST",
          headers,
          body: JSON.stringify({ labels: labelList }),
        });
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          success: true,
          pr_url: prData.html_url,
          pr_number: prData.number,
          branch,
          files: Object.keys(fileMap),
          labels: labelList,
        }, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 8: validate_pr ==============
server.tool(
  "validate_pr",
  "Check PR status including CI checks and CodeRabbit reviews",
  {
    repository: z.string().describe("GitHub repository in owner/repo format"),
    prNumber: z.number().describe("Pull Request number"),
  },
  async ({ repository, prNumber }) => {
    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "InFoundry-MCP-Server",
    };
    if (githubToken) headers["Authorization"] = `token ${githubToken}`;

    try {
      // Get PR details
      const prResponse = await fetch(`https://api.github.com/repos/${repository}/pulls/${prNumber}`, { headers });
      if (!prResponse.ok) throw new Error(`PR not found`);
      const pr = await prResponse.json();

      // Get CI checks
      const checksResponse = await fetch(`https://api.github.com/repos/${repository}/commits/${pr.head.sha}/check-runs`, { headers });
      let checks: any[] = [];
      if (checksResponse.ok) {
        const checksData = await checksResponse.json();
        checks = (checksData.check_runs || []).map((c: any) => ({
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
        }));
      }

      // Get reviews
      const reviewsResponse = await fetch(`https://api.github.com/repos/${repository}/pulls/${prNumber}/reviews`, { headers });
      let reviews: any[] = [];
      if (reviewsResponse.ok) {
        reviews = (await reviewsResponse.json()).map((r: any) => ({
          user: r.user?.login,
          state: r.state,
        }));
      }

      const allChecksPassed = checks.every(c => c.conclusion === "success" || c.status !== "completed");
      const hasApproval = reviews.some(r => r.state === "APPROVED");

      return {
        content: [{ type: "text", text: JSON.stringify({
          pr_number: prNumber,
          state: pr.state,
          mergeable: pr.mergeable,
          draft: pr.draft,
          checks,
          reviews,
          all_checks_passed: allChecksPassed,
          has_approval: hasApproval,
          ready_to_merge: pr.mergeable && allChecksPassed && !pr.draft,
          validated_at: new Date().toISOString(),
        }, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// ============== STEP 9: evaluate ==============
server.tool(
  "evaluate",
  "AI evaluation of deployment/validation results with recommendations",
  {
    deployResult: z.string().describe("JSON string of validation/deployment result from validate_iac"),
  },
  async ({ deployResult }) => {
    try {
      const deploy = JSON.parse(deployResult);
      let score = 0;
      let recommendation = "review";
      const feedback: string[] = [];
      const improvements: string[] = [];

      // Calculate score based on validation results
      if (deploy.valid || deploy.deploy_status === "validated") {
        score += 0.5;
        feedback.push("Terraform validation passed");
      } else {
        feedback.push("Terraform validation failed");
        improvements.push("Fix validation errors before deploying");
      }

      if (deploy.checks?.terraform_fmt?.success) {
        score += 0.2;
      } else {
        improvements.push("Run 'terraform fmt' to fix formatting");
      }

      if (deploy.checks?.terraform_validate?.success) {
        score += 0.2;
      }

      if (deploy.checks?.tflint?.success || deploy.checks?.tflint?.skipped) {
        score += 0.1;
      } else {
        improvements.push("Address tflint warnings for best practices");
      }

      // Determine recommendation
      if (score >= 0.8) {
        recommendation = "proceed";
      } else if (score >= 0.5) {
        recommendation = "review";
      } else {
        recommendation = "reject";
      }

      const result = {
        score: Math.round(score * 100) / 100,
        recommendation,
        feedback: feedback.join(". "),
        improvements,
        source: "infoundry-evaluator",
        evaluated_at: new Date().toISOString(),
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("InFoundry MCP Server running on stdio - 9 workflow tools available");
}

main().catch(console.error);
