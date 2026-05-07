# SWASTIK AI Service Dockerfile — Production (AWS App Runner)
# Multi-stage build for minimal image size

# ── Stage 1: Install Python dependencies ──
FROM python:3.11-slim AS deps
WORKDIR /app

# Install build tools needed by some Python packages, then clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production runtime ──
FROM python:3.11-slim AS runner
WORKDIR /app

# Copy only the installed packages (no gcc/build tools in final image)
COPY --from=deps /install /usr/local

# Copy application source
COPY . .

# Create non-root user for security
RUN groupadd -r aiservice && \
    useradd -r -g aiservice -d /app -s /sbin/nologin aiservice && \
    chown -R aiservice:aiservice /app

USER aiservice

# AWS App Runner injects PORT env var; default to 8000 for local dev
ENV AI_SERVICE_PORT=8000
ENV AI_SERVICE_WORKERS=2
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE ${AI_SERVICE_PORT:-8000}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${AI_SERVICE_PORT:-8000}/health').read()" || exit 1

# Start FastAPI with Uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-${AI_SERVICE_PORT:-8000}} --workers ${AI_SERVICE_WORKERS:-2}"]
