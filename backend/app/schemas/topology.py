from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field


class TopologyNode(BaseModel):
    id: str = Field(..., description="Unique node identifier in topology graph")
    label: str = Field(..., description="Human-readable display label")
    type: str = Field(..., description="Node classification: host, os, exporter, prometheus, backend, database, service")
    category: str = Field(..., description="Grouping: Infrastructure, Observability, Platform, Application")
    status: str = Field(default="HEALTHY", description="Current node operational health: HEALTHY, WARNING, CRITICAL, UNKNOWN")
    address: Optional[str] = Field(default=None, description="Host address or hostname")
    port: Optional[int] = Field(default=None, description="Port number if service/daemon")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Detailed specifications, latency, version, uptime")


class TopologyEdge(BaseModel):
    id: str = Field(..., description="Edge identifier")
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    relation: str = Field(..., description="Relationship semantic: runs_on, scrapes, persists_for, probes, depends_on")
    status: str = Field(default="ACTIVE", description="Link health: ACTIVE, DEGRADED, OFFLINE")
    animated: bool = Field(default=False, description="Whether traffic/data flow is active along this edge")


class TopologyResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nodes: list[TopologyNode] = Field(default_factory=list)
    edges: list[TopologyEdge] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0
    health_summary: dict[str, int] = Field(
        default_factory=dict,
        description="Count of nodes by status (e.g. HEALTHY: 6, WARNING: 1)",
    )

