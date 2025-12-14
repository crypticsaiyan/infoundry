"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import PipelineForm from '@/components/PipelineForm';
import StepProgressBar from '@/components/StepProgressBar';
import StepOutputCard from '@/components/StepOutputCard';
import { PIPELINE_STEPS } from '@/lib/kestra';
import styles from './page.module.css';

const POLL_INTERVAL = 2000; /**
 * Render the pipeline execution page that provides a form to start a pipeline, shows live execution progress, and displays per-step outputs.
 *
 * Renders UI for configuring and triggering a pipeline run, polls execution status while running, maps task run data to per-step progress, and presents errors and completion state.
 * @returns {JSX.Element} The pipeline execution page element.
 */

export default function PipelinePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [executionState, setExecutionState] = useState(null);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState(null);
  const [activeStepId, setActiveStepId] = useState(null);
  
  const pollIntervalRef = useRef(null);

  // Map execution data to step progress
  const mapToStepProgress = useCallback((taskRuns) => {
    const taskRunMap = new Map(taskRuns.map(tr => [tr.id, tr]));
    
    return PIPELINE_STEPS.map(step => {
      const taskRun = taskRunMap.get(step.id);
      return {
        ...step,
        state: taskRun?.state || 'pending',
        startDate: taskRun?.startDate,
        endDate: taskRun?.endDate,
        outputs: taskRun?.outputs || {},
        error: taskRun?.error,
      };
    });
  }, []);

  // Poll execution status
  const pollStatus = useCallback(async (execId) => {
    try {
      const response = await fetch(`/api/kestra/status/${execId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch execution status');
      }
      
      const data = await response.json();
      
      setExecutionState(data.state);
      setSteps(mapToStepProgress(data.taskRuns || []));
      
      // Find current running step
      const runningStep = data.taskRuns?.find(tr => tr.state === 'running');
      if (runningStep) {
        setActiveStepId(runningStep.id);
      }
      
      // Stop polling if execution is complete
      if (data.state === 'completed' || data.state === 'failed') {
        setIsRunning(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
      
    } catch (err) {
      console.error('Polling error:', err);
      setError(err.message);
    }
  }, [mapToStepProgress]);

  // Start polling when execution begins
  useEffect(() => {
    if (executionId && isRunning) {
      // Initial poll
      pollStatus(executionId);
      
      // Set up interval
      pollIntervalRef.current = setInterval(() => {
        pollStatus(executionId);
      }, POLL_INTERVAL);
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [executionId, isRunning, pollStatus]);

  // Handle form submission
  const handleSubmit = async (formData) => {
    setError(null);
    setIsRunning(true);
    setSteps([]);
    setExecutionState(null);
    
    try {
      const response = await fetch('/api/kestra/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger pipeline');
      }
      
      const data = await response.json();
      setExecutionId(data.executionId);
      
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message);
      setIsRunning(false);
    }
  };

  // Handle step click in progress bar
  const handleStepClick = (stepId) => {
    setActiveStepId(stepId);
  };

  // Calculate completion percentage
  const completedSteps = steps.filter(s => s.state === 'completed').length;
  const progressPercent = Math.round((completedSteps / PIPELINE_STEPS.length) * 100);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </Link>
        <div className={styles.headerTitle}>
          <Zap size={24} className={styles.headerIcon} />
          <h1>Pipeline Execution</h1>
        </div>
      </header>

      <main className={styles.main}>
        {/* Form Section */}
        <section className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Configure Pipeline</h2>
          <PipelineForm onSubmit={handleSubmit} isRunning={isRunning} />
        </section>

        {/* Error Display */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Progress Section */}
        {(isRunning || steps.length > 0) && (
          <section className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <h2 className={styles.sectionTitle}>Execution Progress</h2>
              {executionId && (
                <span className={styles.executionId}>
                  ID: {executionId.slice(0, 8)}...
                </span>
              )}
            </div>
            
            {/* Overall status */}
            <div className={styles.statusBar}>
              <div className={styles.statusInfo}>
                <span className={`${styles.statusBadge} ${styles[`status_${executionState}`]}`}>
                  {executionState || 'initializing'}
                </span>
                <span className={styles.progressText}>
                  {completedSteps} of {PIPELINE_STEPS.length} steps completed
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step progress bar */}
            <StepProgressBar 
              steps={steps} 
              currentStep={activeStepId}
              onStepClick={handleStepClick}
            />
          </section>
        )}

        {/* Step Outputs */}
        {steps.length > 0 && (
          <section className={styles.outputSection}>
            <h2 className={styles.sectionTitle}>Step Outputs</h2>
            <div className={styles.outputList}>
              {steps.map((step, index) => (
                <StepOutputCard 
                  key={step.id}
                  step={step}
                  isExpanded={step.id === activeStepId || step.state === 'running'}
                />
              ))}
            </div>
          </section>
        )}

        {/* Success Message */}
        {executionState === 'completed' && (
          <div className={styles.successBanner}>
            <CheckCircle2 size={24} />
            <div>
              <h3>Pipeline Completed Successfully!</h3>
              <p>All {PIPELINE_STEPS.length} steps have been executed. Review the outputs above.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
