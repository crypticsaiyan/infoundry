"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
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
} from "lucide-react";
import styles from "./page.module.css";

// Custom node types
const nodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  loadBalancer: LoadBalancerNode,
  cache: CacheNode,
  queue: QueueNode,
};

// Initial nodes for demo
const initialNodes = [
  {
    id: "lb",
    type: "loadBalancer",
    position: { x: 400, y: 50 },
    data: { label: "Load Balancer" },
  },
  {
    id: "auth",
    type: "service",
    position: { x: 200, y: 200 },
    data: { label: "Auth Service" },
  },
  {
    id: "api",
    type: "service",
    position: { x: 400, y: 200 },
    data: { label: "API Gateway" },
  },
  {
    id: "payments",
    type: "service",
    position: { x: 600, y: 200 },
    data: { label: "Payments" },
  },
  {
    id: "db",
    type: "database",
    position: { x: 300, y: 380 },
    data: { label: "PostgreSQL" },
  },
  {
    id: "cache",
    type: "cache",
    position: { x: 500, y: 380 },
    data: { label: "Redis Cache" },
  },
];

const initialEdges = [
  { id: "e1", source: "lb", target: "auth", animated: true },
  { id: "e2", source: "lb", target: "api", animated: true },
  { id: "e3", source: "lb", target: "payments", animated: true },
  { id: "e4", source: "auth", target: "db" },
  { id: "e5", source: "api", target: "db" },
  { id: "e6", source: "api", target: "cache" },
  { id: "e7", source: "payments", target: "db" },
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPaletteItem, setSelectedPaletteItem] = useState(null);

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

  const handleExportIaC = () => {
    // Generate graph JSON for export
    const graphData = { nodes, edges };
    console.log("Exporting IaC:", JSON.stringify(graphData, null, 2));
    alert("IaC export initiated! Check console for graph data.");
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
            <button className={styles.toolbarBtn} onClick={handleExportIaC}>
              <Download size={18} />
              <span>Export IaC</span>
            </button>
            <button className={styles.toolbarBtn}>
              <Save size={18} />
              <span>Save</span>
            </button>
            <button className={styles.toolbarBtn}>
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </Panel>

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
      <Server size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
    </div>
  );
}

function DatabaseNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#22c55e" }}>
      <Database size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
    </div>
  );
}

function LoadBalancerNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#a855f7" }}>
      <Globe size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
    </div>
  );
}

function CacheNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#f59e0b" }}>
      <HardDrive size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
    </div>
  );
}

function QueueNode({ data }) {
  return (
    <div className={styles.node} style={{ borderColor: "#ec4899" }}>
      <MessageSquare size={18} className={styles.nodeIcon} />
      <span className={styles.nodeLabel}>{data.label}</span>
    </div>
  );
}
