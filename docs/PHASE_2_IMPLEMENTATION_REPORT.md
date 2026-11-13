# SENTINELOPS — PHASE 2 IMPLEMENTATION REPORT
## Real-Time Infrastructure Monitoring Engine & Host Telemetry Pipeline

**Document Status:** Complete  
**Date:** 2026-11-13  
**Engineering Discipline:** DevOps, Infrastructure Architecture, Backend Engineering, Enterprise UI/UX  
**Repository Branch:** `main`  

---

## 1. Executive Summary

Phase 2 of **SentinelOps** (*"Observe. Detect. Investigate. Resolve."*) transitions the platform from local application health tracking to a real-time infrastructure observability engine. The platform now captures, processes, and visualizes live hardware and operating system telemetry directly from the physical host machine using **Windows Exporter**, a **Prometheus** time-series data layer, a modular **FastAPI** monitoring service with PromQL integration, and an observatory frontend.

### Primary Engineering Objectives Delivered
1. **Host-Native Windows Exporter Integration:** Deployed and automated on the host Windows environment, listening on TCP port `9182` with collectors for CPU, memory, logical disks, network, OS metadata, and system uptime. Access is firewalled and restricted to local development addresses.
2. **Prometheus Telemetry Engine Integration:** Created Prometheus configuration with scrape jobs for self-monitoring and Windows Exporter (`10s` interval), added Prometheus service to `docker-compose.yml` with persistent TSDB storage, and provided native standalone execution scripts for local development without Docker.
3. **Modular Backend Monitoring Engine (`backend/app/monitoring/`):**
   - Async `PrometheusClient` querying Prometheus HTTP API v1 (`/api/v1/query`, `/api/v1/query_range`, `/api/v1/targets`, `/-/healthy`).
   - Modular services: CPU, Memory, Disk, Network, System, Health, History, and Overview.
   - 8 versioned API endpoints under `/api/v1/monitoring/`.
   - Comprehensive exception handling (connection errors, timeouts, exporter downtime) and strict avoidance of fabricated or silently zeroed metrics.
4. **Command Observatory Frontend Integration:**
   - Real-time CPU module (overall load, gauge, 16-core breakdown, user/kernel/interrupt time).
   - Real-time Physical RAM module (used/free GB, commit limits, utilization progress).
   - Real-time Logical Disk module (all mounted partitions, capacity, used/free space, aggregate I/O throughput rates).
   - Real-time Network module (aggregate Rx/Tx throughput, per-NIC rates).
   - Monitored Node Diagnostics (hostname, OS edition, build, boot time, uptime counter, active process count).
   - Scrape Targets Status (latency, scrape timestamp, health badges, diagnostic instructions).
   - Historical waveforms (CPU, RAM, Disk, Network) with selectable time range (`5m`, `15m`, `1h`, `6h`).
5. **Quality Assurance & Verification:** 37/37 automated Pytest unit and integration tests passing, frontend production build passing with 0 TypeScript errors, and live end-to-end telemetry validated against the physical host.

---

## 2. Architecture & Pipeline Topology

```
+---------------------------------------------------------------------------------------+
|                                    WINDOWS HOST                                       |
|                                                                                       |
|   +------------------------------------+                                              |
|   |   Windows Exporter (Port 9182)     |  <-- Hardware & OS Counters (cpu, memory,   |
|   |   Native Windows Binary v0.32.1    |      logical_disk, net, os, system)          |
|   +------------------------------------+                                              |
|                     ^                                                                 |
|                     | Scrape HTTP /metrics (10s cadence)                              |
|                     v                                                                 |
|   +------------------------------------+                                              |
|   |   Prometheus Engine (Port 9090)    |  <-- Scrapes windows_exporter & self         |
|   |   Docker Compose / Native Host     |  <-- Persistent TSDB Storage                 |
|   +------------------------------------+                                              |
|                     ^                                                                 |
|                     | PromQL HTTP API v1 (/api/v1/query, query_range, targets)        |
|                     v                                                                 |
|   +------------------------------------+                                              |
|   |   SentinelOps FastAPI (Port 8000)  |  <-- PrometheusClient (Async HTTPX)          |
|   |   /api/v1/monitoring/* endpoints   |  <-- Telemetry Validation & Health Evaluator |
|   +------------------------------------+                                              |
|                     ^                                                                 |
|                     | REST Telemetry JSON (3000ms polling / reactive updates)         |
|                     v                                                                 |
|   +------------------------------------+                                              |
|   |   SentinelOps Command Observatory  |  <-- React 19 + TypeScript + Vite            |
|   |   Browser Client (Port 3000/5173)  |  <-- Real-time SVG Waveforms & Gauges        |
|   +------------------------------------+                                              |
+---------------------------------------------------------------------------------------+
```

