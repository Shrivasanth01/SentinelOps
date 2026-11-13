import logging
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import HealthState, NetworkInterfaceData, NetworkMetricData

logger = logging.getLogger("sentinelops.monitoring.network")


class NetworkMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_network_metrics(self) -> NetworkMetricData:
        """
        Retrieves host network throughput metrics (Rx and Tx bytes/sec) per NIC and aggregate.
        """
        now = datetime.now(timezone.utc)
        try:
            # Query aggregate throughput rates
            rx_query = (
                "sum(irate(windows_net_bytes_received_total[1m])) or "
                "sum(rate(windows_net_bytes_received_total[1m]))"
            )
            tx_query = (
                "sum(irate(windows_net_bytes_sent_total[1m])) or "
                "sum(rate(windows_net_bytes_sent_total[1m]))"
            )

            agg_rx = self.client.extract_single_value(await self.client.query(rx_query))
            agg_tx = self.client.extract_single_value(await self.client.query(tx_query))

            # Query per-interface throughput rates
            iface_rx_query = (
                "irate(windows_net_bytes_received_total[1m]) or "
                "rate(windows_net_bytes_received_total[1m])"
            )
            iface_tx_query = (
                "irate(windows_net_bytes_sent_total[1m]) or "
                "rate(windows_net_bytes_sent_total[1m])"
            )

            iface_rx_data = await self.client.query(iface_rx_query)
            iface_tx_data = await self.client.query(iface_tx_query)

            # Map per-interface rates
            tx_map: dict[str, float] = {}
            for res in iface_tx_data.get("result", []):
                nic = res.get("metric", {}).get("nic", "")
                val_tuple = res.get("value")
                if nic and val_tuple and len(val_tuple) == 2:
                    try:
                        tx_map[nic] = round(max(0.0, float(val_tuple[1])), 2)
                    except (ValueError, TypeError):
                        pass

            interfaces: list[NetworkInterfaceData] = []
            seen_nics = set()

            for res in iface_rx_data.get("result", []):
                nic = res.get("metric", {}).get("nic", "")
                if not nic:
                    continue
                seen_nics.add(nic)
                rx_val: Optional[float] = None
                val_tuple = res.get("value")
                if val_tuple and len(val_tuple) == 2:
                    try:
                        rx_val = round(max(0.0, float(val_tuple[1])), 2)
                    except (ValueError, TypeError):
                        pass

                interfaces.append(
                    NetworkInterfaceData(
                        interface=nic,
                        rx_bytes_per_sec=rx_val,
                        tx_bytes_per_sec=tx_map.get(nic),
                    )
                )

            # Add any nics that had TX but not RX
            for nic, tx_val in tx_map.items():
                if nic not in seen_nics:
                    interfaces.append(
                        NetworkInterfaceData(
                            interface=nic,
                            rx_bytes_per_sec=None,
                            tx_bytes_per_sec=tx_val,
                        )
                    )

            # Sort interfaces alphabetically
            interfaces.sort(key=lambda i: i.interface)

            status = HealthState.HEALTHY if (agg_rx is not None or agg_tx is not None) else HealthState.UNKNOWN

            return NetworkMetricData(
                rx_bytes_per_sec=round(agg_rx, 2) if agg_rx is not None else None,
                tx_bytes_per_sec=round(agg_tx, 2) if agg_tx is not None else None,
                interfaces=interfaces,
                status=status,
                timestamp=now,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying network metrics from Prometheus: {exc}")
            return NetworkMetricData(
                rx_bytes_per_sec=None,
                tx_bytes_per_sec=None,
                interfaces=[],
                status=HealthState.UNKNOWN,
                timestamp=now,
            )
