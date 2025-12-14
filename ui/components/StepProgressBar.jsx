"use client";

import styles from './StepProgressBar.module.css';

// Pipeline step definitions
const STEPS = [
  { id: 'ingest_repo', label: 'Ingest Repo', shortLabel: '1' },
  { id: 'ingest_telemetry', label: 'Telemetry', shortLabel: '2' },
  { id: 'propose_architecture', label: 'Propose Arch', shortLabel: '3' },
  { id: 'render_graph', label: 'Render Graph', shortLabel: '4' },
  { id: 'generate_iac', label: 'Generate IaC', shortLabel: '5' },
  { id: 'validate_iac', label: 'Validate IaC', shortLabel: '6' },
  { id: 'create_pr', label: 'Create PR', shortLabel: '7' },
  { id: 'validate_pr', label: 'Validate PR', shortLabel: '8' },
  { id: 'evaluate', label: 'Evaluate', shortLabel: '9' },
];

export default function StepProgressBar({ steps = [], currentStep, onStepClick }) {
  // Create a map for quick lookups
  const stepStateMap = new Map(steps.map(s => [s.id, s.state]));

  const getStepState = (stepId) => {
    return stepStateMap.get(stepId) || 'pending';
  };

  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        {STEPS.map((step, index) => {
          const state = getStepState(step.id);
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className={styles.stepWrapper}>
              {/* Connector line */}
              {index > 0 && (
                <div 
                  className={`${styles.connector} ${
                    state === 'completed' ? styles.connectorCompleted : ''
                  }`}
                />
              )}
              
              {/* Step dot */}
              <button
                className={`
                  ${styles.step}
                  ${styles[state]}
                  ${isActive ? styles.active : ''}
                `}
                onClick={() => onStepClick?.(step.id)}
                title={step.label}
                aria-label={`${step.label}: ${state}`}
              >
                {state === 'completed' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {state === 'failed' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                )}
                {state === 'running' && (
                  <span className={styles.runningDot}></span>
                )}
                {state === 'pending' && (
                  <span className={styles.pendingNumber}>{step.shortLabel}</span>
                )}
              </button>
              
              {/* Step label */}
              <span className={`${styles.label} ${styles[`label_${state}`]}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
