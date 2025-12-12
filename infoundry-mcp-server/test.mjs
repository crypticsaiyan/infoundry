#!/usr/bin/env node
/**
 * Test script for InFoundry MCP Server
 */

import { spawn } from 'child_process';
import * as readline from 'readline';

const server = spawn('node', ['dist/index.js'], {
  cwd: '/home/cryptosaiyan/Documents/infoundry/infoundry-mcp-server',
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
  
  // 2. Test analyze_repo after a delay
  setTimeout(() => {
    sendRequest('tools/call', {
      name: 'analyze_repo',
      arguments: {
        repoPath: '/home/cryptosaiyan/Documents/infoundry'
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
