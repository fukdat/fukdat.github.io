"""Persistence for processed webhook events."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook_event import WebhookEvent


class WebhookEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def exists(self, event_id: str) -> bool:
        return (await self._session.get(WebhookEvent, event_id)) is not None

    async def add(self, event_id: str, event_type: str) -> None:
        self._session.add(WebhookEvent(id=event_id, event_type=event_type))
        await self._session.flush()
