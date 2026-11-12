# SentinelOps

> **"Always watching. Always aware."**

SentinelOps is an enterprise-grade AI-Powered Infrastructure Monitoring and AIOps Platform designed for real-time observability, high-throughput metrics ingestion, and autonomous operations.

---

## Phase 1: Foundation & Architecture

Phase 1 establishes the rock-solid foundation, containerization, database persistence, and dark-themed enterprise operations dashboard.

### Core Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x (Async), Psycopg 3
- **Database**: PostgreSQL 17 with Alembic Migrations
- **Containerization**: Docker, Docker Compose, Internal Bridge Networking, Persistent Volumes
- **Testing**: Pytest, Pytest-AsyncIO, HTTPX

---

## Architecture Overview

```text
SentinelOps/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # /health/live, /health/ready, /health/info, /system/config-summary
│   │   ├── core/              # Config, structured logging, middleware, centralized exceptions
│   │   ├── db/                # SQLAlchemy 2.x async engine, pooling, sessionmaker
│   │   ├── models/            # HealthCheckAuditLog ORM models
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   ├── services/          # Health evaluation business logic
│   │   ├── monitoring/        # Reserved for Phase 2 Prometheus probes
│   │   ├── ml/                # Reserved for Phase 3 Isolation Forest
│   │   └── ai/                # Reserved for Phase 4 LLM RCA & Log Synthesis
│   ├── alembic/               # PostgreSQL schema migrations
│   ├── tests/                 # Automated pytest test suite
│   └── Dockerfile             # Multi-stage secure non-root container
├── frontend/
│   ├── src/
│   │   ├── components/        # Sidebar, Topbar, MetricCards, Diagnostics
│   │   ├── pages/             # Overview, Infrastructure, Monitoring, Logs, Anomalies, Incidents, AI, Settings
│   │   ├── services/          # Dedicated API client with telemetry headers
│   │   ├── hooks/             # useHealth periodic polling & auto-refresh
│   │   └── types/             # Strongly-typed API response models
│   ├── Dockerfile             # Multi-stage Vite build + Nginx runner
│   └── nginx.conf             # Production SPA routing and /api/ reverse proxy
├── docs/                      # Architecture, setup, and implementation reports
├── docker-compose.yml         # Complete local orchestration with healthchecks
└── .env.example               # Environment variables specification
```

---

## Quick Start with Docker Compose

1. **Clone the repository and copy environment configuration:**
   ```bash
   git clone https://github.com/Shrivasanth01/-SentinelOps.git
   cd -SentinelOps
   cp .env.example .env
   ```

2. **Start all services in detached mode:**
   ```bash
   docker compose up -d --build
   ```

3. **Access services:**
   - **Frontend Operations Dashboard**: [http://localhost:3000](http://localhost:3000)
   - **FastAPI OpenAPI Documentation**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
   - **Liveness Probe**: [http://localhost:8000/api/v1/health/live](http://localhost:8000/api/v1/health/live)
   - **Database Readiness Probe**: [http://localhost:8000/api/v1/health/ready](http://localhost:8000/api/v1/health/ready)

---

## Local Development Without Docker

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

# Run migrations (offline SQL inspection or online against running PostgreSQL)
alembic upgrade head

# Run backend unit and integration tests
python -m pytest -c pytest.ini -v

# Start development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build     # Validate TypeScript & bundle compilation
npm run dev       # Start Vite dev server on http://localhost:3000
```

---

## Engineering Standards & Strict Real-Data Compliance

Per Phase 1 design requirements:
- **No Fabricated Metrics**: The Overview dashboard presents actual, measured roundtrips to the backend API and database connectivity probes. Host CPU, RAM, and Disk charts are reserved for Phase 2 background telemetry.
- **Correlation ID Tracking**: Every HTTP request receives an `X-Correlation-ID` and `X-Response-Time-MS` header for distributed tracing.
- **Secure Networking**: Docker Compose port bindings are restricted to `127.0.0.1` and the PostgreSQL database is never exposed publicly to external networks.
- **Graceful Error Handling**: Database failures result in standardized HTTP 503 Problem responses without process crashes.

---

## Project Roadmap

- **Phase 1 (Current)**: Foundation, Architecture, Containerization, Database Persistence, Operations Dashboard.
- **Phase 2**: Infrastructure discovery, high-resolution CPU/Memory/Disk telemetry probes, Prometheus integration.
- **Phase 3**: Syslog and structured log aggregation, unsupervised Isolation Forest anomaly detection.
- **Phase 4**: Automated incident triage, alerting dispatch (Slack/PagerDuty), LLM-powered Root-Cause Analysis (RCA).

---

## License
Proprietary &copy; 2026 SentinelOps. All rights reserved.

