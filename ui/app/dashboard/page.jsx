"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Database,
  Server,
  Globe,
  Layers,
  Cloud,
  HardDrive,
  MessageSquare,
  Download,
  Plus,
  Save,
  Share2,
  Upload,
  Zap,
  Box,
  Grid,
  Cpu,
  Archive,
  Mail,
  Bell,
  Activity,
  Eye,
  Crosshair,
  TrendingUp,
  Folder,
  X,
  Info,
} from "lucide-react";
import styles from "./page.module.css";

// Icon mapping for Kestra output
const ICON_MAP = {
  globe: Globe,
  "share-2": Share2,
  box: Box,
  layers: Layers,
  zap: Zap,
  database: Database,
  grid: Grid,
  cpu: Cpu,
  archive: Archive,
  mail: Mail,
  cloud: Cloud,
  "trending-up": TrendingUp,
  folder: Folder,
  bell: Bell,
  activity: Activity,
  eye: Eye,
  crosshair: Crosshair,
  server: Server,
};

// Infrastructure node component for Kestra output
function InfrastructureNode({ data }) {
  const IconComponent = ICON_MAP[data.icon] || Box;
  const bgColor = data.style?.background || "#666";
  
  return (
    <div 
      className={styles.infraNode} 
      style={{ 
        borderColor: bgColor,
        boxShadow: `0 0 20px ${bgColor}40`
      }}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.infraNodeContent}>
        <div className={styles.infraNodeIcon} style={{ background: bgColor }}>
          <IconComponent size={20} color="#fff" />
        </div>
        <span className={styles.infraNodeLabel}>{data.label}</span>
        {data.scaling && (
          <span className={styles.scalingBadge}>
            <TrendingUp size={12} />
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

// Custom node types
const nodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  loadBalancer: LoadBalancerNode,
  cache: CacheNode,
  queue: QueueNode,
  infrastructureNode: InfrastructureNode,
};

// Demo nodes (shown when no graph is imported)
const demoNodes = [
  {
    id: "lb",
    type: "loadBalancer",
    position: { x: 400, y: 50 },
    data: { label: "Load Balancer" },
  },
  {
    id: "api",
    type: "service",
    position: { x: 400, y: 200 },
    data: { label: "API Gateway" },
  },
  {
    id: "db",
    type: "database",
    position: { x: 400, y: 380 },
    data: { label: "PostgreSQL" },
  },
];

const demoEdges = [
  { id: "e1", source: "lb", target: "api", animated: true },
  { id: "e2", source: "api", target: "db" },
];

// Component palette items
const paletteItems = [
  { type: "service", icon: Server, label: "Service" },
  { type: "database", icon: Database, label: "Database" },
  { type: "loadBalancer", icon: Globe, label: "Load Balancer" },
  { type: "cache", icon: HardDrive, label: "Cache" },
  { type: "queue", icon: MessageSquare, label: "Queue" },
];

export default function DashboardPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(demoNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(demoEdges);
  const [selectedPaletteItem, setSelectedPaletteItem] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const fileInputRef = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onPaneClick = useCallback(
    (event) => {
      if (!selectedPaletteItem) return;

      const reactFlowBounds = event.target.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode = {
        id: `${selectedPaletteItem.type}-${Date.now()}`,
        type: selectedPaletteItem.type,
        position,
        data: { label: `New ${selectedPaletteItem.label}` },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedPaletteItem(null);
    },
    [selectedPaletteItem, setNodes]
  );

  // Import graph from Kestra output (graph.json)
  const handleImportGraph = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graphData = JSON.parse(e.target.result);
        
        // Map Kestra nodes to React Flow format
        const mappedNodes = (graphData.nodes || []).map((node) => ({
          id: node.id,
          type: node.type || "infrastructureNode",
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node.data,
            icon: node.data?.icon || "box",
            style: node.style,
          },
        }));

        // Map edges with styling
        const mappedEdges = (graphData.edges || []).map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || "smoothstep",
          animated: edge.animated || false,
          style: edge.style || {},
        }));

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setMetadata(graphData.metadata || null);
        
        // Auto-fit view after import
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
        
      } catch (err) {
        console.error("Failed to parse graph JSON:", err);
        alert("Invalid graph.json file. Please check the format.");
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be re-imported
    event.target.value = "";
  }, [setNodes, setEdges]);

  const handleExportIaC = () => {
    const graphData = { 
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        animated: e.animated,
      })),
      metadata 
    };
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture-graph.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Components</h2>
        </div>
        <div className={styles.palette}>
          {paletteItems.map((item) => (
            <button
              key={item.type}
              className={`${styles.paletteItem} ${
                selectedPaletteItem?.type === item.type ? styles.selected : ""
              }`}
              onClick={() => setSelectedPaletteItem(item)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Import Section */}
        <div className={styles.importSection}>
          <h3 className={styles.importTitle}>Kestra Pipeline</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportGraph}
            style={{ display: "none" }}
          />
          <button 
            className={styles.importBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            <span>Import graph.json</span>
          </button>
          <p className={styles.importHint}>
            Upload output from 04-render-graph pipeline
          </p>
        </div>
        
        <div className={styles.sidebarInfo}>
          <p>Click a component, then click on the canvas to add it.</p>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className={styles.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className={styles.reactFlow}
        >
          <Background color="#27272a" gap={20} />
          <Controls className={styles.controls} />
          
          {/* Top Toolbar */}
          <Panel position="top-right" className={styles.toolbar}>
            {metadata && (
              <button 
                className={`${styles.toolbarBtn} ${showMetadata ? styles.active : ""}`}
                onClick={() => setShowMetadata(!showMetadata)}
              >
                <Info size={18} />
                <span>Metadata</span>
              </button>
            )}
            <button className={styles.toolbarBtn} onClick={handleExportIaC}>
              <Download size={18} />
              <span>Export IaC</span>
            </button>
            <button className={styles.toolbarBtn}>
              <Save size={18} />
              <span>Save</span>
            </button>
          </Panel>

          {/* Metadata Panel */}
          {metadata && showMetadata && (
            <Panel position="top-left" className={styles.metadataPanel}>
              <div className={styles.metadataHeader}>
                <h3>Architecture Info</h3>
                <button onClick={() => setShowMetadata(false)} className={styles.closeBtn}>
                  <X size={16} />
                </button>
              </div>
              <div className={styles.metadataContent}>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Pattern</span>
                  <span className={styles.metadataValue}>{metadata.pattern || "N/A"}</span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Source</span>
                  <span className={`${styles.metadataValue} ${styles.sourceBadge}`}>
                    {metadata.source || "N/A"}
                  </span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Scaling</span>
                  <span className={styles.metadataValue}>{metadata.scaling_strategy || "N/A"}</span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Cost Tier</span>
                  <span className={styles.metadataValue}>{metadata.estimated_cost_tier || "N/A"}</span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Components</span>
                  <span className={styles.metadataValue}>{metadata.component_count || 0}</span>
                </div>
                {metadata.rationale && (
                  <div className={styles.metadataRationale}>
                    <span className={styles.metadataLabel}>Rationale</span>
                    <p>{metadata.rationale}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Selection Indicator */}
          {selectedPaletteItem && (
            <Panel position="top-center" className={styles.selectionIndicator}>
              <Plus size={16} />
              <span>Click on canvas to add {selectedPaletteItem.label}</span>
            </Panel>
          )}
        </ReactFlow>
      </main>
    </div>
  );
}

// Custom Node Components
function ServiceNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#3b82f6" }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <Server size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

function DatabaseNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#22c55e" }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <Database size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

function LoadBalancerNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#a855f7" }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <Globe size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

function CacheNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#f59e0b" }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <HardDrive size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

function QueueNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#ec4899" }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <MessageSquare size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