---

## 3. Windows Exporter Configuration

### Binary & Collectors
- **Version:** `v0.32.1` (AMD64 Windows binary).
- **Binding:** `0.0.0.0:9182` (or `127.0.0.1:9182`), allowing Docker containers and local services to scrape while restricting external network exposure via Windows Defender Firewall.
- **Enabled Collectors:**
  ```text
  cpu, memory, logical_disk, net, os, system
  ```
- **Note on Collector Naming in v0.32.1:** In modern releases of Windows Exporter, physical memory metrics are produced by the `memory` collector (older releases used `cs`). The backend and scripts support both modern (`windows_memory_physical_total_bytes`, `windows_cpu_time_seconds_total`) and legacy metrics (`windows_cs_physical_memory_bytes`, `windows_cpu_time_total`).

### Automated Scripts
- `scripts/install_windows_exporter.ps1`: Downloads the official release binary into `infrastructure/windows_exporter/` and sets up the Windows Firewall rule.
- `scripts/start_windows_exporter.ps1`: Launches `windows_exporter.exe` with configured collector flags and background or foreground options.
- `scripts/stop_windows_exporter.ps1`: Gracefully terminates running exporter processes.

### Windows Firewall Configuration
To restrict scrape port 9182 to the local development environment and Docker subnets, run PowerShell as Administrator:
```powershell
New-NetFirewallRule -DisplayName "SentinelOps-WindowsExporter-9182" `
                    -Direction Inbound `
                    -Action Allow `
                    -Protocol TCP `
                    -LocalPort 9182 `
                    -RemoteAddress 127.0.0.1, 172.16.0.0/12, 10.0.0.0/8, 192.168.0.0/16, LocalSubnet
```

---

## 4. Prometheus Integration

### Scrape Configuration
- **File:** `infrastructure/prometheus/prometheus.yml` (for Docker Compose) and `infrastructure/prometheus/prometheus.local.yml` (for host standalone):
  ```yaml
  global:
    scrape_interval: 15s
    evaluation_interval: 15s
    scrape_timeout: 10s

  scrape_configs:
    - job_name: "prometheus"
      metrics_path: "/metrics"
      static_configs:
        - targets: ["localhost:9090"]

    - job_name: "windows_exporter"
      scrape_interval: 10s
      scrape_timeout: 8s
      metrics_path: "/metrics"
      static_configs:
        - targets: ["host.docker.internal:9182"] # In Docker
        # - targets: ["127.0.0.1:9182"]          # In Local Standalone
          labels:
            instance: "windows-host"
            environment: "local-host"
            collector: "windows_exporter"
  ```

### Docker Compose Service
Updated `docker-compose.yml`:
```yaml
  prometheus:
    image: prom/prometheus:v2.53.3
    container_name: sentinelops-prometheus
    restart: unless-stopped
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.enable-lifecycle"
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - sentinelops_net
```

### Standalone Local Prometheus Engine
For development on environments where Docker Desktop is not active, scripts are provided:
- `scripts/install_prometheus.ps1`: Downloads Prometheus `v2.53.3` Windows binary.
- `scripts/start_prometheus.ps1`: Starts Prometheus on port 9090 scraping `127.0.0.1:9182`.
- `scripts/stop_prometheus.ps1`: Stops running Prometheus processes.

---

## 5. Backend Monitoring Service Architecture

### Directory Layout
```
backend/app/monitoring/
├── __init__.py
├── background_worker.py        # Phase 1 background worker
├── collector.py                # Phase 1 psutil collector
├── prometheus.py               # Phase 1 internal Prometheus registry
├── prometheus_client.py        # Phase 2 Async Prometheus HTTP API v1 client
└── services/
    ├── __init__.py
    ├── cpu_service.py          # CPU overall, per-core, user/kernel mode calculations
    ├── memory_service.py       # RAM total, used, free, utilization %, commit limits
    ├── disk_service.py         # Logical drive capacities, free space, read/write I/O
    ├── network_service.py      # Aggregate Rx/Tx throughput, per-NIC metrics
    ├── system_service.py       # Hostname, OS info, boot time, uptime, processes
    ├── health_service.py       # Health state evaluation (HEALTHY/WARNING/CRITICAL/UNKNOWN)
    ├── history_service.py      # Range vectors for waveforms (concurrent asyncio.gather)
    └── overview_service.py     # Unified concurrent aggregation for overview endpoint
