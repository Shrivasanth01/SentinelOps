export type TopologyNodeType =
  | 'host'
  | 'os'
  | 'exporter'
  | 'prometheus'
  | 'backend'
  | 'database'
  | 'service';

export type TopologyHealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface TopologyNode {
  id: string;
  label: string;
  type: TopologyNodeType;
  category: string;
  status: TopologyHealthStatus;
  address?: string | null;
  port?: number | null;
  metadata: Record<string, any>;
  x?: number;
  y?: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  status: string;
  animated: boolean;
}

export interface TopologyResponse {
  timestamp: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  total_nodes: number;
  total_edges: number;
  health_summary: Record<string, number>;
}
