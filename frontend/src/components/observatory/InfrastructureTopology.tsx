import React, { useState } from 'react';
import {
  Server,
  Database,
  Globe,
  Radio,
  Cpu,
  HardDrive,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface TopologyNode {
  id: string;
  name: string;
  type: 'gateway' | 'compute' | 'database' | 'worker' | 'cache';
  ip: string;
  region: string;
  status: 'healthy' | 'warning' | 'critical';
  cpuPercent: number;
  memoryPercent: number;
  connections: number;
  latencyMs: number;
  x: number;
  y: number;
}

export interface TopologyLink {
  from: string;
  to: string;
  trafficRate: string;
  active: boolean;
}

const DEFAULT_NODES: TopologyNode[] = [
  {
    id: 'edge-gw',
    name: 'edge-gateway-01',
    type: 'gateway',
    ip: '10.0.1.1',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 24,
    memoryPercent: 41,
    connections: 1840,
    latencyMs: 4.2,
    x: 100,
    y: 200,
  },
  {
    id: 'api-01',
    name: 'sentinel-api-core-01',
    type: 'compute',
    ip: '10.0.2.14',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 38,
    memoryPercent: 54,
    connections: 840,
    latencyMs: 1.8,
    x: 320,
    y: 120,
  },
  {
    id: 'api-02',
    name: 'sentinel-api-core-02',
    type: 'compute',
    ip: '10.0.2.15',
    region: 'us-east-1b',
    status: 'healthy',
    cpuPercent: 35,
    memoryPercent: 52,
    connections: 790,
    latencyMs: 2.1,
    x: 320,
    y: 280,
  },
  {
    id: 'worker-01',
    name: 'telemetry-daemon-01',
    type: 'worker',
    ip: '10.0.3.8',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 18,
    memoryPercent: 32,
    connections: 140,
    latencyMs: 0.8,
    x: 540,
    y: 80,
  },
  {
    id: 'ml-worker',
    name: 'isolation-forest-engine',
    type: 'worker',
    ip: '10.0.3.9',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 48,
    memoryPercent: 64,
    connections: 95,
    latencyMs: 3.4,
    x: 540,
    y: 200,
  },
  {
    id: 'db-primary',
    name: 'postgres-17-primary',
    type: 'database',
    ip: '10.0.4.5',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 42,
    memoryPercent: 68,
    connections: 32,
    latencyMs: 1.2,
    x: 760,
    y: 160,
  },
  {
    id: 'cache-01',
    name: 'redis-state-store',
    type: 'cache',
    ip: '10.0.4.20',
    region: 'us-east-1a',
    status: 'healthy',
    cpuPercent: 12,
    memoryPercent: 28,
    connections: 410,
    latencyMs: 0.4,
    x: 760,
    y: 280,
  },
];

const DEFAULT_LINKS: TopologyLink[] = [
  { from: 'edge-gw', to: 'api-01', trafficRate: '14.2 MB/s', active: true },
  { from: 'edge-gw', to: 'api-02', trafficRate: '12.8 MB/s', active: true },
  { from: 'api-01', to: 'worker-01', trafficRate: '4.1 MB/s', active: true },
  { from: 'api-01', to: 'ml-worker', trafficRate: '8.4 MB/s', active: true },
  { from: 'api-02', to: 'ml-worker', trafficRate: '7.9 MB/s', active: true },
  { from: 'api-01', to: 'db-primary', trafficRate: '2.4 MB/s', active: true },
  { from: 'api-02', to: 'db-primary', trafficRate: '2.1 MB/s', active: true },
  { from: 'api-01', to: 'cache-01', trafficRate: '18.0 MB/s', active: true },
  { from: 'api-02', to: 'cache-01', trafficRate: '16.5 MB/s', active: true },
];

export const InfrastructureTopology: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredNodes = DEFAULT_NODES.filter((n) =>
    filterType === 'all' ? true : n.type === filterType
  );

  const getNodeIcon = (type: TopologyNode['type']) => {
    switch (type) {
      case 'gateway':
        return <Globe className="h-4 w-4 text-obs-accent" />;
      case 'database':
        return <Database className="h-4 w-4 text-indigo-400" />;
      case 'worker':
        return <Radio className="h-4 w-4 text-obs-warning" />;
      case 'cache':
        return <Zap className="h-4 w-4 text-cyan-400" />;
      default:
        return <Server className="h-4 w-4 text-obs-healthy" />;
    }
  };

  const getStatusColor = (status: TopologyNode['status']) => {
    switch (status) {
      case 'healthy':
        return '#36D399';
      case 'warning':
        return '#F5B942';
      case 'critical':
        return '#FF5C67';
    }
  };

  return (
    <div className="relative rounded-2xl border border-obs-border bg-obs-panel shadow-panel overflow-hidden">
      {/* Topology Header Controls */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-obs-border bg-obs-bg-secondary/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-obs-accent animate-pulse" />
            <span className="font-mono text-xs font-bold text-obs-text-primary uppercase tracking-wider">
              Infrastructure Mesh Topology
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-obs-panel border border-obs-border text-obs-text-secondary">
            {filteredNodes.length} Nodes Online
          </span>
        </div>

        {/* Filters and Zoom Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex rounded-lg border border-obs-border bg-obs-panel p-0.5">
            {['all', 'compute', 'database', 'worker'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors ${
                  filterType === type
                    ? 'bg-obs-accent text-obs-bg font-bold'
                    : 'text-obs-text-secondary hover:text-obs-text-primary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-obs-border pl-2 text-obs-text-secondary">
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded hover:bg-obs-surface hover:text-obs-text-primary transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 rounded hover:bg-obs-surface hover:text-obs-text-primary transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded hover:bg-obs-surface hover:text-obs-text-primary transition-colors"
              title="Reset View"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Mesh Canvas */}
      <div className="relative w-full h-[440px] observatory-grid overflow-hidden bg-obs-bg">
        <svg
          viewBox="0 0 920 380"
          className="w-full h-full select-none"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
        >
          <defs>
            <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#243247" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#58A6FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#243247" stopOpacity="0.8" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links between nodes */}
          {DEFAULT_LINKS.map((link, idx) => {
            const source = DEFAULT_NODES.find((n) => n.id === link.from);
            const target = DEFAULT_NODES.find((n) => n.id === link.to);
            if (!source || !target) return null;

            const dx = target.x - source.x;
            const cx1 = source.x + dx * 0.5;
            const cy1 = source.y;
            const cx2 = source.x + dx * 0.5;
            const cy2 = target.y;

            const pathData = `M ${source.x} ${source.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${target.x} ${target.y}`;

            return (
              <g key={idx}>
                {/* Background Link Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#1A2536"
                  strokeWidth="2"
                />
                {/* Active Directional Signal Beam */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#58A6FF"
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                  className="animate-pulse"
                  strokeOpacity="0.4"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const statusColor = getStatusColor(node.status);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
              >
                {/* Selection / Status Outer Ring */}
                <circle
                  r={isSelected ? '26' : '22'}
                  fill="#0D1420"
                  stroke={isSelected ? '#58A6FF' : '#243247'}
                  strokeWidth={isSelected ? '2' : '1.5'}
                  className="transition-all duration-200 group-hover:stroke-obs-accent"
                />

                {/* Inner Pulse Dot */}
                <circle
                  cx="12"
                  cy="-12"
                  r="3.5"
                  fill={statusColor}
                />

                {/* Node Center Badge */}
                <circle
                  r="14"
                  fill="#111B29"
                />

                {/* Icon ForeignObject */}
                <foreignObject x="-8" y="-8" width="16" height="16">
                  <div className="flex items-center justify-center">
                    {getNodeIcon(node.type)}
                  </div>
                </foreignObject>

                {/* Node Label Below */}
                <text
                  y="34"
                  textAnchor="middle"
                  fill="#E8EEF7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="600"
                  className="pointer-events-none group-hover:fill-obs-accent"
                >
                  {node.name}
                </text>
                <text
                  y="46"
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {node.ip}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Node Deep Inspector Side Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 rounded-xl border border-obs-border bg-obs-panel/95 backdrop-blur-md p-4 shadow-2xl font-mono text-xs z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-obs-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-obs-healthy" />
                <span className="font-bold text-obs-text-primary truncate">{selectedNode.name}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded hover:bg-obs-surface text-obs-text-secondary hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-obs-text-secondary">
              <div className="flex justify-between">
                <span>Cluster Role:</span>
                <span className="text-obs-text-primary uppercase font-semibold">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span>IPv4 Address:</span>
                <span className="text-obs-accent font-semibold">{selectedNode.ip}</span>
              </div>
              <div className="flex justify-between">
                <span>Region / Zone:</span>
                <span className="text-obs-text-primary">{selectedNode.region}</span>
              </div>
              <div className="flex justify-between">
                <span>Network Latency:</span>
                <span className="text-obs-healthy">{selectedNode.latencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Active Sockets:</span>
                <span className="text-obs-text-primary">{selectedNode.connections}</span>
              </div>

              {/* Resource Meters */}
              <div className="pt-2 border-t border-obs-border/80 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-obs-accent" /> CPU Load
                    </span>
                    <span className="text-obs-text-primary font-bold">{selectedNode.cpuPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-obs-surface overflow-hidden">
                    <div
                      className="h-full bg-obs-accent"
                      style={{ width: `${selectedNode.cpuPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-indigo-400" /> Memory RSS
                    </span>
                    <span className="text-obs-text-primary font-bold">{selectedNode.memoryPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-obs-surface overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${selectedNode.memoryPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
