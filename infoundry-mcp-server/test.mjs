#!/usr/bin/env node
/**
 * Test script for InFoundry MCP Server
 * 
 * Usage: node test.mjs
 */

import { spawn } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Compute paths relative to this file for portability
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const server = spawn('node', ['dist/index.js'], {
  cwd: __dirname,  // Run from infoundry-mcp-server directory
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };
  console.log('\n→ Request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Parse server output
const rl = readline.createInterface({ input: server.stdout });
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('\n← Response:', JSON.stringify(response, null, 2));
  } catch {
    console.log('Server:', line);
  }
});

server.stderr.on('data', (data) => {
  console.log('Info:', data.toString().trim());
});

// Wait for server to start, then run tests
setTimeout(() => {
  console.log('\n=== Testing InFoundry MCP Server ===\n');
  
  // 1. List available tools
  sendRequest('tools/list');
  
  // 2. Test analyze_repo after a delay - use project root for portability
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'analyze_repo',
      arguments: {
        repoPath: projectRoot  // Relative to this test file's location
      }
    });
  }, 500);
  
  // 3. Exit after tests
  setTimeout(() => {
    console.log('\n=== Tests complete ===');
    server.kill();
    process.exit(0);
  }, 2000);
  
}, 500);
