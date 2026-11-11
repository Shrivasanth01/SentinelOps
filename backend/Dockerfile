FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install curl for container health check
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root system user for security compliance
RUN groupadd -g 1001 sentinel && \
    useradd -u 1001 -g sentinel -s /bin/bash -m sentinel

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and migrations
COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

# Grant ownership to non-root user
RUN chown -R sentinel:sentinel /app

USER sentinel

EXPOSE 8000

# Container healthcheck targeting liveness endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health/live || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

