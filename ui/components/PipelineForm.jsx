"use client";

import { useState } from 'react';
import styles from './PipelineForm.module.css';

const CLOUD_PROVIDERS = [
  { value: 'aws', label: 'Amazon Web Services' },
  { value: 'gcp', label: 'Google Cloud Platform' },
  { value: 'azure', label: 'Microsoft Azure' },
];

/**
 * Render a form for configuring and running a pipeline.
 *
 * The form collects repository, branch, target repository, cloud provider,
 * project name, target folder, and two toggles (skip PR creation, skip validation).
 * It validates that `repo_url` contains "github.com" and that `project_name` is not empty.
 *
 * @param {Object} props
 * @param {(formData: {
 *   repo_url: string,
 *   branch: string,
 *   repository: string,
 *   cloud_provider: string,
 *   project_name: string,
 *   target_folder: string,
 *   skip_pr: boolean,
 *   skip_validation: boolean
 * }) => void} props.onSubmit - Callback invoked with the collected form data when the form is valid and submitted.
 * @param {boolean} props.isRunning - When true, disables inputs and shows a running state for the submit button.
 * @returns {JSX.Element} The pipeline configuration form.
 */
export default function PipelineForm({ onSubmit, isRunning }) {
  const [formData, setFormData] = useState({
    repo_url: '',
    branch: 'main',
    repository: 'crypticsaiyan/infotest',
    cloud_provider: 'aws',
    project_name: 'infoundry',
    target_folder: 'infra',
    skip_pr: false,
    skip_validation: false,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.repo_url.trim()) {
      newErrors.repo_url = 'Repository URL is required';
    } else if (!formData.repo_url.includes('github.com')) {
      newErrors.repo_url = 'Please enter a valid GitHub repository URL';
    }

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate() && !isRunning) {
      onSubmit(formData);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        {/* Repository URL */}
        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
          <label htmlFor="repo_url" className={styles.label}>
            Repository URL <span className={styles.required}>*</span>
          </label>
          <input
            type="url"
            id="repo_url"
            name="repo_url"
            value={formData.repo_url}
            onChange={handleChange}
            placeholder="https://github.com/owner/repo"
            className={`${styles.input} ${errors.repo_url ? styles.inputError : ''}`}
            disabled={isRunning}
          />
          {errors.repo_url && <span className={styles.error}>{errors.repo_url}</span>}
        </div>

        {/* Branch */}
        <div className={styles.inputGroup}>
          <label htmlFor="branch" className={styles.label}>Branch</label>
          <input
            type="text"
            id="branch"
            name="branch"
            value={formData.branch}
            onChange={handleChange}
            placeholder="main"
            className={styles.input}
            disabled={isRunning}
          />
        </div>

        {/* Target Repository */}
        <div className={styles.inputGroup}>
          <label htmlFor="repository" className={styles.label}>Target Repository</label>
          <input
            type="text"
            id="repository"
            name="repository"
            value={formData.repository}
            onChange={handleChange}
            placeholder="owner/repo"
            className={styles.input}
            disabled={isRunning}
          />
        </div>

        {/* Cloud Provider */}
        <div className={styles.inputGroup}>
          <label htmlFor="cloud_provider" className={styles.label}>Cloud Provider</label>
          <select
            id="cloud_provider"
            name="cloud_provider"
            value={formData.cloud_provider}
            onChange={handleChange}
            className={styles.select}
            disabled={isRunning}
          >
            {CLOUD_PROVIDERS.map(provider => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        {/* Project Name */}
        <div className={styles.inputGroup}>
          <label htmlFor="project_name" className={styles.label}>
            Project Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="project_name"
            name="project_name"
            value={formData.project_name}
            onChange={handleChange}
            placeholder="my-project"
            className={`${styles.input} ${errors.project_name ? styles.inputError : ''}`}
            disabled={isRunning}
          />
          {errors.project_name && <span className={styles.error}>{errors.project_name}</span>}
        </div>

        {/* Target Folder */}
        <div className={styles.inputGroup}>
          <label htmlFor="target_folder" className={styles.label}>Target Folder</label>
          <input
            type="text"
            id="target_folder"
            name="target_folder"
            value={formData.target_folder}
            onChange={handleChange}
            placeholder="infra"
            className={styles.input}
            disabled={isRunning}
          />
        </div>

        {/* Toggle Options */}
        <div className={`${styles.toggleGroup} ${styles.fullWidth}`}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              name="skip_pr"
              checked={formData.skip_pr}
              onChange={handleChange}
              disabled={isRunning}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleLabel}>Skip PR Creation</span>
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              name="skip_validation"
              checked={formData.skip_validation}
              onChange={handleChange}
              disabled={isRunning}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleLabel}>Skip Validation</span>
          </label>
        </div>
      </div>

      <button 
        type="submit" 
        className={styles.submitBtn}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <span className={styles.spinner}></span>
            Running Pipeline...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Run Pipeline
          </>
        )}
      </button>
    </form>
  );
}