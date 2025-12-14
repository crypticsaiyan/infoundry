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
 * Starts the Kestra end-to-end pipeline using the application's Next.js API proxy.
 * @param {Object} inputs - Pipeline input parameters passed to the execution endpoint.
 * @returns {{executionId: string}} Object containing the started execution's `executionId`.
 * @throws {Error} If the API responds with a non-OK status; the response's error message is used when available.
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
 * Retrieve a Kestra execution's state and its task runs.
 * @param {string} executionId - Kestra execution identifier.
 * @returns {Promise<{state: string, taskRuns: Array}>} An object containing `state` and an array of `taskRuns`.
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
 * Fetches and returns the parsed JSON content of a Kestra storage file.
 * @param {string} uri - Kestra storage URI (e.g. "kestra:///path/to/object").
 * @returns {Object|null} The parsed JSON content of the file, or `null` if the request failed or the resource was not retrievable.
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
 * Convert Kestra execution data into the pipeline step list enriched with progress metadata.
 *
 * @param {Object} executionData - Execution payload containing a `taskRuns` array of task run objects.
 *   Each task run object is expected to include `id`, `state`, `startDate`, `endDate`, and `outputs`.
 * @returns {Array<{id: string, label: string, order: number, state: string, startDate?: string, endDate?: string, outputs: Object}>}
 *   An array of pipeline steps (from PIPELINE_STEPS) where each step is augmented with `state`,
 *   `startDate`, `endDate`, and `outputs`. If a corresponding task run is missing, `state` is `"pending"`
 *   and `outputs` is an empty object.
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
 * Produce a human-readable duration between two ISO date strings.
 * @param {string} startDate - ISO 8601 start timestamp.
 * @param {string} endDate - ISO 8601 end timestamp.
 * @returns {string|null} Duration expressed in `ms`, `s`, `m`, or `h`, or `null` if either input is missing.
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