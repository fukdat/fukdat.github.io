"""Application factory and ASGI entrypoint."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIDMiddleware
from app.models.base import Base


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Create schema on startup (dev/test) and dispose the engine on stop.

    In production, schema is managed by Alembic migrations; auto-create is
    enabled only for the embedded SQLite used in dev/test.
    """
    configure_logging()
    settings = get_settings()
    if settings.is_sqlite:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(
        title="BillFlow API",
        version="0.1.0",
        description="Multi-tenant subscription billing & usage-metering API.",
        lifespan=lifespan,
    )
    app.add_middleware(RequestIDMiddleware)

    @app.exception_handler(AppError)
    async def _handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {"code": exc.code, "message": exc.message},
                "request_id": request.scope.get("request_id"),
            },
        )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
