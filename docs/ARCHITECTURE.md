# SentinelOps Architecture Specification

> **Platform Tagline**: "Always watching. Always aware."  
> **Phase**: Phase 1 — Foundation & Architecture  
> **Status**: Completed  

---

## 1. System Topology

SentinelOps is architected as a modular, cloud-ready distributed platform designed for horizontal scalability, zero-downtime rolling upgrades, and transparent real-time infrastructure diagnostics.

```
+-------------------------------------------------------------------------+
|                        Browser Client (React SPA)                       |
|                       http://127.0.0.1:3000                             |
+-------------------------------------------------------------------------+
                                    |
                                    | HTTP / REST (JSON)
                                    v
+-------------------------------------------------------------------------+
|                           Nginx Reverse Proxy                           |
|                      (frontend container : port 80)                     |
+-------------------------------------------------------------------------+
             |                                              |
      [Static Assets]                                 [API Proxy]
             v                                              v
       SPA /index.html                         http://backend:8000/api/v1/*
                                                            |
                                                            v
+-------------------------------------------------------------------------+
|                      FastAPI Core Application Service                    |
|                         (Python 3.12 / Uvicorn)                         |
|                                                                         |
|  [Middleware Pipeline]                                                  |
|    - Correlation ID Tracking (UUIDv4)                                   |
|    - Request Latency Telemetry (X-Response-Time-MS)                     |
|    - CORS Security Headers                                              |
|                                                                         |
|  [Centralized Exception Handlers]                                       |
|    - SentinelOpsException -> HTTP 500 / 503 Standard Problem JSON       |
|    - RequestValidationError -> HTTP 422 JSON                            |
|                                                                         |
|  [Modular Routers]                                                      |
|    - /api/v1/health/live    (Liveness Probe)                            |
|    - /api/v1/health/ready   (Readiness Probe with SELECT 1)             |
|    - /api/v1/health/info    (Runtime Engine Metadata)                   |
|    - /api/v1/system/*       (Configuration Diagnostics)                 |
+-------------------------------------------------------------------------+
                                    |
                                    | SQLAlchemy 2.x AsyncEngine
                                    | (postgresql+psycopg://)
                                    v
+-------------------------------------------------------------------------+
|                         PostgreSQL 17 Database                          |
|                     (postgres:5432 / sentinelops_net)                   |
|                                                                         |
|  [Volume: sentinelops_postgres_data]                                    |
|  [Schema: health_check_audit_logs, alembic_version]                     |
+-------------------------------------------------------------------------+
```

---

## 2. Directory Architecture

```text
SentinelOps/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # App factory, lifespan, CORS, middleware, routers
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── api.py              # Aggregated v1 APIRouter
│   │   │       └── endpoints/
│   │   │           ├── __init__.py
│   │   │           ├── health.py       # /live, /ready, /info probe endpoints
│   │   │           └── system.py       # Configuration and cluster parameters
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py               # Pydantic Settings (env parsing & validation)
│   │   │   ├── logging.py              # Structured JSON/Console logging formatters
│   │   │   ├── exceptions.py           # Domain exceptions and global handlers
│   │   │   └── middleware.py           # Correlation ID & request duration middleware
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                 # DeclarativeBase & TimestampMixin
│   │   │   └── session.py              # Async engine, connection pool, sessionmaker
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── audit.py                # HealthCheckAuditLog ORM model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── common.py               # Enums, generic responses, error details
│   │   │   └── health.py               # Health & readiness probe schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── health_service.py       # Probing and diagnostic evaluation logic
│   │   ├── monitoring/                 # [Phase 2 placeholder] Prometheus metrics
│   │   ├── ml/                         # [Phase 3 placeholder] Isolation Forest models
│   │   └── ai/                         # [Phase 4 placeholder] LLM RCA & log synthesis
│   ├── alembic/                        # Database migration scripts
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── alembic.ini
│   ├── tests/                          # Pytest suite
│   ├── Dockerfile                      # Non-root Python 3.12 container
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                 # StatusBadge, MetricCard
│   │   │   ├── layout/                 # Sidebar, Topbar, MainLayout
│   │   │   └── dashboard/              # ConnectivityPanel, HealthCard, DiagnosticsModal
│   │   ├── pages/                      # 8 modular views: Overview, Infrastructure, etc.
│   │   ├── services/                   # Dedicated API fetch client
│   │   ├── hooks/                      # useHealth auto-polling hook
│   │   ├── types/                      # TypeScript definitions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile                      # Multi-stage Node builder + Nginx runner
│   └── nginx.conf
├── docker-compose.yml                  # Production-like multi-container configuration
├── .env.example
├── README.md
└── docs/
```

---

## 3. Database Management & Connection Pooling

- **Driver**: Modern `psycopg` 3 (`postgresql+psycopg://`) running with SQLAlchemy 2.x `AsyncEngine`.
- **Pooling Parameters**:
  - `DB_POOL_SIZE`: 10 persistent connections.
  - `DB_MAX_OVERFLOW`: 20 burst connections.
  - `DB_POOL_TIMEOUT`: 30.0 seconds.
  - `DB_POOL_PRE_PING`: True (verifies stale connections before issuing queries).
- **Proactive Readiness Health Check**: The `/api/v1/health/ready` probe executes `SELECT 1` with a strict configurable timeout (default 3.0s). If the database is unreachable or slow, it returns HTTP 503 with pool diagnostic metrics without terminating the server.

---

## 4. Structured Logging & Telemetry

- **Production Mode**: Outputs single-line RFC 8259 structured JSON logs containing timestamp, log level, correlation ID, path, method, status code, and execution duration in milliseconds.
- **Development Mode**: Outputs colorized terminal logs formatted with timestamp and correlation ID.
- **Request Context**: Every request is assigned a `UUIDv4` correlation ID, propagated via `X-Correlation-ID` header and logged across all downstream service layers.

---

## 5. Security & Isolation

- **Non-Root Containers**: Backend Dockerfile creates and executes under user `sentinel` (UID 1001).
- **Internal Network**: PostgreSQL is attached exclusively to the internal bridge network `sentinelops_net`. No public `0.0.0.0` port bindings exist.
- **Localhost Development Bindings**: Host port bindings in Docker Compose are strictly mapped to `127.0.0.1:8000` (backend) and `127.0.0.1:3000` (frontend).
- **Secrets Management**: Credentials use environment variables with fallback defaults for local execution. Real production secrets are omitted from source control.

