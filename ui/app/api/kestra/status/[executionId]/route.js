import { NextResponse } from 'next/server';
import { STATE_MAP } from '@/lib/kestra';

// Pin to Node.js runtime (required for Buffer usage)
export const runtime = 'nodejs';

// Kestra API configuration
const KESTRA_API_URL = process.env.KESTRA_API_URL || 'http://localhost:8080';
const KESTRA_TENANT = process.env.KESTRA_TENANT || 'main';
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout

/**
 * Build request headers containing an Authorization entry for Kestra based on available environment credentials.
 *
 * Prefers a bearer token from `KESTRA_API_TOKEN`; if absent, uses Basic auth from `KESTRA_USERNAME` and `KESTRA_PASSWORD`. Returns an empty object when no credentials are configured.
 * @returns {Object} An object of HTTP headers; includes an `Authorization` header when credentials are available. 
 */
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
 * Fetches and returns a normalized Kestra execution status for the provided executionId.
 *
 * @param {Request} request - The incoming Next.js request object.
 * @param {{ params: { executionId?: string } }} context - Route context containing path parameters.
 * @param {Object} context.params.executionId - The execution identifier extracted from the route.
 * @returns {Object} A JSON payload with the execution summary:
 *  - executionId: The Kestra execution id.
 *  - state: Mapped, frontend-friendly execution state (defaults to "pending" if unknown).
 *  - rawState: The original Kestra execution state string.
 *  - startDate: Execution start timestamp (if available).
 *  - endDate: Execution end timestamp (if available).
 *  - taskRuns: Array of normalized task run objects, each with:
 *      - id: Task id.
 *      - state: Mapped task state (defaults to "pending" if unknown).
 *      - rawState: Original Kestra task state string.
 *      - startDate: Task start timestamp (if available).
 *      - endDate: Task end timestamp (if available).
 *      - outputs: Task outputs with nested `outputs` flattened when present.
 *      - error: Task error payload when the raw state is "FAILED", otherwise `null`.
 *  - outputs: Execution-level outputs object (empty object when absent).
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

    // URL-encode the executionId to prevent injection/malformed URLs
    const encodedExecutionId = encodeURIComponent(executionId);
    
    // URL format: /api/v1/{tenant}/executions/{executionId}
    const kestraUrl = `${KESTRA_API_URL}/api/v1/${KESTRA_TENANT}/executions/${encodedExecutionId}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    let response;
    try {
      response = await fetch(kestraUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...getAuthHeaders(),
        },
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Handle timeout or network errors
      if (fetchError.name === 'AbortError') {
        console.error('Kestra API timeout:', kestraUrl);
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      // Log detailed error on server, return generic message to client
      const errorText = await response.text();
      console.error('Kestra API error:', {
        status: response.status,
        url: kestraUrl,
        body: errorText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch execution status. Please try again.' },
        { status: response.status >= 500 ? 502 : response.status }
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
    // Log detailed error on server, return generic message to client
    console.error('Error fetching execution status:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}