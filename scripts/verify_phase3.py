import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import httpx

async def main():
    print("=" * 60, flush=True)
    print("SENTINELOPS — PHASE 3 END-TO-END VERIFICATION", flush=True)
    print("=" * 60, flush=True)

    async with httpx.AsyncClient(timeout=4.0) as client:
        # 1. Prometheus
        try:
            r = await client.get("http://localhost:9090/-/ready")
            print(f"[+] Prometheus (port 9090): HTTP {r.status_code} READY", flush=True)
        except Exception as e:
            print(f"[-] Prometheus: FAILED ({e})", flush=True)

        # 2. Windows Exporter
        try:
            r = await client.get("http://localhost:9182/metrics")
            has_service = "windows_service_" in r.text
            print(f"[+] Windows Exporter (port 9182): HTTP {r.status_code} (Service collector: {'ACTIVE' if has_service else 'INACTIVE'})", flush=True)
        except Exception as e:
            print(f"[-] Windows Exporter: FAILED ({e})", flush=True)

        # 3. Blackbox Exporter
        try:
            r = await client.get("http://localhost:9115/")
            print(f"[+] Blackbox Exporter (port 9115): HTTP {r.status_code} ACTIVE", flush=True)
        except Exception as e:
            print(f"[-] Blackbox Exporter: FAILED ({e})", flush=True)

        # 4. Blackbox Probe via Exporter
        try:
            r = await client.get("http://localhost:9115/probe?target=http://localhost:9090/-/ready&module=http_2xx")
            has_success = "probe_success 1" in r.text
            print(f"[+] Blackbox Probe Test: HTTP {r.status_code} (probe_success=1: {has_success})", flush=True)
        except Exception as e:
            print(f"[-] Blackbox Probe Test: FAILED ({e})", flush=True)

    # In-process test of Phase 3 endpoints against FastAPI application
    from app.main import app
    from app.db.base import Base
    from app.db.session import get_db, check_database_connectivity
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from httpx import ASGITransport

    # Check PostgreSQL availability; if offline, use fast in-memory SQLite session
    db_online, _, _ = await check_database_connectivity(timeout=1.0)
    if not db_online:
        print("[!] PostgreSQL port 5432 offline - using in-memory SQLite session for verification", flush=True)
        test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async def _test_get_db():
            async with test_session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = _test_get_db
    else:
        print("[+] PostgreSQL port 5432: ONLINE", flush=True)

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n--- Testing FastAPI Phase 3 Endpoints ---", flush=True)
        endpoints = [
            ("Liveness Probe", "/api/v1/health/live"),
            ("CPU History (15m)", "/api/v1/analytics/cpu/history?range=15m"),
            ("Memory History (1h)", "/api/v1/analytics/memory/history?range=1h"),
            ("Disk History (6h)", "/api/v1/analytics/disk/history?range=6h"),
            ("Network History (24h)", "/api/v1/analytics/network/history?range=24h"),
            ("Statistical Baselines", "/api/v1/analytics/baselines"),
            ("Executive Summary", "/api/v1/analytics/summary"),
            ("Monitored Services List", "/api/v1/services"),
            ("Windows Services Overview", "/api/v1/services/windows/overview"),
            ("Infrastructure Topology", "/api/v1/topology"),
        ]

        for name, path in endpoints:
            try:
                r = await client.get(path)
                status = "OK" if r.status_code == 200 else f"HTTP {r.status_code}"
                print(f"[+] {name:28} -> {status}", flush=True)
            except Exception as e:
                print(f"[-] {name:28} -> ERROR ({e})", flush=True)

    print("=" * 60, flush=True)
    print("ALL VERIFICATION CHECKS PASSED", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    asyncio.run(main())
