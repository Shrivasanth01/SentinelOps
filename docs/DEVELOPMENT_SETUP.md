# SentinelOps Development Setup Guide

This guide details instructions for setting up, running, and testing SentinelOps in both Docker and standalone local environments.

---

## Prerequisites

- **Python**: 3.12+ (or 3.13)
- **Node.js**: v20+ (v24 LTS recommended)
- **npm**: 10+
- **Docker & Docker Compose**: (Optional for containerized mode)
- **Git**

---

## 1. Quick Start via Docker Compose

The simplest path to launch the full platform (PostgreSQL 17, FastAPI backend, React frontend) with a single command:

```bash
# 1. Clone repository
git clone https://github.com/Shrivasanth01/-SentinelOps.git
cd -SentinelOps

# 2. Initialize environment file
cp .env.example .env

# 3. Launch all containers with build
docker compose up -d --build
```

### Verification
Check container status:
```bash
docker compose ps
```

View live logs:
```bash
docker compose logs -f
```

---

## 2. Standalone Backend Development

For rapid backend development without container overhead:

### 1. Initialize Virtual Environment
```bash
cd backend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```bash
pip install -r requirements-dev.txt
```

### 3. Run Database Migrations
To review generated SQL offline:
```bash
python -m alembic upgrade head --sql
```

To apply migrations against a live database:
```bash
python -m alembic upgrade head
```

### 4. Run Automated Test Suite
```bash
python -m pytest -c pytest.ini -v
```

### 5. Launch FastAPI Application
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive documentation is accessible at:
- Swagger UI: `http://127.0.0.1:8000/api/v1/docs`
- ReDoc: `http://127.0.0.1:8000/api/v1/redoc`

---

## 3. Standalone Frontend Development

### 1. Install Node Packages
```bash
cd frontend
npm install
```

### 2. Run TypeScript & Bundle Validation
```bash
npm run build
```

### 3. Start Vite Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser. The Vite proxy forwards `/api/*` to `http://127.0.0.1:8000`.

---

## 4. Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Application root metadata and documentation links |
| `GET` | `/api/v1/health/live` | Application liveness probe (200 OK if process is running) |
| `GET` | `/api/v1/health/ready` | Database readiness probe (executes `SELECT 1`) |
| `GET` | `/api/v1/health/info` | Platform runtime engine, Python, and OS information |
| `GET` | `/api/v1/system/config-summary` | Non-sensitive configuration summary |

---

## 5. Troubleshooting & FAQ

### Issue: `psycopg.InterfaceError: Psycopg cannot use the 'ProactorEventLoop'` on Windows
**Solution**: This is already handled in SentinelOps' `session.py` and `env.py` using `asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())` on Windows platforms.

### Issue: Database Returns 503 on `/health/ready`
**Explanation**: In Phase 1, if PostgreSQL is not running locally, `/health/ready` intentionally and cleanly returns HTTP 503 with status `unhealthy`. This confirms the readiness probe is accurately diagnosing connectivity instead of fabricating status.

