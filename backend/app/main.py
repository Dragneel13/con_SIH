import sys
import os

# Ensure project root is in sys.path for backend package resolution
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.api import (
    health,
    auth,
    security,
    mines,
    exploration,
    targets,
    production,
    equipment,
    blocks,
    recommendations,
    field,
    drilling,
)
from app.database import check_db_connection

# Alias backend.app modules in sys.modules to handle joblib unpickling across paths
import app as app_pkg
sys.modules['backend.app'] = app_pkg

# ── Security Headers Middleware ──────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://server.arcgisonline.com; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 http://localhost:3000 ws://localhost:3000; "
            "font-src 'self' data: https://cdn.jsdelivr.net;"
        )
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info(f"Starting MnVision 360 Security-Hardened API v{settings.app_version}")
    logger.info(f"Environment: {settings.app_env}")
    
    if check_db_connection():
        logger.info("Database: Connected successfully to PostGIS Spatial Lake")
    else:
        logger.info("Database: Running in Standalone Security & Fixture Mode")
        
    yield
    logger.info("Shutting down MnVision 360 API")

app = FastAPI(
    title="MnVision 360 API",
    description="Space-to-Mine Intelligence Platform for MOIL Manganese Operations — Hardened API Gateway",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# ── Security Middleware Registration ─────────────────────────────────────────

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Safe Error Handling ──────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal Server Error on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An internal system error occurred: {str(exc)}"}
    )

# ── Router Registrations ────────────────────────────────────────────────────

app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(security.router, prefix="/api", tags=["Security Center"])
app.include_router(mines.router, prefix="/api", tags=["Mines"])
app.include_router(exploration.router, prefix="/api", tags=["Exploration"])
app.include_router(targets.router, prefix="/api", tags=["Drill Targets"])
app.include_router(drilling.router, prefix="/api", tags=["Closed-Loop Drilling & Ground Truth"])
app.include_router(production.router, prefix="/api", tags=["Production"])
app.include_router(equipment.router, prefix="/api", tags=["Equipment"])
app.include_router(blocks.router, prefix="/api", tags=["Mine Blocks"])
app.include_router(recommendations.router, prefix="/api", tags=["Recommendations"])
app.include_router(field.router, prefix="/api", tags=["Field Operations"])
