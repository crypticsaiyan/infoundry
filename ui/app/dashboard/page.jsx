"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
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
  Share2,
  Upload,
  Zap,
  Box,
  Grid,
  Cpu,
  Archive,
  Bell,
  Activity,
  TrendingUp,
  Folder,
  X,
  Info,
  Shield,
  Lock,
  Key,
  Gauge,
  Container,
  Plus,
} from "lucide-react";
import styles from "./page.module.css";

// Component palette items organized by category
const PALETTE_ITEMS = {
  compute: [
    { type: "ec2", label: "Amazon EC2", icon: Server, color: "#FF9900" },
    { type: "ecs", label: "Amazon ECS", icon: Container, color: "#FF9900" },
    { type: "lambda", label: "AWS Lambda", icon: Zap, color: "#FF9900" },
    { type: "fargate", label: "AWS Fargate", icon: Box, color: "#FF9900" },
  ],
  database: [
    { type: "rds", label: "Amazon RDS", icon: Database, color: "#3B48CC" },
    { type: "dynamodb", label: "DynamoDB", icon: Grid, color: "#3B48CC" },
    { type: "elasticache", label: "ElastiCache", icon: Cpu, color: "#C925D1" },
    { type: "aurora", label: "Aurora", icon: Database, color: "#3B48CC" },
  ],
  network: [
    { type: "alb", label: "Load Balancer", icon: Share2, color: "#8C4FFF" },
    { type: "api_gateway", label: "API Gateway", icon: Globe, color: "#8C4FFF" },
    { type: "cloudfront", label: "CloudFront", icon: Cloud, color: "#1A73E8" },
    { type: "vpc", label: "Amazon VPC", icon: Shield, color: "#8C4FFF" },
  ],
  storage: [
    { type: "s3", label: "Amazon S3", icon: Folder, color: "#3F8624" },
    { type: "efs", label: "Amazon EFS", icon: HardDrive, color: "#3F8624" },
    { type: "ecr", label: "Amazon ECR", icon: Archive, color: "#FF9900" },
  ],
  messaging: [
    { type: "sqs", label: "Amazon SQS", icon: MessageSquare, color: "#FF4F8B" },
    { type: "sns", label: "Amazon SNS", icon: Bell, color: "#FF4F8B" },
    { type: "kinesis", label: "Kinesis", icon: Activity, color: "#FF4F8B" },
  ],
  security: [
    { type: "iam", label: "AWS IAM", icon: Lock, color: "#DD344C" },
    { type: "cognito", label: "Cognito", icon: Key, color: "#DD344C" },
    { type: "cloudwatch", label: "CloudWatch", icon: Gauge, color: "#FF4F8B" },
  ],
};

// Full service name mapping
const SERVICE_NAME_MAP = {
  rds: "Amazon RDS",
  ec2: "Amazon EC2",
  ecs: "Amazon ECS",
  ecs_cluster: "Amazon ECS Cluster",
  eks: "Amazon EKS",
  lambda: "AWS Lambda",
  s3: "Amazon S3",
  dynamodb: "Amazon DynamoDB",
  elasticache: "Amazon ElastiCache",
  sqs: "Amazon SQS",
  sns: "Amazon SNS",
  alb: "Application Load Balancer",
  nlb: "Network Load Balancer",
  elb: "Elastic Load Balancer",
  api_gateway: "Amazon API Gateway",
  cloudfront: "Amazon CloudFront",
  cdn: "Amazon CloudFront CDN",
  route53: "Amazon Route 53",
  vpc: "Amazon VPC",
  iam: "AWS IAM",
  cognito: "Amazon Cognito",
  secrets_manager: "AWS Secrets Manager",
  kms: "AWS KMS",
  cloudwatch: "Amazon CloudWatch",
  xray: "AWS X-Ray",
  efs: "Amazon EFS",
  ebs: "Amazon EBS",
  ecr: "Amazon ECR",
  fargate: "AWS Fargate",
  aurora: "Amazon Aurora",
  redshift: "Amazon Redshift",
  kinesis: "Amazon Kinesis",
  eventbridge: "Amazon EventBridge",
  hpa: "Horizontal Pod Autoscaler",
  kubernetes: "Kubernetes",
};

// AWS service color scheme
const SERVICE_COLORS = {
  ec2: "#FF9900", ecs: "#FF9900", ecs_cluster: "#FF9900", lambda: "#FF9900", fargate: "#FF9900",
  rds: "#3B48CC", aurora: "#3B48CC", dynamodb: "#3B48CC",
  s3: "#3F8624", efs: "#3F8624", ebs: "#3F8624",
  vpc: "#8C4FFF", alb: "#8C4FFF", nlb: "#8C4FFF", api_gateway: "#8C4FFF",
  cloudfront: "#1A73E8", cdn: "#1A73E8",
  elasticache: "#C925D1",
  sqs: "#FF4F8B", sns: "#FF4F8B", kinesis: "#FF4F8B",
  iam: "#DD344C", cognito: "#DD344C",
  cloudwatch: "#FF4F8B",
  ecr: "#FF9900",
};

