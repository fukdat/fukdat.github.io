"""Payment gateway abstraction.

The application depends on the ``PaymentGateway`` protocol, never on Stripe
directly. ``StripePaymentGateway`` is the production adapter; ``FakePaymentGateway``
is a deterministic in-memory adapter used in tests and when no Stripe key is set.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

import httpx


@dataclass(frozen=True, slots=True)
class PaymentIntent:
    id: str
    client_secret: str
    amount_cents: int
    currency: str
    status: str


class PaymentGateway(Protocol):
    async def create_payment_intent(
        self,
        *,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntent: ...


class StripePaymentGateway:
    """Production adapter calling Stripe's REST API over HTTPS."""

    def __init__(self, secret_key: str, api_base: str = "https://api.stripe.com") -> None:
        self._secret_key = secret_key
        self._api_base = api_base.rstrip("/")

    async def create_payment_intent(
        self,
        *,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntent:
        form: dict[str, str] = {
            "amount": str(amount_cents),
            "currency": currency.lower(),
        }
        for key, value in metadata.items():
            form[f"metadata[{key}]"] = value

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self._api_base}/v1/payment_intents",
                data=form,
                headers={"Idempotency-Key": idempotency_key},
                auth=(self._secret_key, ""),
            )
        response.raise_for_status()
        body = response.json()
        return PaymentIntent(
            id=body["id"],
            client_secret=body.get("client_secret", ""),
            amount_cents=int(body.get("amount", amount_cents)),
            currency=str(body.get("currency", currency)).upper(),
            status=body.get("status", "requires_payment_method"),
        )


@dataclass
class FakePaymentGateway:
    """In-memory gateway recording created intents; deterministic for tests."""

    created: list[PaymentIntent] = field(default_factory=list)

    async def create_payment_intent(
        self,
        *,
        amount_cents: int,
        currency: str,
        idempotency_key: str,
        metadata: dict[str, str],
    ) -> PaymentIntent:
        intent = PaymentIntent(
            id=f"pi_fake_{len(self.created) + 1}",
            client_secret=f"pi_fake_{len(self.created) + 1}_secret",
            amount_cents=amount_cents,
            currency=currency.upper(),
            status="requires_payment_method",
        )
        self.created.append(intent)
        return intent
