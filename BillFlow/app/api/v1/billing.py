"""Billing endpoints. Every route is scoped to the authenticated key's
tenant, so a key can only ever touch its own tenant's data."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import BillingServiceDep, PaymentGatewayDep, require_role
from app.models.api_key import ApiKey, ApiKeyRole
from app.schemas.billing import (
    CustomerCreate,
    CustomerRead,
    InvoiceRead,
    PaymentIntentRead,
    PlanCreate,
    PlanRead,
    SubscriptionCreate,
    SubscriptionRead,
    UsageCreate,
    UsageRead,
)

router = APIRouter(prefix="/billing", tags=["billing"])

_WRITE = require_role(ApiKeyRole.WRITE)
_READ = require_role(ApiKeyRole.READ)


@router.post(
    "/plans", response_model=PlanRead, status_code=status.HTTP_201_CREATED
)
async def create_plan(
    payload: PlanCreate,
    service: BillingServiceDep,
    key: ApiKey = Depends(_WRITE),
) -> PlanRead:
    plan = await service.create_plan(key.tenant_id, payload)
    return PlanRead.model_validate(plan)


@router.get("/plans", response_model=list[PlanRead])
async def list_plans(
    service: BillingServiceDep,
    key: ApiKey = Depends(_READ),
) -> list[PlanRead]:
    plans = await service.list_plans(key.tenant_id)
    return [PlanRead.model_validate(p) for p in plans]


@router.post(
    "/customers",
    response_model=CustomerRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_customer(
    payload: CustomerCreate,
    service: BillingServiceDep,
    key: ApiKey = Depends(_WRITE),
) -> CustomerRead:
    customer = await service.create_customer(key.tenant_id, payload)
    return CustomerRead.model_validate(customer)


@router.post(
    "/subscriptions",
    response_model=SubscriptionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription(
    payload: SubscriptionCreate,
    service: BillingServiceDep,
    key: ApiKey = Depends(_WRITE),
) -> SubscriptionRead:
    sub = await service.create_subscription(key.tenant_id, payload)
    return SubscriptionRead.model_validate(sub)


@router.post(
    "/usage", response_model=UsageRead, status_code=status.HTTP_201_CREATED
)
async def record_usage(
    payload: UsageCreate,
    service: BillingServiceDep,
    response: Response,
    key: ApiKey = Depends(_WRITE),
) -> UsageRead:
    record, created = await service.record_usage(key.tenant_id, payload)
    # Idempotent replay returns the existing record with 200 instead of 201.
    response.status_code = (
        status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )
    return UsageRead.model_validate(record)


@router.post(
    "/subscriptions/{subscription_id}/invoice",
    response_model=InvoiceRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_invoice(
    subscription_id: str,
    service: BillingServiceDep,
    key: ApiKey = Depends(_WRITE),
) -> InvoiceRead:
    invoice = await service.generate_invoice(key.tenant_id, subscription_id)
    return InvoiceRead.model_validate(invoice)


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: str,
    service: BillingServiceDep,
    key: ApiKey = Depends(_READ),
) -> InvoiceRead:
    invoice = await service.get_invoice(key.tenant_id, invoice_id)
    return InvoiceRead.model_validate(invoice)


@router.post(
    "/invoices/{invoice_id}/pay",
    response_model=PaymentIntentRead,
    status_code=status.HTTP_201_CREATED,
)
async def pay_invoice(
    invoice_id: str,
    service: BillingServiceDep,
    gateway: PaymentGatewayDep,
    key: ApiKey = Depends(_WRITE),
) -> PaymentIntentRead:
    intent = await service.create_payment_intent(key.tenant_id, invoice_id, gateway)
    return PaymentIntentRead(
        payment_intent_id=intent.id,
        client_secret=intent.client_secret,
        amount_cents=intent.amount_cents,
        currency=intent.currency,
        status=intent.status,
    )
