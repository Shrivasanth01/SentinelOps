import asyncio
import logging
import platform
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.monitoring.prometheus_client import PrometheusClient
from app.services.monitored_service_service import monitored_service_service
from app.schemas.topology import TopologyEdge, TopologyNode, TopologyResponse

logger = logging.getLogger("sentinelops.services.topology")


class TopologyService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_topology(self, session: AsyncSession) -> TopologyResponse:
        """
        Synthesizes the complete infrastructure relationship topology graph.
        Discovers Host, OS, Exporters, Prometheus, Backend, PostgreSQL, and User-Configured Services.
        """
        now = datetime.now(timezone.utc)
        hostname = platform.node()
        os_platform = platform.system()
        os_release = platform.release()
        os_version = platform.version()

        # Probe status of core components
        prometheus_online = await self.client.check_health()

        # Check Windows Exporter target status in Prometheus
        win_exporter_status = "UNKNOWN"
        blackbox_exporter_status = "UNKNOWN"

        if prometheus_online:
            try:
                targets_data = await self.client.get_targets()
                for t in targets_data.get("activeTargets", []):
                    job = t.get("labels", {}).get("job", "").lower()
                    h = str(t.get("health", "")).upper()
                    if "windows" in job:
                        win_exporter_status = "HEALTHY" if h == "UP" else "CRITICAL"
                    elif "blackbox" in job:
                        blackbox_exporter_status = "HEALTHY" if h == "UP" else "CRITICAL"
            except Exception as exc:
                logger.debug(f"Failed to query Prometheus targets for topology: {exc}")

        # Check DB probe
        db_status = "HEALTHY"
        try:
            from app.db.session import check_database_connectivity
            db_conn, _, _ = await check_database_connectivity(timeout=2.0)
            db_status = "HEALTHY" if db_conn else "CRITICAL"
        except Exception:
            db_status = "UNKNOWN"

        # Fetch configured monitored services from PostgreSQL
        services_list_resp = await monitored_service_service.probe_all_services(session)

        # Build Graph Nodes
        nodes: list[TopologyNode] = [
            TopologyNode(
                id="node-host",
                label=f"Host Machine ({hostname})",
                type="host",
                category="Infrastructure",
                status="HEALTHY" if prometheus_online else "WARNING",
                address="127.0.0.1",
                metadata={
                    "hostname": hostname,
                    "architecture": platform.machine(),
                    "cpu_count": platform.processor() or "Multi-core",
                    "role": "Observability Host Server",
                },
            ),
            TopologyNode(
                id="node-os",
                label=f"Operating System ({os_platform})",
                type="os",
                category="Infrastructure",
                status="HEALTHY",
                metadata={
                    "platform": os_platform,
                    "release": os_release,
                    "build": os_version,
                },
            ),
            TopologyNode(
                id="node-exporter-windows",
                label="Windows Exporter",
                type="exporter",
                category="Observability",
                status=win_exporter_status if win_exporter_status != "UNKNOWN" else "HEALTHY",
                address="127.0.0.1",
                port=9182,
                metadata={
                    "port": 9182,
                    "protocol": "HTTP /metrics",
                    "collectors": ["cpu", "memory", "logical_disk", "net", "os", "system", "service"],
                },
            ),
            TopologyNode(
                id="node-exporter-blackbox",
                label="Blackbox Exporter",
                type="exporter",
                category="Observability",
                status="HEALTHY",
                address="127.0.0.1",
                port=9115,
                metadata={
                    "port": 9115,
                    "protocol": "HTTP /probe",
                    "capabilities": ["HTTP/HTTPS 2xx", "TCP Connect", "TLS Handshake"],
                },
            ),
            TopologyNode(
                id="node-prometheus",
                label="Prometheus TSDB",
                type="prometheus",
                category="Observability",
                status="HEALTHY" if prometheus_online else "CRITICAL",
                address="127.0.0.1",
                port=9090,
                metadata={
                    "port": 9090,
                    "scrape_interval": "10s",
                    "storage": "TSDB Local Storage",
                    "api_url": settings.PROMETHEUS_URL,
                },
            ),
            TopologyNode(
                id="node-backend",
                label="SentinelOps Backend API",
                type="backend",
                category="Platform",
                status="HEALTHY",
                address="127.0.0.1",
                port=8000,
                metadata={
                    "version": settings.VERSION,
                    "runtime": "Python 3.13 / FastAPI",
                    "api_prefix": settings.API_V1_STR,
                },
            ),
            TopologyNode(
                id="node-postgres",
                label="PostgreSQL 17 Database",
                type="database",
                category="Platform",
                status=db_status,
                address=settings.POSTGRES_SERVER,
                port=settings.POSTGRES_PORT,
                metadata={
                    "database": settings.POSTGRES_DB,
                    "pool_size": settings.DB_POOL_SIZE,
                    "driver": "asyncpg / psycopg3",
                },
            ),
        ]

        # Build Graph Edges
        edges: list[TopologyEdge] = [
            TopologyEdge(
                id="edge-host-os",
                source="node-host",
                target="node-os",
                relation="runs_on",
                status="ACTIVE",
            ),
            TopologyEdge(
                id="edge-host-winexp",
                source="node-host",
                target="node-exporter-windows",
                relation="hosts",
                status="ACTIVE",
            ),
            TopologyEdge(
                id="edge-host-blackbox",
                source="node-host",
                target="node-exporter-blackbox",
                relation="hosts",
                status="ACTIVE",
            ),
            TopologyEdge(
                id="edge-winexp-prom",
                source="node-exporter-windows",
                target="node-prometheus",
                relation="scrapes",
                status="ACTIVE" if win_exporter_status != "CRITICAL" else "DEGRADED",
                animated=True,
            ),
            TopologyEdge(
                id="edge-blackbox-prom",
                source="node-exporter-blackbox",
                target="node-prometheus",
                relation="scrapes",
                status="ACTIVE",
                animated=True,
            ),
            TopologyEdge(
                id="edge-prom-backend",
                source="node-prometheus",
                target="node-backend",
                relation="queried_by",
                status="ACTIVE" if prometheus_online else "OFFLINE",
                animated=True,
            ),
            TopologyEdge(
                id="edge-postgres-backend",
                source="node-postgres",
                target="node-backend",
                relation="persists_for",
                status="ACTIVE" if db_status == "HEALTHY" else "OFFLINE",
            ),
            TopologyEdge(
                id="edge-backend-blackbox",
                source="node-backend",
                target="node-exporter-blackbox",
                relation="probes",
                status="ACTIVE",
            ),
        ]

        # Dynamically append user-configured monitored targets
        for svc in services_list_resp.services:
            svc_node_id = f"node-svc-{svc.id}"
            svc_status = (
                "HEALTHY"
                if svc.availability_status == "UP"
                else "DEGRADED"
                if svc.availability_status == "DEGRADED"
                else "CRITICAL"
                if svc.availability_status == "DOWN"
                else "UNKNOWN"
            )

            nodes.append(
                TopologyNode(
                    id=svc_node_id,
                    label=svc.name,
                    type="service",
                    category="Application",
                    status=svc_status,
                    address=svc.target_url,
                    metadata={
                        "target_url": svc.target_url,
                        "protocol": svc.protocol,
                        "expected_status": svc.expected_status_code,
                        "response_time_ms": svc.response_time_ms,
                        "http_status_code": svc.http_status_code,
                        "tls_cert_expiry_days": svc.tls_cert_expiry_days,
                        "last_error": svc.last_error,
                    },
                )
            )

            # Edge from blackbox to monitored target
            edges.append(
                TopologyEdge(
                    id=f"edge-blackbox-{svc.id}",
                    source="node-exporter-blackbox",
                    target=svc_node_id,
                    relation="probes",
                    status="ACTIVE" if svc_status in ("HEALTHY", "DEGRADED") else "DEGRADED",
                    animated=svc.enabled,
                )
            )

            # Edge from backend to monitored target (management)
            edges.append(
                TopologyEdge(
                    id=f"edge-backend-{svc.id}",
                    source="node-backend",
                    target=svc_node_id,
                    relation="manages",
                    status="ACTIVE",
                )
            )

        # Calculate health counts
        health_counts: dict[str, int] = {}
        for n in nodes:
            health_counts[n.status] = health_counts.get(n.status, 0) + 1

        return TopologyResponse(
            timestamp=now,
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
            health_summary=health_counts,
        )


topology_service = TopologyService()
