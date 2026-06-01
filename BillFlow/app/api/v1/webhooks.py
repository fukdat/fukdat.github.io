"""Stripe webhook receiver."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.api.deps import WebhookServiceDep
from app.core.config import get_settings
from app.core.stripe_signing import verify_signature

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    service: WebhookServiceDep,
) -> Any:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    secret = get_settings().stripe_webhook_secret

    if not verify_signature(payload, sig_header, secret):
        return JSONResponse(status_code=400, content={"detail": "invalid signature"})

    event: dict[str, Any] = json.loads(payload)
    result = await service.process(
        event_id=str(event["id"]),
        event_type=str(event["type"]),
        data=dict(event.get("data", {}).get("object", {})),
    )
    return result
