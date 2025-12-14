import { NextResponse } from 'next/server';

// Kestra API configuration
const KESTRA_API_URL = process.env.KESTRA_API_URL || 'http://localhost:8080';
const KESTRA_TENANT = process.env.KESTRA_TENANT || 'main';
const KESTRA_NAMESPACE = 'infoundry';

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
 * POST /api/kestra/execute
 * Triggers the end-to-end Kestra pipeline
 */
export async function POST(request) {
  try {
    const inputs = await request.json();

    // Validate required inputs
    if (!inputs.repo_url) {
      return NextResponse.json(
        { error: 'repo_url is required' },
        { status: 400 }
      );
    }

    // Kestra API requires multipart/form-data for inputs
    // URL format: /api/v1/{tenant}/executions/{namespace}/{flowId}
    const kestraUrl = `${KESTRA_API_URL}/api/v1/${KESTRA_TENANT}/executions/${KESTRA_NAMESPACE}/end-to-end`;
    
    // Build FormData with inputs
    const formData = new FormData();
    formData.append('repo_url', inputs.repo_url);
    formData.append('branch', inputs.branch || 'main');
    formData.append('repository', inputs.repository || 'crypticsaiyan/infotest');
    formData.append('cloud_provider', inputs.cloud_provider || 'aws');
    formData.append('project_name', inputs.project_name || 'infoundry');
    formData.append('target_folder', inputs.target_folder || 'infra');
    formData.append('skip_pr', String(inputs.skip_pr || false));
    formData.append('skip_validation', String(inputs.skip_validation || false));
    
    const response = await fetch(kestraUrl, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        // Note: Don't set Content-Type, fetch will set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kestra API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to trigger pipeline', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      executionId: data.id,
      state: data.state?.current || 'CREATED',
      message: 'Pipeline triggered successfully',
    });

  } catch (error) {
    console.error('Error triggering pipeline:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