// Icon mapping
const ICON_MAP = {
  rds: Database, aurora: Database, dynamodb: Grid, database: Database,
  ec2: Server, ecs: Container, ecs_cluster: Container, lambda: Zap, fargate: Box,
  s3: Folder, efs: HardDrive, ebs: HardDrive, storage: HardDrive,
  vpc: Shield, alb: Share2, nlb: Share2, api_gateway: Globe,
  cloudfront: Cloud, cdn: Cloud,
  elasticache: Cpu,
  sqs: MessageSquare, sns: Bell, kinesis: Activity,
  iam: Lock, cognito: Key,
  cloudwatch: Gauge,
  ecr: Archive,
  server: Server, globe: Globe, "share-2": Share2, box: Box,
  layers: Layers, zap: Zap, cloud: Cloud, folder: Folder,
};

function getFullServiceName(label, type) {
  const typeKey = type?.toLowerCase().replace(/[- ]/g, "_");
  if (SERVICE_NAME_MAP[typeKey]) return SERVICE_NAME_MAP[typeKey];
  const labelKey = label?.toLowerCase().replace(/[- ]/g, "_");
  if (SERVICE_NAME_MAP[labelKey]) return SERVICE_NAME_MAP[labelKey];
  return label || "Service";
}

function getServiceColor(type, defaultColor) {
  const typeKey = type?.toLowerCase().replace(/[- ]/g, "_");
  return SERVICE_COLORS[typeKey] || defaultColor || "#666";
}

function getIconComponent(icon, type) {
  const typeKey = type?.toLowerCase().replace(/[- ]/g, "_");
  return ICON_MAP[typeKey] || ICON_MAP[icon] || Box;
}

// InFoundry Logo
function InFoundryLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" strokeWidth="2" />
      <rect x="7" y="7" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

