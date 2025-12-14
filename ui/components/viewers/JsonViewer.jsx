"use client";

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import styles from './JsonViewer.module.css';

// Type indicator colors
const TYPE_COLORS = {
  string: '#22c55e',
  number: '#3b82f6',
  boolean: '#f59e0b',
  null: '#71717a',
  object: '#a855f7',
  array: '#ec4899',
};

function JsonValue({ value, depth = 0 }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  
  // Primitive values
  if (type === 'string') {
    return <span className={styles.string}>"{value}"</span>;
  }
  if (type === 'number') {
    return <span className={styles.number}>{value}</span>;
  }
  if (type === 'boolean') {
    return <span className={styles.boolean}>{value ? 'true' : 'false'}</span>;
  }
  if (type === 'null') {
    return <span className={styles.null}>null</span>;
  }
  
  // Object or Array
  const isArray = type === 'array';
  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
  const isEmpty = entries.length === 0;
  
  if (isEmpty) {
    return <span className={styles.empty}>{isArray ? '[]' : '{}'}</span>;
  }
  
  return (
    <div className={styles.composite}>
      <button 
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className={styles.bracket}>{isArray ? '[' : '{'}</span>
        {!isExpanded && (
          <span className={styles.preview}>
            {entries.length} {isArray ? 'items' : 'keys'}
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className={styles.children}>
          {entries.map(([key, val], idx) => (
            <div key={key} className={styles.entry}>
              {!isArray && <span className={styles.key}>{key}</span>}
              {!isArray && <span className={styles.colon}>:</span>}
              <JsonValue value={val} depth={depth + 1} />
              {idx < entries.length - 1 && <span className={styles.comma}>,</span>}
            </div>
          ))}
        </div>
      )}
      
      <span className={styles.bracket}>{isArray ? ']' : '}'}</span>
    </div>
  );
}

export default function JsonViewer({ data, title, maxHeight = 400 }) {
  const [copied, setCopied] = useState(false);
  
  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  if (data === undefined || data === null) {
    return <p className={styles.empty}>No data</p>;
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {title && <span className={styles.title}>{title}</span>}
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className={styles.viewer} style={{ maxHeight }}>
        <JsonValue value={data} />
      </div>
    </div>
  );
}
