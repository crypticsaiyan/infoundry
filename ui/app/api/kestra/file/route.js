import { NextResponse } from 'next/server';

// Kestra API configuration
const KESTRA_API_URL = process.env.KESTRA_API_URL || 'http://localhost:8080';
const KESTRA_TENANT = process.env.KESTRA_TENANT || 'main';

/**
 * Build HTTP authentication headers for Kestra using available environment credentials.
 *
 * Prefers an API token when KESTRA_API_TOKEN is set; otherwise uses Basic auth when
 * KESTRA_USERNAME and KESTRA_PASSWORD are provided. If no credentials are available,
 * returns an empty object.
 *
 * @returns {Object} An object containing an `Authorization` header (`Bearer <token>` or `Basic <credentials>`) or an empty object if no credentials are configured.
 */
function getAuthHeaders() {
  const headers = {};
  
  if (process.env.KESTRA_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.KESTRA_API_TOKEN}`;
  } else if (process.env.KESTRA_USERNAME && process.env.KESTRA_PASSWORD) {
    const credentials = Buffer.from(
      `${process.env.KESTRA_USERNAME}:${process.env.KESTRA_PASSWORD}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }
  
  return headers;
}

/**
 * Extract the execution ID from a Kestra internal URI.
 *
 * @param {string} uri - Kestra internal URI (e.g., "kestra:///namespace/flowId/executions/EXEC_ID/tasks/...").
 * @returns {string|null} The execution ID string if found, `null` otherwise.
 */
function extractExecutionId(uri) {
  const match = uri.match(/executions\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Handle GET /api/kestra/file?uri=... and return the content of a Kestra-stored file.
 *
 * Processes the `uri` query parameter to extract an execution ID, proxies a request to the Kestra
 * file API, and returns one of:
 * - the parsed JSON file content (when the file is valid JSON),
 * - { type: 'text', content } for plain-text content,
 * - { type: 'binary', contentType, size, message } for large/binary responses,
 * or an error JSON when the `uri` is missing/invalid, Kestra responds with an error, or an internal
 * error occurs.
 *
 * @param {Request} request - Incoming request containing the `uri` query parameter.
 * @returns {import('next/server').NextResponse} JSON response with the file content or an error object.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uri = searchParams.get('uri');

    if (!uri) {
      return NextResponse.json(
        { error: 'uri parameter is required' },
        { status: 400 }
      );
    }

    // Extract execution ID from the URI
    const executionId = extractExecutionId(uri);
    
    if (!executionId) {
      return NextResponse.json(
        { error: 'Could not extract execution ID from URI', uri },
        { status: 400 }
      );
    }

    // Correct Kestra API endpoint: /api/v1/{tenant}/executions/{executionId}/file?path={full_kestra_uri}
    const kestraUrl = `${KESTRA_API_URL}/api/v1/${KESTRA_TENANT}/executions/${executionId}/file?path=${encodeURIComponent(uri)}`;
    
    console.log('Fetching file from:', kestraUrl);
    
    const response = await fetch(kestraUrl, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kestra file fetch error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch file', details: errorText, uri },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Always try to get the text content first
    const text = await response.text();
    
    // Try to parse as JSON (even for octet-stream, Kestra often returns JSON this way)
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      // Only treat as binary if it's actually binary (not parseable as JSON)
      if (contentType.includes('application/zip') || 
          (contentType.includes('octet-stream') && text.length > 10000)) {
        return NextResponse.json({
          type: 'binary',
          contentType,
          size: response.headers.get('content-length'),
          message: 'Binary file - download from Kestra UI',
        });
      }
      
      // Return as plain text
      return NextResponse.json({ type: 'text', content: text });
    }

  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}