import logging
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.services import WindowsServiceInfo, WindowsServicesResponse

logger = logging.getLogger("sentinelops.services.windows_services")


class WindowsServicesService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_windows_services(
        self,
        target_services: Optional[list[str]] = None,
    ) -> WindowsServicesResponse:
        """
        Retrieves real-time Windows service operational states from Windows Exporter via Prometheus.
        Only reports services that are actually exposed by the service collector.
        """
        now = datetime.now(timezone.utc)
        try:
            # 1. Probe if service collector metrics exist
            info_data = await self.client.query("windows_service_info")
            info_results = info_data.get("result", [])

            if not info_results:
                # Service collector is not active or exposing metrics
                logger.info("windows_service_info query returned no results. Service collector may be disabled.")
                return WindowsServicesResponse(
                    services=[],
                    collector_enabled=False,
                    total_services_monitored=0,
                    running_count=0,
                    stopped_count=0,
                )

            # 2. Query service states (state label: running, stopped, start_pending, stop_pending)
            state_data = await self.client.query("windows_service_state == 1")
            state_results = state_data.get("result", [])

            state_map: dict[str, str] = {}
            for res in state_results:
                metric = res.get("metric", {})
                svc = metric.get("service")
                state = metric.get("state")
                if svc and state:
                    state_map[svc.lower()] = state

            # 3. Query startup mode (start_mode: auto, manual, disabled)
            mode_data = await self.client.query("windows_service_start_mode == 1")
            mode_results = mode_data.get("result", [])

            mode_map: dict[str, str] = {}
            for res in mode_results:
                metric = res.get("metric", {})
                svc = metric.get("service")
                mode = metric.get("start_mode")
                if svc and mode:
                    mode_map[svc.lower()] = mode

            # 4. Assemble service records
            # Default curated set of critical services if not filtered
            curated_defaults = {
                "lanmanserver",
                "eventlog",
                "dnscache",
                "wuauserv",
                "spooler",
                "winrm",
                "w32time",
                "bfe",
                "appinfo",
                "brokerinfrastructure",
                "postgresql",
                "docker",
                "sshd",
            }

            services_list: list[WindowsServiceInfo] = []
            seen_services = set()

            for res in info_results:
                metric = res.get("metric", {})
                svc_name = metric.get("service")
                if not svc_name:
                    continue

                svc_lower = svc_name.lower()

                # Filter if target_services is specified, otherwise include curated or top services
                if target_services:
                    if svc_lower not in [t.lower() for t in target_services]:
                        continue
                elif svc_lower not in curated_defaults and len(services_list) >= 20:
                    continue

                if svc_lower in seen_services:
                    continue
                seen_services.add(svc_lower)

                display_name = metric.get("display_name") or svc_name
                run_as = metric.get("run_as") or None
                current_state = state_map.get(svc_lower, "unknown").upper()
                start_mode = mode_map.get(svc_lower, "unknown").lower()

                is_healthy = current_state == "RUNNING" if start_mode == "auto" else True

                services_list.append(
                    WindowsServiceInfo(
                        name=svc_name,
                        display_name=display_name,
                        state=current_state,
                        start_mode=start_mode,
                        is_healthy=is_healthy,
                        run_as=run_as,
                        last_observed=now,
                    )
                )

            # Sort by name
            services_list.sort(key=lambda s: s.name.lower())

            running = sum(1 for s in services_list if s.state == "RUNNING")
            stopped = sum(1 for s in services_list if s.state == "STOPPED")

            return WindowsServicesResponse(
                services=services_list,
                collector_enabled=True,
                total_services_monitored=len(services_list),
                running_count=running,
                stopped_count=stopped,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying Windows services from Prometheus: {exc}")
            return WindowsServicesResponse(
                services=[],
                collector_enabled=False,
                total_services_monitored=0,
                running_count=0,
                stopped_count=0,
            )


windows_services_service = WindowsServicesService()
