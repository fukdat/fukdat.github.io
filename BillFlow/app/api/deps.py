"""Reusable FastAPI dependencies for wiring and authentication."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.core.errors import AuthenticationError, AuthorizationError
from app.models.api_key import ApiKey, ApiKeyRole
from app.repositories.api_key_repo import ApiKeyRepository
from app.repositories.billing_repo import (
    CustomerRepository,
    InvoiceRepository,
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
)
from app.repositories.tenant_repo import TenantRepository
from app.repositories.webhook_repo import WebhookEventRepository
from app.services.billing_service import BillingService
from app.services.payments import FakePaymentGateway, PaymentGateway, StripePaymentGateway
from app.services.tenant_service import TenantService
from app.services.webhook_service import WebhookService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_tenant_service(session: SessionDep) -> TenantService:
    return TenantService(
        tenants=TenantRepository(session),
        api_keys=ApiKeyRepository(session),
    )


TenantServiceDep = Annotated[TenantService, Depends(get_tenant_service)]


def get_billing_service(session: SessionDep) -> BillingService:
    return BillingService(
        session=session,
        plans=PlanRepository(session),
        customers=CustomerRepository(session),
        subscriptions=SubscriptionRepository(session),
        usage=UsageRepository(session),
        invoices=InvoiceRepository(session),
    )


BillingServiceDep = Annotated[BillingService, Depends(get_billing_service)]


def get_payment_gateway() -> PaymentGateway:
    settings = get_settings()
    if settings.stripe_secret_key:
        return StripePaymentGateway(settings.stripe_secret_key, settings.stripe_api_base)
    return FakePaymentGateway()


PaymentGatewayDep = Annotated[PaymentGateway, Depends(get_payment_gateway)]


def get_webhook_service(session: SessionDep) -> WebhookService:
    return WebhookService(
        events=WebhookEventRepository(session),
        invoices=InvoiceRepository(session),
    )


WebhookServiceDep = Annotated[WebhookService, Depends(get_webhook_service)]


async def require_api_key(
    service: TenantServiceDep,
    authorization: Annotated[str | None, Header()] = None,
) -> ApiKey:
    """Authenticate the caller via ``Authorization: Bearer <key>``."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("missing bearer token")
    raw_key = authorization[7:].strip()
    return await service.authenticate(raw_key)


ApiKeyDep = Annotated[ApiKey, Depends(require_api_key)]

_ROLE_RANK = {ApiKeyRole.READ: 0, ApiKeyRole.WRITE: 1, ApiKeyRole.ADMIN: 2}


def require_role(minimum: ApiKeyRole) -> Callable[..., Awaitable[ApiKey]]:
    """Build a dependency enforcing a minimum role level."""

    async def _checker(key: ApiKeyDep) -> ApiKey:
        if _ROLE_RANK[key.role] < _ROLE_RANK[minimum]:
            raise AuthorizationError(
                f"role '{key.role.value}' is below required '{minimum.value}'"
            )
        return key

    return _checker
