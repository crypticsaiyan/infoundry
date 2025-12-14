"use client";

import { PIPELINE_STEPS } from '@/lib/kestra';
import styles from './StepProgressBar.module.css';

// Transform PIPELINE_STEPS to include shortLabel for display
const STEPS = PIPELINE_STEPS.map((step, index) => ({
  id: step.id,
  label: step.label,
  shortLabel: step.order?.toString() || (index + 1).toString(),
}));

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
