"use client";

import { useState } from 'react';
import { GitPullRequest, FileText, User, Clock, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import styles from './PRViewer.module.css';

/**
 * Render a pull request summary UI including header, metadata, optional description, a collapsible files-changed list, and an optional external link.
 * @param {Object} props
 * @param {Object} props.data - Pull request data; when falsy the component renders an empty-state message.
 * @param {number|string} [props.data.pr_number] - Pull request number.
 * @param {string} [props.data.pr_url] - URL to the PR on the remote host.
 * @param {string} [props.data.title] - Pull request title.
 * @param {string} [props.data.description] - Pull request description/body.
 * @param {string} [props.data.author] - Author name.
 * @param {string} [props.data.status] - PR status (e.g., "open", "merged", "closed", "draft").
 * @param {string} [props.data.branch] - Source branch name.
 * @param {string} [props.data.base_branch] - Target/base branch name (defaults to "main" when absent).
 * @param {Array<Object|string>} [props.data.files_changed] - List of changed files; each item may be a string or an object with `filename`, `additions`, and `deletions`.
 * @param {string|number|Date} [props.data.created_at] - Creation timestamp.
 * @returns {JSX.Element} A React element rendering the pull request viewer.
 */
export default function PRViewer({ data }) {
  const [showFiles, setShowFiles] = useState(false);
  
  if (!data) {
    return <p className={styles.empty}>No PR data available</p>;
  }
  
  const {
    pr_number,
    pr_url,
    title,
    description,
    author,
    status,
    branch,
    base_branch,
    files_changed = [],
    created_at,
  } = data;
  
  const statusColors = {
    open: '#22c55e',
    merged: '#a855f7',
    closed: '#ef4444',
    draft: '#71717a',
  };
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <GitPullRequest size={20} color={statusColors[status] || '#22c55e'} />
        <div className={styles.headerInfo}>
          <span className={styles.prNumber}>#{pr_number || 'N/A'}</span>
          <h4 className={styles.title}>{title || 'Pull Request'}</h4>
        </div>
        <span 
          className={styles.status}
          style={{ 
            backgroundColor: `${statusColors[status] || '#22c55e'}20`,
            color: statusColors[status] || '#22c55e'
          }}
        >
          {status || 'open'}
        </span>
      </div>
      
      {/* Meta info */}
      <div className={styles.meta}>
        {author && (
          <span className={styles.metaItem}>
            <User size={14} />
            {author}
          </span>
        )}
        {branch && (
          <span className={styles.metaItem}>
            <code>{branch}</code>
            <span>→</span>
            <code>{base_branch || 'main'}</code>
          </span>
        )}
        {created_at && (
          <span className={styles.metaItem}>
            <Clock size={14} />
            {new Date(created_at).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {/* Description */}
      {description && (
        <div className={styles.description}>
          <p>{description}</p>
        </div>
      )}
      
      {/* Files changed */}
      {files_changed.length > 0 && (
        <div className={styles.filesSection}>
          <button 
            className={styles.filesToggle}
            onClick={() => setShowFiles(!showFiles)}
          >
            {showFiles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <FileText size={16} />
            <span>{files_changed.length} files changed</span>
          </button>
          
          {showFiles && (
            <ul className={styles.filesList}>
              {files_changed.map((file, idx) => (
                <li key={idx} className={styles.fileItem}>
                  <span className={styles.fileName}>{file.filename || file}</span>
                  {file.additions !== undefined && (
                    <span className={styles.additions}>+{file.additions}</span>
                  )}
                  {file.deletions !== undefined && (
                    <span className={styles.deletions}>-{file.deletions}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* View on GitHub */}
      {pr_url && (
        <a 
          href={pr_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.viewLink}
        >
          <ExternalLink size={14} />
          View on GitHub
        </a>
      )}
    </div>
  );
}