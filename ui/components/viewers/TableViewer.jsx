"use client";

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './TableViewer.module.css';

const PAGE_SIZE = 10;

/**
 * Render a sortable, paginated table view for an array of objects.
 *
 * @param {Object} props
 * @param {Array<Record<string, any>>} props.data - Array of row objects whose keys determine table columns; if not an array or empty, renders a "No tabular data" placeholder.
 * @param {string} [props.title] - Optional title displayed above the table.
 * @returns {JSX.Element} The table viewer element (or a placeholder paragraph when no data is available).
 */
export default function TableViewer({ data, title }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Extract columns from first item
  const columns = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);
  
  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !Array.isArray(data)) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);
  
  // Paginate
  const totalPages = Math.ceil((sortedData?.length || 0) / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    if (!Array.isArray(sortedData)) return [];
    const start = currentPage * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);
  
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  
  if (!Array.isArray(data) || data.length === 0) {
    return <p className={styles.empty}>No tabular data</p>;
  }
  
  return (
    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)}>
                  <span className={styles.headerCell}>
                    {col}
                    {sortKey === col && (
                      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col}>
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {currentPage + 1} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Format a value for display in a table cell.
 *
 * @param {*} value - The value to format.
 * @returns {string} '-' for `null` or `undefined`, `'✓'` for `true`, `'✗'` for `false`, a JSON string for objects, or the value converted to a string otherwise.
 */
function formatValue(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}