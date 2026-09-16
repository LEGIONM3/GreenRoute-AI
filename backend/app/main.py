import os
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
import app.models  # Register all tables in Base.metadata
from app.api.v1.api import api_router
from app.db.seed_data import seed_initial_data

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Smart Waste Management & Disposal Guidance Platform API. "
        "Provides GIS location discovery, citizen issue reporting, waste segregation search, "
        "and an AI assistant with RAG grounded in government environmental policies."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For flexible local dev and container networking
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory for citizen reports
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


from fastapi.responses import JSONResponse, PlainTextResponse
from app.core.metrics import metrics
from app.core.tracing import generate_trace_id, set_trace_context
from app.core.tenant import set_current_tenant_id

# Rate Limiting & Timing Middleware
RATE_LIMIT_STORE = {}
WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 300  # High limit for seamless local dev


@app.middleware("http")
async def rate_limiting_and_timing_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    # 1. Correlation ID & Distributed Tracing Context
    correlation_id = request.headers.get("X-Correlation-ID") or generate_trace_id()
    set_trace_context(correlation_id)

    # 2. Multi-Tenant Context Injection
    tenant_id = request.headers.get("X-Tenant-ID", "default-civic-tenant")
    set_current_tenant_id(tenant_id)

    # 3. Rate limiting
    records = RATE_LIMIT_STORE.get(client_ip, [])
    records = [t for t in records if now - t < WINDOW_SECONDS]
    if len(records) >= MAX_REQUESTS_PER_WINDOW:
        metrics.inc_counter("auth_failures_total", 1, {"reason": "rate_limit_exceeded"})
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please wait a moment before trying again."}
        )
    records.append(now)
    RATE_LIMIT_STORE[client_ip] = records

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # 4. Metrics Recording
    metrics.observe_histogram("http_request_duration_seconds", process_time, {"endpoint": request.url.path})
    metrics.inc_counter("http_requests_total", 1, {"method": request.method, "status": str(response.status_code)})

    # Response headers
    response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Tenant-ID"] = tenant_id
    return response


# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    from app.db.migrate import sync_database_schema
    sync_database_schema(engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    }


@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def api_health_check():
    return {
        "status": "healthy",
        "api_version": "v1",
        "timestamp": time.time()
    }


@app.get("/metrics", tags=["Observability"], response_class=PlainTextResponse)
def prometheus_metrics():
    """Exposes standard Prometheus metrics for Grafana scraping."""
    return metrics.generate_prometheus_text()