// Infrastructure node component
function InfrastructureNode({ data }) {
  const IconComponent = getIconComponent(data.icon, data.type);
  const bgColor = getServiceColor(data.type, data.style?.background);
  const fullName = getFullServiceName(data.label, data.type);
  
  return (
    <div className={styles.infraNode} style={{ borderColor: bgColor, boxShadow: `0 0 20px ${bgColor}40` }}>
      <Handle type="target" position={Position.Top} className={styles.handle} />
      <div className={styles.infraNodeContent}>
        <div className={styles.infraNodeIcon} style={{ background: bgColor }}>
          <IconComponent size={20} color="#fff" />
        </div>
        <span className={styles.infraNodeLabel}>{fullName}</span>
        {data.scaling && <span className={styles.scalingBadge}><TrendingUp size={12} /></span>}
      </div>
      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

const nodeTypes = { infrastructureNode: InfrastructureNode };
const initialNodes = [];
const initialEdges = [];

export default function DashboardPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [metadata, setMetadata] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [selectedPaletteItem, setSelectedPaletteItem] = useState(null);
  const [showPalette, setShowPalette] = useState(true);
  const fileInputRef = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // Load graph from localStorage if coming from pipeline
  useEffect(() => {
    const savedGraph = localStorage.getItem('infoundry_graph');
    if (savedGraph) {
      try {
        const graphData = JSON.parse(savedGraph);
        
        // Map nodes
        const mappedNodes = (graphData.nodes || []).map((node) => ({
          id: node.id,
          type: node.type || "infrastructureNode",
          position: node.position || { x: 0, y: 0 },
          data: { ...node.data, icon: node.data?.icon || "box", type: node.data?.type || node.id, style: node.style },
        }));
        
        // Map edges
        const mappedEdges = (graphData.edges || []).map((edge) => ({
          id: edge.id, source: edge.source, target: edge.target,
          type: edge.type || "smoothstep", animated: edge.animated || false, style: edge.style || {},
        }));
        
        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setMetadata(graphData.metadata || null);
        setShowMetadata(true);
        
        // Clear localStorage after loading
        localStorage.removeItem('infoundry_graph');
      } catch (err) {
        console.error("Failed to load graph from localStorage:", err);
      }
    }
  }, [setNodes, setEdges]);

  // Add node on canvas click when palette item is selected
  const onPaneClick = useCallback((event) => {
    if (!selectedPaletteItem) return;

    const bounds = event.target.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left - 70,
      y: event.clientY - bounds.top - 40,
    };

    const newNode = {
      id: `${selectedPaletteItem.type}-${Date.now()}`,
      type: "infrastructureNode",
      position,
      data: {
        label: selectedPaletteItem.label,
        type: selectedPaletteItem.type,
        icon: selectedPaletteItem.type,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedPaletteItem(null);
  }, [selectedPaletteItem, setNodes]);

  // Import graph
  const handleImportGraph = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graphData = JSON.parse(e.target.result);
        const mappedNodes = (graphData.nodes || []).map((node) => ({
          id: node.id,
          type: node.type || "infrastructureNode",
          position: node.position || { x: 0, y: 0 },
          data: { ...node.data, icon: node.data?.icon || "box", type: node.data?.type || node.id, style: node.style },
        }));
        const mappedEdges = (graphData.edges || []).map((edge) => ({
          id: edge.id, source: edge.source, target: edge.target,
          type: edge.type || "smoothstep", animated: edge.animated || false, style: edge.style || {},
        }));
        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setMetadata(graphData.metadata || null);
        setShowMetadata(true);
      } catch (err) {
        alert("Invalid graph.json file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }, [setNodes, setEdges]);

  const handleExportGraph = () => {
    const graphData = { nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })), metadata };
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "architecture-graph.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setMetadata(null);
  };

  const hasGraph = nodes.length > 0;

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.logo}>
            <InFoundryLogo />
            <span className={styles.logoText}>InFoundry</span>
          </Link>
          <div className={styles.headerDivider} />
          <h1 className={styles.headerTitle}>Architecture Builder</h1>
        </div>
        <div className={styles.headerActions}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportGraph} style={{ display: "none" }} />
          <button className={styles.actionBtn} onClick={() => setShowPalette(!showPalette)}>
            <Layers size={16} />
            <span>{showPalette ? "Hide" : "Show"} Palette</span>
          </button>
          <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            <span>Import</span>
          </button>
          {hasGraph && (
            <>
              <button className={styles.actionBtn} onClick={handleExportGraph}>
                <Download size={16} />
                <span>Export</span>
              </button>
              <button className={styles.actionBtnDanger} onClick={handleClearCanvas}>
                <X size={16} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {/* Component Palette Sidebar */}
        {showPalette && (
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h2>Components</h2>
              <span className={styles.sidebarHint}>Click to select, then click canvas</span>
            </div>
            <div className={styles.paletteList}>
              {Object.entries(PALETTE_ITEMS).map(([category, items]) => (
                <div key={category} className={styles.paletteCategory}>
                  <h3 className={styles.categoryTitle}>{category}</h3>
                  <div className={styles.paletteItems}>
                    {items.map((item) => (
                      <button
                        key={item.type}
                        className={`${styles.paletteItem} ${selectedPaletteItem?.type === item.type ? styles.selected : ""}`}
                        onClick={() => setSelectedPaletteItem(selectedPaletteItem?.type === item.type ? null : item)}
                        style={{ "--item-color": item.color }}
                      >
                        <div className={styles.paletteItemIcon} style={{ background: item.color }}>
                          <item.icon size={16} color="#fff" />
                        </div>
                        <span className={styles.paletteItemLabel}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

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

            {/* Selection Indicator */}
            {selectedPaletteItem && (
              <Panel position="top-center" className={styles.selectionIndicator}>
                <Plus size={16} />
                <span>Click on canvas to place {selectedPaletteItem.label}</span>
              </Panel>
            )}

            {/* Metadata Panel */}
            {metadata && showMetadata && (
              <Panel position="top-left" className={styles.metadataPanel}>
                <div className={styles.metadataHeader}>
                  <h3>Architecture Info</h3>
                  <button onClick={() => setShowMetadata(false)} className={styles.closeBtn}><X size={16} /></button>
                </div>
                <div className={styles.metadataContent}>
                  <div className={styles.metadataItem}><span className={styles.metadataLabel}>Pattern</span><span className={styles.metadataValue}>{metadata.pattern || "N/A"}</span></div>
                  <div className={styles.metadataItem}><span className={styles.metadataLabel}>Source</span><span className={`${styles.metadataValue} ${styles.sourceBadge}`}>{metadata.source || "N/A"}</span></div>
                  <div className={styles.metadataItem}><span className={styles.metadataLabel}>Cloud</span><span className={styles.metadataValue}>{metadata.cloud_provider?.toUpperCase() || "N/A"}</span></div>
                  <div className={styles.metadataItem}><span className={styles.metadataLabel}>Components</span><span className={styles.metadataValue}>{metadata.component_count || nodes.length}</span></div>
                </div>
              </Panel>
            )}

            {metadata && !showMetadata && (
              <Panel position="top-left" className={styles.metadataToggle}>
                <button onClick={() => setShowMetadata(true)}><Info size={16} /><span>Info</span></button>
              </Panel>
            )}
          </ReactFlow>
        </main>
      </div>
    </div>
  );
}
