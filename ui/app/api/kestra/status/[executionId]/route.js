import { NextResponse } from 'next/server';
import { STATE_MAP } from '@/lib/kestra';

// Pin to Node.js runtime (required for Buffer usage)
export const runtime = 'nodejs';

// Kestra API configuration
const KESTRA_API_URL = process.env.KESTRA_API_URL || 'http://localhost:8080';
const KESTRA_TENANT = process.env.KESTRA_TENANT || 'main';
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout

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
