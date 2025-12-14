"use client";

import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './GraphViewer.module.css';

// Enhanced icon mapping with categories and colors
const NODE_TYPES = {
  'api-gateway': { icon: '🌐', color: '#3b82f6', label: 'API Gateway' },
  'load-balancer': { icon: '🔀', color: '#8b5cf6', label: 'Load Balancer' },
  'service': { icon: '📦', color: '#10b981', label: 'Service' },
  'microservice': { icon: '🧩', color: '#06b6d4', label: 'Microservice' },
  'database': { icon: '🗄️', color: '#f59e0b', label: 'Database' },
  'cache': { icon: '⚡', color: '#ef4444', label: 'Cache' },
  'queue': { icon: '📨', color: '#ec4899', label: 'Queue' },
  'storage': { icon: '💾', color: '#6366f1', label: 'Storage' },
  'cdn': { icon: '🌍', color: '#14b8a6', label: 'CDN' },
  'monitoring': { icon: '📊', color: '#84cc16', label: 'Monitoring' },
  'auth': { icon: '🔐', color: '#f43f5e', label: 'Auth' },
  'container': { icon: '🐳', color: '#0ea5e9', label: 'Container' },
  'serverless': { icon: '☁️', color: '#a855f7', label: 'Serverless' },
  'default': { icon: '📦', color: '#71717a', label: 'Component' },
};

// Lucide icon name to type mapping
const ICON_TO_TYPE = {
  'globe': 'api-gateway',
  'share-2': 'load-balancer',
  'box': 'service',
  'layers': 'microservice',
  'zap': 'cache',
  'database': 'database',
  'grid': 'container',
  'cpu': 'service',
  'archive': 'storage',
  'mail': 'queue',
  'cloud': 'serverless',
  'server': 'service',
  'activity': 'monitoring',
};

// Enhanced custom node with gradient background and glow - HORIZONTAL layout
function InfraNode({ data, selected }) {
  const nodeType = ICON_TO_TYPE[data.icon] || 'default';
  const typeConfig = NODE_TYPES[nodeType] || NODE_TYPES.default;
  const color = data.style?.background || typeConfig.color;
  
  return (
    <div 
      className={`${styles.node} ${selected ? styles.nodeSelected : ''}`}
      style={{ 
        '--node-color': color,
        borderColor: color,
      }}
    >
      <Handle type="target" position={Position.Left} className={styles.handle} />
      <div className={styles.nodeContent}>
        <div className={styles.nodeIconWrapper} style={{ backgroundColor: `${color}20` }}>
          <span className={styles.nodeIcon}>{typeConfig.icon}</span>
        </div>
        <span className={styles.nodeLabel}>{data.label}</span>
        <span className={styles.nodeType}>{typeConfig.label}</span>
      </div>
      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  );
}

const nodeTypes = {
  infrastructureNode: InfraNode,
  default: InfraNode,
};

export default function GraphViewer({ data, title, height = 350 }) {
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Parse graph data
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    
    const graphNodes = (data.nodes || []).map(node => ({
      id: node.id,
      type: 'infrastructureNode',
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.data?.label || node.id,
        icon: node.data?.icon || 'box',
        style: node.style || {},
      },
    }));
    
    const graphEdges = (data.edges || []).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edge.animated || false,
      style: { 
        stroke: edge.style?.stroke || '#6366f1',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edge.style?.stroke || '#6366f1',
      },
    }));
    
    return { nodes: graphNodes, edges: graphEdges };
  }, [data]);
  
  // Count node types for legend
  const nodeTypeCounts = useMemo(() => {
    const counts = {};
    nodes.forEach(node => {
      const type = ICON_TO_TYPE[node.data.icon] || 'default';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [nodes]);
  
  if (!data || nodes.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📊</div>
        <span>No architecture graph available</span>
        <span className={styles.emptyHint}>Graph will appear after propose_architecture step</span>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.graphIcon}>🔗</span>
          <h4 className={styles.title}>{title || 'Architecture Graph'}</h4>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.stat}>
            <span className={styles.statValue}>{nodes.length}</span>
            <span className={styles.statLabel}>nodes</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statValue}>{edges.length}</span>
            <span className={styles.statLabel}>edges</span>
          </span>
        </div>
      </div>
      
      {/* Graph */}
      <div className={styles.graph} style={{ height }}>
        <svg width="0" height="0">
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          panOnScroll
          zoomOnScroll
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => setSelectedNode(node)}
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls className={styles.controls} showInteractive={false} />
        </ReactFlow>
      </div>
      
      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(nodeTypeCounts).map(([type, count]) => {
          const config = NODE_TYPES[type] || NODE_TYPES.default;
          return (
            <div key={type} className={styles.legendItem}>
              <span 
                className={styles.legendDot} 
                style={{ backgroundColor: config.color }}
              />
              <span className={styles.legendLabel}>{config.label}</span>
              <span className={styles.legendCount}>{count}</span>
            </div>
          );
        })}
        {data.metadata?.pattern && (
          <div className={styles.patternBadge}>
            <span>Pattern:</span>
            <strong>{data.metadata.pattern}</strong>
          </div>
        )}
      </div>
      
      {/* Selected node info */}
      {selectedNode && (
        <div className={styles.nodeInfo}>
          <span className={styles.nodeInfoTitle}>Selected: {selectedNode.data.label}</span>
          <button 
            className={styles.closeBtn}
            onClick={() => setSelectedNode(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