```

### PromQL Query Matrix
| Telemetry Metric | Primary PromQL Query | Fallback PromQL Query |
| :--- | :--- | :--- |
| **CPU Overall %** | `100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100)` | `100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100)` |
| **CPU Per Core %** | `100 - (irate(windows_cpu_time_seconds_total{mode="idle"}[1m]) * 100)` | `100 - (irate(windows_cpu_time_total{mode="idle"}[1m]) * 100)` |
| **CPU User %** | `avg(irate(windows_cpu_time_seconds_total{mode="user"}[1m])) * 100` | `avg(irate(windows_cpu_time_total{mode="user"}[1m])) * 100` |
| **CPU Kernel %** | `avg(irate(windows_cpu_time_seconds_total{mode=~"privileged|system"}[1m])) * 100` | `avg(irate(windows_cpu_time_total{mode=~"privileged|system"}[1m])) * 100` |
| **RAM Total Bytes** | `windows_memory_physical_total_bytes` | `windows_cs_physical_memory_bytes` |
| **RAM Free Bytes** | `windows_memory_physical_free_bytes` | `windows_os_physical_memory_free_bytes` |
| **Disk Sizes** | `windows_logical_disk_size_bytes{volume=~"[A-Za-z]:"}` | — |
| **Disk Free** | `windows_logical_disk_free_bytes{volume=~"[A-Za-z]:"}` | — |
| **Disk I/O Rates** | `sum(irate(windows_logical_disk_read_bytes_total[1m]))` | `sum(rate(windows_logical_disk_read_bytes_total[1m]))` |
| **Network Rx/Tx** | `sum(irate(windows_net_bytes_received_total[1m]))` | `sum(rate(windows_net_bytes_received_total[1m]))` |
| **System Uptime** | `windows_system_system_up_time` | `time() - windows_system_boot_time_timestamp` |
| **OS Info** | `windows_os_info` | System platform fallback |

### Implemented Endpoints
1. `GET /api/v1/monitoring/overview`: Aggregated telemetry snapshot + target health.
2. `GET /api/v1/monitoring/cpu`: Real-time CPU percent, logical core matrix, modes.
3. `GET /api/v1/monitoring/memory`: Total/used/free RAM bytes, percent, commit limit.
4. `GET /api/v1/monitoring/disk`: Partition capacities, free space, read/write I/O bytes/sec.
5. `GET /api/v1/monitoring/network`: Aggregate and per-interface throughput rates.
6. `GET /api/v1/monitoring/system`: Hostname, OS name, version, build, uptime, processes.
7. `GET /api/v1/monitoring/targets`: Prometheus scrape targets, status (UP/DOWN), latency, errors.
8. `GET /api/v1/monitoring/history`: Range vector timeseries for CPU, RAM, Disk, Network.

---

## 6. Real-Time Verification Results on Host

Live execution of `verify_telemetry.py` directly against the running Windows host, Prometheus engine (`port 9090`), and Windows Exporter (`port 9182`):

```text
=== REAL-TIME HOST TELEMETRY VERIFICATION ===
HEALTH STATE:         HealthState.WARNING
PROMETHEUS CONNECTED: True
TARGET STATUS:        TargetHealth.UP
OVERALL CPU:          10.06%
LOGICAL CORES:        16 cores: [8.43, 3.43, 9.52, 4.37, 24.37, 21.09, 4.21, 3.74, 24.84, 11.08, 2.49, 3.43, 15.93, 10.93, 6.24, 6.87]
CPU USER / KERNEL:    User: 6.09% | Kernel: 4.79% | Idle: 89.94%
TOTAL RAM:            15.82 GB (16989736960 bytes)
USED RAM:             13.07 GB (14036271104 bytes)
FREE RAM:             2.75 GB (2953465856 bytes)
RAM UTILIZATION:      82.62% (HealthState.WARNING - exceeds 80.0% warning threshold)
LOGICAL DISKS:        ['C: 78.9% (HealthState.HEALTHY)']
DISK READ / WRITE:    Read: 4.81 MB/s | Write: 620 KB/s
NETWORK THROUGHPUT:   Rx: 27.5 KB/s | Tx: 485.4 KB/s
ACTIVE NICS:          2 interfaces
HOSTNAME:             SHRI
OS NAME:              Microsoft Windows
OS VERSION:           10.0.26300
UPTIME:               208.04 hours (748930.9s / ~8.6 days)
ACTIVE PROCESSES:     345
ACTIVE TARGETS:       ['prometheus (http://localhost:9090/metrics): UP', 'windows_exporter (http://127.0.0.1:9182/metrics): UP']
=============================================
```

---

## 7. Automated Test Suite Results

### Pytest Execution Summary
All 37 backend tests passed with 0 failures:
```text
backend/tests/test_anomalies.py::test_isolation_forest_scoring PASSED    [  2%]
backend/tests/test_anomalies.py::test_anomaly_score_endpoint PASSED      [  5%]
backend/tests/test_anomalies.py::test_recent_anomalies_endpoint PASSED   [  8%]
backend/tests/test_anomalies.py::test_retrain_endpoint PASSED            [ 10%]
backend/tests/test_anomalies.py::test_simulate_anomaly_endpoint PASSED   [ 13%]
backend/tests/test_anomalies.py::test_anomaly_event_record_persistence PASSED [ 16%]
backend/tests/test_config_exceptions.py::test_404_error_handling PASSED  [ 18%]
backend/tests/test_config_exceptions.py::test_settings_cors_parsing PASSED [ 21%]
backend/tests/test_config_exceptions.py::test_custom_exception_response PASSED [ 24%]
backend/tests/test_config_exceptions.py::test_config_summary_endpoint PASSED [ 27%]
backend/tests/test_config_exceptions.py::test_database_connectivity_timeout_probe PASSED [ 29%]
backend/tests/test_database.py::test_health_check_audit_model PASSED     [ 32%]
backend/tests/test_health.py::test_root_endpoint PASSED                  [ 35%]
backend/tests/test_health.py::test_health_liveness_endpoint PASSED       [ 37%]
backend/tests/test_health.py::test_health_readiness_healthy PASSED       [ 40%]
backend/tests/test_health.py::test_health_readiness_unhealthy PASSED     [ 43%]
backend/tests/test_health.py::test_system_info_endpoint PASSED           [ 45%]
backend/tests/test_health.py::test_correlation_id_and_timing_headers PASSED [ 48%]
backend/tests/test_health.py::test_cors_preflight PASSED                 [ 51%]
backend/tests/test_logs.py::test_get_logs_endpoint PASSED                [ 54%]
backend/tests/test_logs.py::test_ingest_log_endpoint PASSED              [ 56%]
backend/tests/test_logs.py::test_log_filtering PASSED                    [ 59%]
backend/tests/test_logs.py::test_system_log_record_persistence PASSED    [ 62%]
backend/tests/test_metrics.py::test_system_metrics_collector PASSED      [ 64%]
backend/tests/test_metrics.py::test_metrics_current_endpoint PASSED      [ 67%]
backend/tests/test_metrics.py::test_metrics_history_endpoint PASSED      [ 70%]
backend/tests/test_metrics.py::test_metrics_summary_endpoint PASSED      [ 72%]
backend/tests/test_metrics.py::test_prometheus_endpoint PASSED           [ 75%]
backend/tests/test_metrics.py::test_metric_snapshot_record_persistence PASSED [ 78%]
backend/tests/test_monitoring_prometheus.py::test_prometheus_client_instant_query_mock PASSED [ 81%]
backend/tests/test_monitoring_prometheus.py::test_prometheus_client_connection_error PASSED [ 83%]
backend/tests/test_monitoring_prometheus.py::test_cpu_service_metrics PASSED [ 86%]
backend/tests/test_monitoring_prometheus.py::test_memory_service_metrics PASSED [ 89%]
backend/tests/test_monitoring_prometheus.py::test_disk_service_metrics PASSED [ 91%]
backend/tests/test_monitoring_prometheus.py::test_health_evaluation_thresholds PASSED [ 94%]
backend/tests/test_monitoring_prometheus.py::test_api_monitoring_endpoints PASSED [ 97%]
backend/tests/test_monitoring_prometheus.py::test_degraded_offline_prometheus PASSED [100%]

