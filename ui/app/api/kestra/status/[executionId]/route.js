import { NextResponse } from 'next/server';

// Kestra API configuration
const KESTRA_API_URL = process.env.KESTRA_API_URL || 'http://localhost:8080';
const KESTRA_TENANT = process.env.KESTRA_TENANT || 'main';

// Kestra state to UI state mapping
const STATE_MAP = {
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

// Build auth headers based on available credentials
function getAuthHeaders() {
  const headers = {};
  
  // Option 1: API Token (Bearer)
  if (process.env.KESTRA_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.KESTRA_API_TOKEN}`;
  }
  // Option 2: Basic Auth (username:password)
  else if (process.env.KESTRA_USERNAME && process.env.KESTRA_PASSWORD) {
    const credentials = Buffer.from(
      `${process.env.KESTRA_USERNAME}:${process.env.KESTRA_PASSWORD}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }
  
  return headers;
}

/**
 * GET /api/kestra/status/[executionId]
 * Fetches the execution status from Kestra
 */
export async function GET(request, { params }) {
  try {
    const { executionId } = await params;

    if (!executionId) {
      return NextResponse.json(
        { error: 'executionId is required' },
        { status: 400 }
      );
    }

    // URL format: /api/v1/{tenant}/executions/{executionId}
    const kestraUrl = `${KESTRA_API_URL}/api/v1/${KESTRA_TENANT}/executions/${executionId}`;
    
    const response = await fetch(kestraUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kestra API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get execution status', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Normalize task runs for frontend consumption
    // Note: Kestra outputs have structure {state, outputs: {...}, executionId}
    // We need to extract the inner 'outputs' object
    const taskRuns = (data.taskRunList || []).map(task => {
      // Extract the actual outputs from the nested structure
      const rawOutputs = task.outputs || {};
      const actualOutputs = rawOutputs.outputs || rawOutputs;
      
      return {
        id: task.taskId,
        state: STATE_MAP[task.state?.current] || 'pending',
        rawState: task.state?.current,
        startDate: task.state?.startDate,
        endDate: task.state?.endDate,
        outputs: actualOutputs,
        error: task.state?.current === 'FAILED' ? task.outputs?.error : null,
      };
    });

    return NextResponse.json({
      executionId: data.id,
      state: STATE_MAP[data.state?.current] || 'pending',
      rawState: data.state?.current,
      startDate: data.state?.startDate,
      endDate: data.state?.endDate,
      taskRuns,
      outputs: data.outputs || {},
    });

  } catch (error) {
    console.error('Error fetching execution status:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
