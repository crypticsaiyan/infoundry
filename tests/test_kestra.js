/**
 * Unit tests for ui/lib/kestra.js
 * 
 * Tests the Kestra API utility functions including state mapping,
 * step progress mapping, and duration calculation.
 * 
 * Run with: node test_kestra.js
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';

// Import the functions to test
import {
  PIPELINE_STEPS,
  STATE_MAP,
  mapToStepProgress,
  calculateDuration,
} from '../ui/lib/kestra.js';


describe('PIPELINE_STEPS', () => {
  it('should have 9 pipeline steps', () => {
    assert.strictEqual(PIPELINE_STEPS.length, 9);
  });

  it('should have correct step IDs', () => {
    const expectedIds = [
      'ingest_repo',
      'ingest_telemetry',
      'propose_architecture',
      'render_graph',
      'generate_iac',
      'validate_iac',
      'create_pr',
      'validate_pr',
      'evaluate',
    ];
    
    const actualIds = PIPELINE_STEPS.map(step => step.id);
    assert.deepStrictEqual(actualIds, expectedIds);
  });

  it('should have sequential order values', () => {
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      assert.strictEqual(PIPELINE_STEPS[i].order, i + 1);
    }
  });

  it('should have label for each step', () => {
    for (const step of PIPELINE_STEPS) {
      assert.ok(step.label, `Step ${step.id} should have a label`);
      assert.ok(typeof step.label === 'string', `Step ${step.id} label should be string`);
    }
  });
});


describe('STATE_MAP', () => {
  it('should map CREATED to pending', () => {
    assert.strictEqual(STATE_MAP.CREATED, 'pending');
  });

  it('should map QUEUED to pending', () => {
    assert.strictEqual(STATE_MAP.QUEUED, 'pending');
  });

  it('should map RUNNING to running', () => {
    assert.strictEqual(STATE_MAP.RUNNING, 'running');
  });

  it('should map SUCCESS to completed', () => {
    assert.strictEqual(STATE_MAP.SUCCESS, 'completed');
  });

  it('should map WARNING to completed', () => {
    assert.strictEqual(STATE_MAP.WARNING, 'completed');
  });

  it('should map FAILED to failed', () => {
    assert.strictEqual(STATE_MAP.FAILED, 'failed');
  });

  it('should map RETRYING to running', () => {
    assert.strictEqual(STATE_MAP.RETRYING, 'running');
  });

  it('should map PAUSED to pending', () => {
    assert.strictEqual(STATE_MAP.PAUSED, 'pending');
  });

  it('should map KILLED to failed', () => {
    assert.strictEqual(STATE_MAP.KILLED, 'failed');
  });

  it('should have all expected states', () => {
    const expectedStates = ['CREATED', 'QUEUED', 'RUNNING', 'SUCCESS', 'WARNING', 'FAILED', 'RETRYING', 'PAUSED', 'KILLED'];
    for (const state of expectedStates) {
      assert.ok(state in STATE_MAP, `STATE_MAP should include ${state}`);
    }
  });
});


describe('mapToStepProgress', () => {
  it('should return array with same length as PIPELINE_STEPS', () => {
    const executionData = { taskRuns: [] };
    const result = mapToStepProgress(executionData);
    
    assert.strictEqual(result.length, PIPELINE_STEPS.length);
  });

  it('should return pending state for missing tasks', () => {
    const executionData = { taskRuns: [] };
    const result = mapToStepProgress(executionData);
    
    for (const step of result) {
      assert.strictEqual(step.state, 'pending');
    }
  });

  it('should return empty outputs for missing tasks', () => {
    const executionData = { taskRuns: [] };
    const result = mapToStepProgress(executionData);
    
    for (const step of result) {
      assert.deepStrictEqual(step.outputs, {});
    }
  });

  it('should map task run states correctly', () => {
    const executionData = {
      taskRuns: [
        { id: 'ingest_repo', state: 'SUCCESS', outputs: { result: 'done' } }
      ]
    };
    
    const result = mapToStepProgress(executionData);
    const ingestStep = result.find(s => s.id === 'ingest_repo');
    
    assert.strictEqual(ingestStep.state, 'SUCCESS');
    assert.deepStrictEqual(ingestStep.outputs, { result: 'done' });
  });

  it('should include startDate and endDate from task runs', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T10:01:00Z';
    
    const executionData = {
      taskRuns: [
        { id: 'ingest_repo', state: 'SUCCESS', startDate, endDate, outputs: {} }
      ]
    };
    
    const result = mapToStepProgress(executionData);
    const ingestStep = result.find(s => s.id === 'ingest_repo');
    
    assert.strictEqual(ingestStep.startDate, startDate);
    assert.strictEqual(ingestStep.endDate, endDate);
  });

  it('should preserve original step properties', () => {
    const executionData = { taskRuns: [] };
    const result = mapToStepProgress(executionData);
    
    for (let i = 0; i < result.length; i++) {
      assert.strictEqual(result[i].id, PIPELINE_STEPS[i].id);
      assert.strictEqual(result[i].label, PIPELINE_STEPS[i].label);
      assert.strictEqual(result[i].order, PIPELINE_STEPS[i].order);
    }
  });

  it('should handle multiple task runs', () => {
    const executionData = {
      taskRuns: [
        { id: 'ingest_repo', state: 'SUCCESS', outputs: {} },
        { id: 'ingest_telemetry', state: 'RUNNING', outputs: {} },
        { id: 'propose_architecture', state: 'QUEUED', outputs: {} },
      ]
    };
    
    const result = mapToStepProgress(executionData);
    
    assert.strictEqual(result.find(s => s.id === 'ingest_repo').state, 'SUCCESS');
    assert.strictEqual(result.find(s => s.id === 'ingest_telemetry').state, 'RUNNING');
    assert.strictEqual(result.find(s => s.id === 'propose_architecture').state, 'QUEUED');
    assert.strictEqual(result.find(s => s.id === 'render_graph').state, 'pending');
  });
});


describe('calculateDuration', () => {
  it('should return null if startDate is missing', () => {
    const result = calculateDuration(null, '2024-01-01T10:01:00Z');
    assert.strictEqual(result, null);
  });

  it('should return null if endDate is missing', () => {
    const result = calculateDuration('2024-01-01T10:00:00Z', null);
    assert.strictEqual(result, null);
  });

  it('should return null if both dates are missing', () => {
    const result = calculateDuration(null, null);
    assert.strictEqual(result, null);
  });

  it('should return milliseconds for sub-second durations', () => {
    const startDate = '2024-01-01T10:00:00.000Z';
    const endDate = '2024-01-01T10:00:00.500Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '500ms');
  });

  it('should return seconds for sub-minute durations', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T10:00:30Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '30s');
  });

  it('should return minutes for sub-hour durations', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T10:05:00Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '5m');
  });

  it('should return hours for long durations', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T12:00:00Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '2h');
  });

  it('should round seconds correctly', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T10:00:45Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '45s');
  });

  it('should round minutes correctly', () => {
    const startDate = '2024-01-01T10:00:00Z';
    const endDate = '2024-01-01T10:30:00Z';
    
    const result = calculateDuration(startDate, endDate);
    assert.strictEqual(result, '30m');
  });
});


// Run tests summary
console.log('\n✅ All Kestra utility tests defined');
console.log('Run with: node --test tests/test_kestra.js\n');
