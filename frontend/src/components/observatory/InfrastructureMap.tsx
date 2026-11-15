import React, { useState } from 'react';
import {
  Server,
  Layers,
  Activity,
  Database,
  Globe,
  RefreshCw,
  Cpu,
  Info,
} from 'lucide-react';
import { useTopology } from '../../hooks/useTopology';
import { TopologyNode, TopologyHealthStatus } from '../../types/topology';

export const InfrastructureMap: React.FC = () => {
  const { data, isLoading, lastRefreshed, refresh } = useTopology(30000);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const summary = data?.health_summary || {};

  // Compute node coordinates based on architectural tier
  const getNodeCoordinates = (node: TopologyNode, index: number) => {
    switch (node.type) {
      case 'host':
        return { x: 90, y: 150 };
      case 'os':
        return { x: 90, y: 330 };
      case 'exporter':
        if (node.id.includes('windows')) return { x: 270, y: 160 };
        return { x: 270, y: 320 };
      case 'prometheus':
        return { x: 460, y: 240 };
      case 'backend':
        return { x: 650, y: 240 };
      case 'database':
        return { x: 790, y: 140 };
      case 'service': {
        const offset = (index % 4) * 70;
        return { x: 790, y: 260 + offset };
      }
      default:
        return { x: 400, y: 200 + index * 40 };
    }
  };

  const filteredNodes = categoryFilter === 'ALL'
    ? nodes
    : nodes.filter((n) => n.category.toUpperCase() === categoryFilter.toUpperCase());

  const getStatusColor = (status: TopologyHealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return { border: 'border-obs-healthy', bg: 'bg-obs-healthy/10', text: 'text-obs-healthy', stroke: '#36D399' };
      case 'WARNING':
        return { border: 'border-obs-warning', bg: 'bg-obs-warning/10', text: 'text-obs-warning', stroke: '#F5B942' };
      case 'CRITICAL':
        return { border: 'border-obs-critical', bg: 'bg-obs-critical/10', text: 'text-obs-critical', stroke: '#FF5C67' };
      default:
        return { border: 'border-obs-border', bg: 'bg-obs-bg', text: 'text-obs-text-muted', stroke: '#243247' };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'host':
        return Server;
      case 'os':
        return Layers;
      case 'exporter':
        return Cpu;
      case 'prometheus':
        return Activity;
      case 'backend':
        return Layers;
      case 'database':
        return Database;
      case 'service':
        return Globe;
      default:
        return Server;
    }
  };

  // Build node coordinate map
  const coordsMap = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, idx) => {
    coordsMap.set(n.id, getNodeCoordinates(n, idx));
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text">
              Infrastructure Topology & Dependency Mesh
            </h1>
            <div className="text-[10px] text-obs-text-muted">
              Live interconnected topology from Host and OS to Exporters, Prometheus, and Target Endpoints
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filters */}
          <div className="flex items-center rounded border border-obs-border bg-obs-bg/80 p-0.5">
            {['ALL', 'INFRASTRUCTURE', 'OBSERVABILITY', 'PLATFORM'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                  categoryFilter === cat
                    ? 'bg-obs-accent/30 text-obs-accent border border-obs-accent/50'
                    : 'text-obs-text-muted hover:text-obs-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-1.5 border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-text hover:border-obs-accent transition-colors disabled:opacity-50"
            title="Refresh Topology Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-obs-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Topology Canvas and Inspector Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-3 p-3 rounded-lg border border-obs-border bg-obs-panel/95 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-obs-text-muted pb-2 border-b border-obs-border/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-obs-text uppercase">ARCHITECTURAL TOPOLOGY GRAPH</span>
              <span className="px-1.5 py-0.2 rounded bg-obs-bg border border-obs-border">
                {nodes.length} NODES | {edges.length} EDGES
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-obs-healthy">
                <span className="w-1.5 h-1.5 rounded-full bg-obs-healthy" />
                HEALTHY: {summary.HEALTHY ?? 0}
              </span>
              <span className="flex items-center gap-1 text-obs-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-obs-warning" />
                WARNING: {summary.WARNING ?? 0}
              </span>
              <span className="flex items-center gap-1 text-obs-critical">
                <span className="w-1.5 h-1.5 rounded-full bg-obs-critical" />
                CRITICAL: {summary.CRITICAL ?? 0}
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full h-[480px] bg-obs-bg/40 rounded border border-obs-border/40 my-2 select-none">
            <svg viewBox="0 0 880 480" className="w-full h-full">
              <defs>
                <marker
                  id="edge-arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#58A6FF" opacity="0.6" />
                </marker>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Draw Edges */}
              {edges.map((e) => {
                const src = coordsMap.get(e.source);
                const tgt = coordsMap.get(e.target);
                if (!src || !tgt) return null;

                const isEdgeDegraded = e.status === 'DEGRADED';
                const strokeColor = isEdgeDegraded ? '#FF5C67' : '#58A6FF';

                return (
                  <g key={e.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      strokeDasharray={e.animated ? '4 4' : 'none'}
                      opacity={0.5}
                      markerEnd="url(#edge-arrow)"
                    />
                    {/* Relationship label */}
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      fill="#94A3B8"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono opacity-60"
                    >
                      {e.relation}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {filteredNodes.map((node) => {
                const pos = coordsMap.get(node.id) || { x: 400, y: 240 };
                const isSelected = selectedNode?.id === node.id;
                const colors = getStatusColor(node.status);
                const Icon = getNodeIcon(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Outer glow circle if selected */}
                    {isSelected && (
                      <circle
                        r="32"
                        fill="none"
                        stroke="#58A6FF"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        className="animate-spin"
                        style={{ animationDuration: '8s' }}
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r="22"
                      fill="#111B29"
                      stroke={colors.stroke}
                      strokeWidth={isSelected ? '3' : '2'}
                      className="transition-all group-hover:scale-110"
                      filter={isSelected ? 'url(#glow)' : undefined}
                    />

                    {/* Node Center Icon */}
                    <foreignObject x="-10" y="-10" width="20" height="20">
                      <div className={`w-full h-full flex items-center justify-center ${colors.text}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </foreignObject>

                    {/* Label below node */}
                    <text
                      y="34"
                      textAnchor="middle"
                      fill={isSelected ? '#E8EEF7' : '#94A3B8'}
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="font-mono tracking-tight pointer-events-none"
                    >
                      {node.label}
                    </text>

                    {/* Small status pill */}
                    <text
                      y="46"
                      textAnchor="middle"
                      fill={colors.stroke}
                      fontSize="8"
                      className="font-mono font-bold uppercase pointer-events-none"
                    >
                      {node.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[10px] text-obs-text-muted flex justify-between pt-1">
            <span>Tip: Click any node to open live diagnostics and inspect metadata attributes.</span>
            <span>LAST SYNC: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Node Inspector Drawer */}
        <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/95 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-obs-border">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-obs-accent" />
                <h3 className="text-xs font-bold text-obs-text uppercase tracking-wider">
                  Node Diagnostics
                </h3>
              </div>
              {selectedNode && (
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-obs-text-muted hover:text-obs-text"
                >
                  ✕
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[9px] text-obs-text-muted uppercase">Node Label</div>
                  <div className="font-bold text-obs-text text-sm mt-0.5">{selectedNode.label}</div>
                  <div className="text-[10px] text-obs-accent font-mono mt-0.5">{selectedNode.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                    <div className="text-[9px] text-obs-text-muted uppercase">Tier Category</div>
                    <div className="font-semibold text-obs-text mt-0.5">{selectedNode.category}</div>
                  </div>
                  <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                    <div className="text-[9px] text-obs-text-muted uppercase">Health State</div>
                    <div className={`font-bold mt-0.5 ${getStatusColor(selectedNode.status).text}`}>
                      {selectedNode.status}
                    </div>
                  </div>
                </div>

                {selectedNode.address && (
                  <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                    <div className="text-[9px] text-obs-text-muted uppercase">Endpoint Address</div>
                    <div className="font-mono text-obs-text mt-0.5">
                      {selectedNode.address}
                      {selectedNode.port ? `:${selectedNode.port}` : ''}
                    </div>
                  </div>
                )}

                {/* Metadata Properties */}
                <div className="pt-2 border-t border-obs-border/50">
                  <div className="text-[10px] font-bold text-obs-text-muted uppercase mb-1.5">
                    Metadata Attributes
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(selectedNode.metadata || {}).map(([k, val]) => (
                      <div key={k} className="p-1.5 rounded bg-obs-bg/40 border border-obs-border/40 text-[10px]">
                        <span className="text-obs-text-muted block uppercase text-[8px]">{k}</span>
                        <span className="text-obs-text font-mono break-all">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-obs-text-muted">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-xs">Select any topology node on the canvas to inspect operational diagnostics.</div>
              </div>
            )}
          </div>

          {selectedNode && (
            <div className="pt-3 border-t border-obs-border text-[9px] text-obs-text-muted">
              Relationship connectivity: {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length} links
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
