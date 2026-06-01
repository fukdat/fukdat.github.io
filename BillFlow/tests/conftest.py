"""Shared test fixtures: isolated database and HTTP client."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

# Force an isolated, file-based SQLite DB for the test session before the
# application settings are imported/cached anywhere.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_billflow.db"
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_abc123")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.database import engine
from app.main import create_app
from app.models.base import Base


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Provide an HTTP client bound to a freshly migrated schema."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as ac:
        yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
