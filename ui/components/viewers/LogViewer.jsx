"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowDown, AlertCircle, X } from 'lucide-react';
import styles from './LogViewer.module.css';

/**
 * Renders an interactive log viewer with filtering, auto-scroll, and level highlighting.
 * @param {{logs: string|Array|any, title?: string, maxHeight?: number}} props - Component props.
 * @param {string|Array|any} props.logs - Log data to display; may be a newline-delimited string, an array of strings or objects, or any other object (will be stringified).
 * @param {string} [props.title] - Optional header title displayed above the logs.
 * @param {number} [props.maxHeight=300] - Maximum height in pixels for the scrollable log area.
 * @returns {JSX.Element} The rendered log viewer component.
 */
export default function LogViewer({ logs, title, maxHeight = 300 }) {
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef(null);
  
  // Parse logs into lines
  const lines = useMemo(() => {
    if (!logs) return [];
    
    if (typeof logs === 'string') {
      return logs.split('\n').map((text, idx) => ({ id: idx, text }));
    }
    
    if (Array.isArray(logs)) {
      return logs.map((log, idx) => ({
        id: idx,
        text: typeof log === 'string' ? log : JSON.stringify(log),
        level: log.level,
        timestamp: log.timestamp,
      }));
    }
    
    return [{ id: 0, text: JSON.stringify(logs, null, 2) }];
  }, [logs]);
  
  // Filter lines
  const filteredLines = useMemo(() => {
    if (!filter.trim()) return lines;
    const searchLower = filter.toLowerCase();
    return lines.filter(line => 
      line.text.toLowerCase().includes(searchLower)
    );
  }, [lines, filter]);
  
  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);
  
  // Detect log level for highlighting
  const getLineClass = (line) => {
    const text = line.text.toLowerCase();
    if (line.level === 'error' || text.includes('error') || text.includes('failed')) {
      return styles.error;
    }
    if (line.level === 'warning' || text.includes('warn')) {
      return styles.warning;
    }
    if (line.level === 'success' || text.includes('success') || text.includes('passed')) {
      return styles.success;
    }
    return '';
  };
  
  if (!logs || lines.length === 0) {
    return <p className={styles.empty}>No log data available</p>;
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {title && <span className={styles.title}>{title}</span>}
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={styles.searchInput}
            />
            {filter && (
              <button onClick={() => setFilter('')} className={styles.clearBtn}>
                <X size={12} />
              </button>
            )}
          </div>
          <button
            className={`${styles.autoScrollBtn} ${autoScroll ? styles.active : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll"
          >
            <ArrowDown size={14} />
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className={styles.stats}>
        <span>{filteredLines.length} of {lines.length} lines</span>
        {lines.some(l => l.text.toLowerCase().includes('error')) && (
          <span className={styles.errorCount}>
            <AlertCircle size={12} />
            {lines.filter(l => l.text.toLowerCase().includes('error')).length} errors
          </span>
        )}
      </div>
      
      {/* Log content */}
      <div 
        ref={containerRef}
        className={styles.content}
        style={{ maxHeight }}
      >
        {filteredLines.map((line) => (
          <div key={line.id} className={`${styles.line} ${getLineClass(line)}`}>
            <span className={styles.lineNumber}>{line.id + 1}</span>
            {line.timestamp && (
              <span className={styles.timestamp}>{line.timestamp}</span>
            )}
            <span className={styles.lineText}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}