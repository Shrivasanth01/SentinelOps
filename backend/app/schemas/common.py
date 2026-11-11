from enum import Enum
from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class HealthStatusEnum(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None


class GenericDataResponse(BaseResponse, Generic[T]):
    data: T