============================= 37 passed in 26.46s =============================
```

### Frontend Build Verification
`npm --prefix frontend run build` completed successfully:
```text
> sentinelops-frontend@0.1.0 build
> tsc && vite build

vite v6.4.6 building for production...
transforming...
✓ 2128 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.40 kB │ gzip:   0.76 kB
dist/assets/index-BfAQSpS7.css   31.78 kB │ gzip:   6.31 kB
dist/assets/index-B5nhE41Y.js   392.47 kB │ gzip: 104.03 kB
✓ built in 6.08s
```

---

## 8. Summary of Files Created & Modified

### Infrastructure
- `infrastructure/prometheus/prometheus.yml` *(New)*
- `infrastructure/prometheus/prometheus.local.yml` *(New)*
- `docker-compose.yml` *(Modified: Added prometheus service, extra_hosts, prometheus_data volume, PROMETHEUS_URL)*
- `.env.example` *(Modified: Added PROMETHEUS_URL, PROMETHEUS_TIMEOUT_SECONDS, health thresholds)*
- `.gitignore` *(Modified: Added windows_exporter binaries, prometheus binaries, TSDB data)*

### Scripts
- `scripts/install_windows_exporter.ps1` *(New)*
- `scripts/start_windows_exporter.ps1` *(New)*
- `scripts/stop_windows_exporter.ps1` *(New)*
- `scripts/install_prometheus.ps1` *(New)*
- `scripts/start_prometheus.ps1` *(New)*
- `scripts/stop_prometheus.ps1` *(New)*

### Backend
- `backend/app/core/config.py` *(Modified: Added PROMETHEUS_URL and threshold configs)*
- `backend/app/schemas/monitoring.py` *(New: Pydantic schemas for all Phase 2 endpoints)*
- `backend/app/schemas/__init__.py` *(Modified: Exported monitoring schemas)*
- `backend/app/monitoring/prometheus_client.py` *(New: Async PromQL client)*
- `backend/app/monitoring/services/cpu_service.py` *(New)*
- `backend/app/monitoring/services/memory_service.py` *(New)*
- `backend/app/monitoring/services/disk_service.py` *(New)*
- `backend/app/monitoring/services/network_service.py` *(New)*
- `backend/app/monitoring/services/system_service.py` *(New)*
- `backend/app/monitoring/services/health_service.py` *(New)*
- `backend/app/monitoring/services/history_service.py` *(New)*
- `backend/app/monitoring/services/overview_service.py` *(New)*
- `backend/app/monitoring/services/__init__.py` *(New)*
- `backend/app/monitoring/__init__.py` *(Modified: Exported Phase 2 services)*
- `backend/app/api/v1/endpoints/monitoring.py` *(New: 8 versioned REST endpoints)*
- `backend/app/api/v1/api.py` *(Modified: Registered monitoring router)*
- `backend/tests/test_monitoring_prometheus.py` *(New: 8 comprehensive test cases)*

### Frontend
- `frontend/src/types/monitoring.ts` *(New)*
- `frontend/src/services/monitoringService.ts` *(New)*
- `frontend/src/hooks/usePrometheusMonitoring.ts` *(New)*
- `frontend/src/pages/MonitoringPage.tsx` *(Rewritten: Real-time Prometheus telemetry UI)*
- `frontend/src/components/observatory/ServiceStatus.tsx` *(Modified: Added Prometheus & Windows Exporter)*
- `frontend/src/pages/OverviewPage.tsx` *(Modified: Added Prometheus UI link)*

---

## 9. Conclusion & Next Phase Readiness

Phase 2 is fully implemented and operational on the host machine. The platform operates on real infrastructure metrics with zero fabricated numbers. All components strictly adhere to the SentinelOps Command Observatory design philosophy.

**Recommended Next Step:**  
Proceed to **Phase 3: Machine Learning Anomaly Detection Engine (Isolation Forest)**, training on the real-time Prometheus time-series vectors collected from the host infrastructure.
