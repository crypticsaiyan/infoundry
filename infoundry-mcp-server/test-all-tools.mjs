#!/usr/bin/env node
/**
 * Test script for InFoundry MCP Server - All 9 Workflow Steps
 */

import { spawn } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const server = spawn('node', ['dist/index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;

function sendRequest(method, params = {}) {
  const request = { jsonrpc: '2.0', id: messageId++, method, params };
  console.log(`\n→ [${request.id}] ${params.name || method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

const rl = readline.createInterface({ input: server.stdout });
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    const content = response.result?.content?.[0]?.text;
    if (content) {
      const parsed = JSON.parse(content);
      const preview = JSON.stringify(parsed, null, 2).slice(0, 400);
      console.log(`← Response:`, preview, preview.length >= 400 ? '...' : '');
      console.log(response.result?.isError ? '   ⚠️ Error' : '   ✅ Success');
    } else if (response.result?.tools) {
      console.log(`← Found ${response.result.tools.length} tools:`, response.result.tools.map(t => t.name).join(', '));
    }
  } catch { }
});

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg.includes('running')) console.log('🚀', msg);
});

// Test data
const sampleProfile = JSON.stringify({
  services: { api: { type: 'python' }, web: { type: 'nodejs' } },
  databases: ['postgres'],
  queues: ['redis'],
  service_count: 2,
  primary_language: 'python'
});

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   InFoundry MCP Server - 9 Workflow Steps Test         ║');
console.log('╚════════════════════════════════════════════════════════╝');

setTimeout(() => sendRequest('tools/list'), 500);

setTimeout(() => {
  console.log('\n━━━ Step 1: ingest_repo ━━━');
  sendRequest('tools/call', { name: 'ingest_repo', arguments: { repoPath: projectRoot } });
}, 1000);

setTimeout(() => {
  console.log('\n━━━ Step 2: ingest_telemetry ━━━');
  sendRequest('tools/call', { name: 'ingest_telemetry', arguments: { services: 'api,web,db' } });
}, 2000);

setTimeout(() => {
  console.log('\n━━━ Step 3: propose_architecture ━━━');
  sendRequest('tools/call', { name: 'propose_architecture', arguments: { serviceProfile: sampleProfile } });
}, 3000);

setTimeout(() => {
  const archPlan = JSON.stringify({
    architecture: { pattern: 'serverless', components: ['api_gateway', 'lambda_functions', 'dynamodb', 'rds'] },
    source: 'test'
  });
  console.log('\n━━━ Step 4: render_graph ━━━');
  sendRequest('tools/call', { name: 'render_graph', arguments: { architecturePlan: archPlan } });
}, 4000);

setTimeout(() => {
  const graph = JSON.stringify({
    nodes: [{ id: 'api_gateway' }, { id: 'lambda_functions' }],
    metadata: { pattern: 'serverless' }
  });
  console.log('\n━━━ Step 5: generate_iac ━━━');
  sendRequest('tools/call', { name: 'generate_iac', arguments: { graph, projectName: 'test' } });
}, 5000);

setTimeout(() => {
  console.log('\n━━━ Step 6-9: validate_iac, create_pr, validate_pr, evaluate ━━━');
  console.log('   ℹ️ Skipped (require terraform/GITHUB_TOKEN)');
}, 6000);

setTimeout(() => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              All Tests Complete!                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  server.kill();
  process.exit(0);
}, 7000);
