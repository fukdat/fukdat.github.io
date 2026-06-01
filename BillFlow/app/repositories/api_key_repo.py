"""Data-access layer for API keys."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey


class ApiKeyRepository:
    """Encapsulates all API-key persistence operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, key: ApiKey) -> ApiKey:
        self._session.add(key)
        await self._session.flush()
        return key

    async def get_by_prefix(self, prefix: str) -> ApiKey | None:
        result = await self._session.execute(
            select(ApiKey).where(ApiKey.prefix == prefix)
        )
        return result.scalar_one_or_none()

    async def list_for_tenant(self, tenant_id: str) -> list[ApiKey]:
        result = await self._session.execute(
            select(ApiKey)
            .where(ApiKey.tenant_id == tenant_id)
            .order_by(ApiKey.created_at.desc())
        )
        return list(result.scalars().all())
