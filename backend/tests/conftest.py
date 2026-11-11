import os
import sys
from pathlib import Path
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set test environment
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"

from app.main import app


@pytest_asyncio.fixture(loop_scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Asynchronous test client for testing FastAPI endpoints.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
