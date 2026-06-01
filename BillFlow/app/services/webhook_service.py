"""Idempotent processing of Stripe webhook events."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.models.billing import InvoiceStatus
from app.repositories.billing_repo import InvoiceRepository
from app.repositories.webhook_repo import WebhookEventRepository


class WebhookService:
    """Applies Stripe events to local state exactly once."""

    def __init__(
        self, events: WebhookEventRepository, invoices: InvoiceRepository
    ) -> None:
        self._events = events
        self._invoices = invoices

    async def process(
        self, event_id: str, event_type: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Handle an event. Returns a small result describing what happened.

        A previously-seen ``event_id`` is a no-op (``deduped: True``), so
        Stripe's at-least-once delivery never double-applies an effect.
        """
        if await self._events.exists(event_id):
            return {"deduped": True}

        await self._events.add(event_id, event_type)

        applied = False
        if event_type == "payment_intent.succeeded":
            applied = await self._settle_invoice(str(data.get("id", "")))

        return {"deduped": False, "type": event_type, "applied": applied}

    async def _settle_invoice(self, payment_intent_id: str) -> bool:
        if not payment_intent_id:
            return False
        invoice = await self._invoices.get_by_payment_id(payment_intent_id)
        if invoice is None or invoice.status is not InvoiceStatus.OPEN:
            return False
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.now(timezone.utc)
        return True
