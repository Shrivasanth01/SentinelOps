import logging
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.topology import TopologyResponse
from app.services.topology_service import topology_service

logger = logging.getLogger("sentinelops.api.v1.topology")

router = APIRouter()


@router.get(
    "",
    response_model=TopologyResponse,
    summary="Get Infrastructure Relationship Topology Graph",
    description="Returns nodes and edges mapping host, OS, exporters, Prometheus, backend API, PostgreSQL, and monitored targets.",
)
async def get_infrastructure_topology(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TopologyResponse:
    return await topology_service.get_topology(session=session)
