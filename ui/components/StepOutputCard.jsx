"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader, 
  Download, FileJson, Image, Package, AlertTriangle 
} from 'lucide-react';
import styles from './StepOutputCard.module.css';

// Import viewer components
import JsonViewer from './viewers/JsonViewer';
import TableViewer from './viewers/TableViewer';
import GraphViewer from './viewers/GraphViewer';
import PRViewer from './viewers/PRViewer';
import LogViewer from './viewers/LogViewer';

/**
 * Compute a concise human-readable duration between two dates.
 *
 * @param {Date|string} startDate - The start time (Date object or ISO date string).
 * @param {Date|string} endDate - The end time (Date object or ISO date string).
 * @returns {string|null} A duration string: milliseconds (e.g., "123ms") when less than 1 second, seconds with one decimal (e.g., "1.2s") when less than 1 minute, or minutes with one decimal (e.g., "2.5m") otherwise; returns `null` if either date is missing.
 */
function formatDuration(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const ms = new Date(endDate) - new Date(startDate);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Step-specific output configuration
const STEP_CONFIG = {
  ingest_repo: {
    title: 'Service Profile',
    outputKey: 'service_profile',
    renderer: 'json',
  },
  ingest_telemetry: {
    title: 'Telemetry Summary',
    outputKey: 'telemetry_summary',
    renderer: 'json',
  },
  propose_architecture: {
    title: 'Architecture Plan',
    outputKey: 'architecture_plan',
    renderer: 'json',
  },
  render_graph: {
    title: 'Architecture Graph',
    outputKey: 'graph',
    renderer: 'graph',
  },
  generate_iac: {
    title: 'IaC Manifest',
    outputKey: 'iac_manifest',
    renderer: 'iac',
  },
  validate_iac: {
    title: 'Validation Results',
    outputKey: 'deploy_result',
    renderer: 'validation',
  },
  create_pr: {
    title: 'Pull Request',
    outputKey: 'pr_result',
    renderer: 'pr',
  },
  validate_pr: {
    title: 'PR Validation',
    outputKey: 'validation_result',
    renderer: 'json',
  },
  evaluate: {
    title: 'Evaluation',
    outputKey: 'evaluation_result',
    renderer: 'evaluation',
  },
};

/**
 * Render a circular score badge that displays a normalized score, its maximum, and a label.
 *
 * @param {Object} props
 * @param {number} props.score - Numeric score. If between 0 (exclusive) and 1 (inclusive) it is treated as a decimal fraction and converted to a percentage; otherwise it is treated as an absolute score.
 * @param {number} [props.maxScore=100] - Maximum score for display when `score` is absolute; ignored when `score` is treated as a decimal (display max becomes 100).
 * @param {string} [props.status] - Optional label shown below the score (defaults to "Score").
 * @returns {JSX.Element} A styled score card element showing the score, maximum, and status label with color indicating performance.
function ScoreCard({ score, maxScore = 100, status }) {
  // Handle decimal scores (0.0-1.0) by converting to percentage
  const isDecimal = score > 0 && score <= 1;
  const displayScore = isDecimal ? Math.round(score * 100) : Math.round(score);
  const displayMax = isDecimal ? 100 : maxScore;
  
  const percentage = Math.round((displayScore / displayMax) * 100);
  const getColor = () => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };
  
  return (
    <div className={styles.scoreCard}>
      <div className={styles.scoreCircle} style={{ borderColor: getColor() }}>
        <span className={styles.scoreValue} style={{ color: getColor() }}>{displayScore}</span>
        <span className={styles.scoreMax}>/{displayMax}</span>
      </div>
      <span className={styles.scoreLabel}>{status || 'Score'}</span>
    </div>
  );
}

/**
 * Renders an IaC bundle summary including provider, pattern, source, component count, generated files, and optional AI summaries.
 * @param {Object} props
 * @param {Object} props.data - IaC bundle metadata and optional artifacts.
 * @param {string} [props.data.provider] - Infrastructure provider (defaults to "aws" when absent).
 * @param {string} [props.data.pattern] - Identified infrastructure pattern.
 * @param {string} [props.data.source] - Source detection method (defaults to "heuristic" when absent).
 * @param {number} [props.data.component_count] - Number of components in the bundle.
 * @param {string[]} [props.data.files] - List of generated file paths.
 * @param {any} [props.data.ai_summary] - Optional AI-generated summary object to display.
 * @param {any} [props.data.ai_decisions] - Optional AI decisions object to display.
 * @returns {JSX.Element|null} The IaC display element, or `null` if `data` is falsy.
 */
function IaCDisplay({ data }) {
  if (!data) return null;
  
  return (
    <div className={styles.iacDisplay}>
      <div className={styles.iacHeader}>
        <Package size={18} />
        <span>IaC Bundle</span>
      </div>
      <div className={styles.iacMeta}>
        <div className={styles.iacStat}>
          <span className={styles.iacStatLabel}>Provider</span>
          <span className={styles.iacStatValue}>{data.provider || 'aws'}</span>
        </div>
        <div className={styles.iacStat}>
          <span className={styles.iacStatLabel}>Pattern</span>
          <span className={styles.iacStatValue}>{data.pattern || 'unknown'}</span>
        </div>
        <div className={styles.iacStat}>
          <span className={styles.iacStatLabel}>Source</span>
          <span className={styles.iacStatValue}>{data.source || 'heuristic'}</span>
        </div>
        <div className={styles.iacStat}>
          <span className={styles.iacStatLabel}>Components</span>
          <span className={styles.iacStatValue}>{data.component_count || 0}</span>
        </div>
      </div>
      
      {data.files && data.files.length > 0 && (
        <div className={styles.iacFiles}>
          <span className={styles.iacFilesTitle}>Generated Files</span>
          <ul className={styles.iacFileList}>
            {data.files.map((file, idx) => (
              <li key={idx}>
                <FileJson size={14} />
                <span>{file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {data.ai_summary && (
        <JsonViewer data={data.ai_summary} title="AI Summary" maxHeight={200} />
      )}
      
      {data.ai_decisions && (
        <JsonViewer data={data.ai_decisions} title="AI Decisions" maxHeight={200} />
      )}
    </div>
  );
}

/**
 * Renders a validation summary including overall status, test counts, an optional test results table, and deploy logs.
 *
 * @param {Object} data - Validation payload to display.
 * @param {Object} [data.smoke_tests] - Smoke test grouping.
 * @param {Array<Object>} [data.smoke_tests.tests] - Array of test results; each test may include `name`, `passed` (boolean), and `output`.
 * @param {boolean} [data.success] - Overall validation success flag.
 * @param {string} [data.deploy_status] - Human-readable deploy status.
 * @param {string|Array<string>} [data.deploy_output] - Deploy output logs; passed to the log viewer when present.
 * @returns {JSX.Element|null} The rendered validation display element, or `null` if `data` is not provided.
 */
function ValidationDisplay({ data }) {
  if (!data) return null;
  
  const tests = data.smoke_tests?.tests || [];
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  return (
    <div className={styles.validationDisplay}>
      <div className={styles.validationHeader}>
        <div className={`${styles.validationStatus} ${data.success ? styles.success : styles.failed}`}>
          {data.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{data.deploy_status || 'unknown'}</span>
        </div>
        <div className={styles.testCounts}>
          <span className={styles.passed}>{passed} passed</span>
          <span className={styles.failed}>{failed} failed</span>
        </div>
      </div>
      
      {tests.length > 0 && (
        <TableViewer 
          data={tests.map(t => ({
            Test: t.name,
            Status: t.passed ? '✓ Passed' : '✗ Failed',
            Output: t.output?.substring(0, 100) || '-'
          }))}
          title="Test Results"
        />
      )}
      
      {data.deploy_output && (
        <LogViewer logs={data.deploy_output} title="Deploy Output" maxHeight={200} />
      )}
    </div>
  );
}

/**
 * Render step outputs using the configured viewer and handle loading or error states.
 *
 * @param {Object} props - Component props.
 * @param {string} props.stepId - Identifier of the step used to look up renderer configuration.
 * @param {*} props.outputs - Direct step outputs (used when no external file content is available).
 * @param {*} props.fileContent - Fetched file content to prefer over `outputs` when present.
 * @param {boolean} props.isLoading - When true, shows a loading state instead of output.
 * @param {string|null} props.error - When present, shows an error message instead of output.
 * @returns {JSX.Element} The rendered output element for the step, selected by loading/error state and the step's configured renderer.
 */
function OutputRenderer({ stepId, outputs, fileContent, isLoading, error }) {
  const config = STEP_CONFIG[stepId];
  
  if (isLoading) {
    return (
      <div className={styles.loadingOutput}>
        <Loader size={16} className={styles.spinner} />
        <span>Loading output...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorOutput}>
        <AlertTriangle size={16} />
        <span>{error}</span>
      </div>
    );
  }
  
  // Use file content if available, otherwise use direct outputs
  const data = fileContent || outputs;
  
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <p className={styles.noOutput}>No output data available</p>;
  }
  
  // Route to appropriate renderer based on step config
  switch (config?.renderer) {
    case 'graph':
      return <GraphViewer data={data} title={config.title} height={300} />;
    
    case 'pr':
      return <PRViewer data={data} />;
    
    case 'iac':
      return <IaCDisplay data={data} />;
    
    case 'validation':
      return <ValidationDisplay data={data} />;
    
    case 'evaluation':
      return (
        <div className={styles.evaluationOutput}>
          {data.score !== undefined && (
            <ScoreCard score={data.score} status={data.status} />
          )}
          {data.summary && <p className={styles.summary}>{data.summary}</p>}
          <JsonViewer data={data} title="Full Evaluation" maxHeight={300} />
        </div>
      );
    
    case 'json':
    default:
      // Check if array of objects → use table
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        return <TableViewer data={data} title={config?.title} />;
      }
      return <JsonViewer data={data} title={config?.title || 'Output'} maxHeight={400} />;
  }
}

/**
 * Render a collapsible card that displays a pipeline step's status, duration, errors, and outputs.
 *
 * When expanded and the step is completed, the component will attempt to fetch file content for any kestra:/// URI found in the step outputs and fall back to inline outputs if no URI is found or fetch fails.
 *
 * @param {Object} props
 * @param {Object} props.step - Step data. Expected keys: `id`, `label`, `state`, `startDate`, `endDate`, `outputs`, and optional `error`.
 * @param {boolean} [props.isExpanded=false] - Initial expanded state of the card.
 * @returns {JSX.Element} The StepOutputCard element.
 */
export default function StepOutputCard({ step, isExpanded: defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [fileContent, setFileContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { id, label, state, startDate, endDate, outputs } = step;
  const duration = formatDuration(startDate, endDate);

  // Fetch file content when expanded and output has file URI
  const fetchFileContent = useCallback(async () => {
    if (!outputs) return;
    
    // Get step-specific output key from config
    const config = STEP_CONFIG[id];
    const outputKey = config?.outputKey;
    
    // Find the kestra:// URI in outputs
    let fileUri = null;
    
    // Check specific output key first
    if (outputKey && outputs[outputKey]) {
      const value = outputs[outputKey];
      if (typeof value === 'string' && value.startsWith('kestra:///')) {
        fileUri = value;
      } else if (typeof value === 'object' && value.uri) {
        fileUri = value.uri;
      }
    }
    
    // If no specific key found, check all outputs for kestra:// URIs
    if (!fileUri) {
      for (const [key, value] of Object.entries(outputs)) {
        if (typeof value === 'string' && value.startsWith('kestra:///')) {
          fileUri = value;
          break;
        }
        if (typeof value === 'object' && value?.uri?.startsWith('kestra:///')) {
          fileUri = value.uri;
          break;
        }
      }
    }
    
    if (!fileUri) {
      // If no URI found, outputs might be inline data already
      setFileContent(outputs);
      return;
    }
    
    console.log('Fetching file content for:', id, 'URI:', fileUri);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/kestra/file?uri=${encodeURIComponent(fileUri)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file content');
      }
      const data = await response.json();
      setFileContent(data);
    } catch (err) {
      console.error('Error fetching file:', err);
      setError(err.message);
      // Fallback to showing raw outputs
      setFileContent(outputs);
    } finally {
      setIsLoading(false);
    }
  }, [outputs, id]);
  
  // Fetch when card expands and step is completed
  useEffect(() => {
    if (isExpanded && state === 'completed' && !fileContent && !isLoading) {
      fetchFileContent();
    }
  }, [isExpanded, state, fileContent, isLoading, fetchFileContent]);

  const StateIcon = {
    pending: Clock,
    running: Loader,
    completed: CheckCircle,
    failed: XCircle,
  }[state] || Clock;

  const stateColors = {
    pending: '#71717a',
    running: '#3b82f6',
    completed: '#22c55e',
    failed: '#ef4444',
  };

  return (
    <div className={`${styles.card} ${styles[state]}`}>
      <button 
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className={styles.headerLeft}>
          <StateIcon 
            size={18} 
            color={stateColors[state]}
            className={state === 'running' ? styles.spinIcon : ''}
          />
          <span className={styles.stepName}>{label}</span>
          <span className={`${styles.badge} ${styles[`badge_${state}`]}`}>
            {state}
          </span>
        </div>
        
        <div className={styles.headerRight}>
          {duration && (
            <span className={styles.duration}>
              <Clock size={14} />
              {duration}
            </span>
          )}
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {step.error && (
            <div className={styles.errorBox}>
              <XCircle size={16} />
              <span>{step.error}</span>
            </div>
          )}
          
          {state === 'running' && (
            <div className={styles.runningMessage}>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>Processing...</span>
            </div>
          )}

          {state === 'completed' && (
            <OutputRenderer 
              stepId={id} 
              outputs={outputs}
              fileContent={fileContent}
              isLoading={isLoading}
              error={error}
            />
          )}

          {state === 'pending' && (
            <p className={styles.pendingMessage}>Waiting for previous steps to complete...</p>
          )}
        </div>
      )}
    </div>
  );
}