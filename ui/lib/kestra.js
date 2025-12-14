/**
 * Kestra API Service
 * Handles communication with Kestra via Next.js API proxy routes
 * 
 * All Kestra calls go through /api/kestra/* routes which handle
 * authentication and KESTRA_API_URL configuration server-side.
 */

// Task ID to step mapping for the end-to-end pipeline
export const PIPELINE_STEPS = [
  { id: 'ingest_repo', label: 'Ingest Repo', order: 1 },
  { id: 'ingest_telemetry', label: 'Telemetry', order: 2 },
  { id: 'propose_architecture', label: 'Propose Arch', order: 3 },
  { id: 'render_graph', label: 'Render Graph', order: 4 },
  { id: 'generate_iac', label: 'Generate IaC', order: 5 },
  { id: 'validate_iac', label: 'Validate IaC', order: 6 },
  { id: 'create_pr', label: 'Create PR', order: 7 },
  { id: 'validate_pr', label: 'Validate PR', order: 8 },
  { id: 'evaluate', label: 'Evaluate', order: 9 },
];

// Kestra execution states mapped to UI states
export const STATE_MAP = {
  CREATED: 'pending',
  QUEUED: 'pending',
  RUNNING: 'running',
  SUCCESS: 'completed',
  WARNING: 'completed',
  FAILED: 'failed',
  RETRYING: 'running',
  PAUSED: 'pending',
  KILLED: 'failed',
};

/**
 * Trigger the end-to-end pipeline via Next.js API proxy
 * @param {Object} inputs - Pipeline input parameters
 * @returns {Promise<{executionId: string}>}
 */
export async function triggerPipeline(inputs) {
  const response = await fetch('/api/kestra/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to trigger pipeline');
  }

  return response.json();
}

/**
 * Get execution status and task runs via Next.js API proxy
 * @param {string} executionId 
 * @returns {Promise<{state: string, taskRuns: Array}>}
 */
export async function getExecutionStatus(executionId) {
  const response = await fetch(`/api/kestra/status/${encodeURIComponent(executionId)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get execution status');
  }

  return response.json();
}

/**
 * Get file content from Kestra storage via Next.js API proxy
 * @param {string} uri - Kestra internal storage URI (kestra:///...)
 * @returns {Promise<Object>}
 */
export async function getFileContent(uri) {
  const response = await fetch(`/api/kestra/file?uri=${encodeURIComponent(uri)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Map execution data to step progress format
 * @param {Object} executionData 
 * @returns {Array<{id, label, order, state, startDate, endDate, outputs}>}
 */
export function mapToStepProgress(executionData) {
  const taskRunMap = new Map(
    executionData.taskRuns.map(tr => [tr.id, tr])
  );

  return PIPELINE_STEPS.map(step => {
    const taskRun = taskRunMap.get(step.id);
    return {
      ...step,
      state: taskRun?.state || 'pending',
      startDate: taskRun?.startDate,
      endDate: taskRun?.endDate,
      outputs: taskRun?.outputs || {},
    };
  });
}

/**
 * Calculate duration between two dates
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {string} Duration in human-readable format
 */
export function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
  return `${Math.round(diffMs / 3600000)}h`;
}
