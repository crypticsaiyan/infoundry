"use client";

import { PIPELINE_STEPS } from '@/lib/kestra';
import styles from './StepProgressBar.module.css';

// Transform PIPELINE_STEPS to include shortLabel for display
const STEPS = PIPELINE_STEPS.map((step, index) => ({
  id: step.id,
  label: step.label,
  shortLabel: step.order?.toString() || (index + 1).toString(),
}));

/**
 * Render a horizontal step progress bar that displays each pipeline step's state and optionally allows clicking a step.
 *
 * @param {Array<{id: string, label: string, shortLabel?: string, state?: 'pending'|'running'|'completed'|'failed'}>} [steps=[]] - Step objects with their current state; if a step has no state it is treated as "pending".
 * @param {string|number} [currentStep] - The id of the currently active step.
 * @param {(stepId: string|number) => void} [onStepClick] - Optional callback invoked with a step's id when that step is clicked.
 * @returns {import('react').ReactElement} A React element representing the step progress bar.
 */
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