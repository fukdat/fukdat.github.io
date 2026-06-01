"""Request/response schemas for the billing domain."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.billing import (
    BillingInterval,
    InvoiceStatus,
    SubscriptionStatus,
)


class PlanComponentIn(BaseModel):
    metric: str = Field(min_length=1, max_length=64)
    unit_price_cents: int = Field(ge=0)
    included_units: int = Field(default=0, ge=0)


class PlanComponentRead(PlanComponentIn):
    model_config = ConfigDict(from_attributes=True)
    id: str


class PlanCreate(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    interval: BillingInterval
    base_price_cents: int = Field(default=0, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    components: list[PlanComponentIn] = Field(default_factory=list)


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    interval: BillingInterval
    base_price_cents: int
    currency: str
    is_active: bool
    components: list[PlanComponentRead]


class CustomerCreate(BaseModel):
    external_id: str = Field(min_length=1, max_length=128)
    email: EmailStr
    name: str | None = Field(default=None, max_length=255)


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    external_id: str
    email: str
    name: str | None


class SubscriptionCreate(BaseModel):
    customer_id: str
    plan_id: str


class SubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str
    plan_id: str
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime


class UsageCreate(BaseModel):
    subscription_id: str
    metric: str = Field(min_length=1, max_length=64)
    quantity: int = Field(gt=0)
    idempotency_key: str = Field(min_length=1, max_length=128)
    recorded_at: datetime | None = None


class UsageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subscription_id: str
    metric: str
    quantity: int
    idempotency_key: str
    recorded_at: datetime


class InvoiceLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    description: str
    quantity: int
    unit_price_cents: int
    amount_cents: int


class InvoiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    subscription_id: str
    period_start: datetime
    period_end: datetime
    currency: str
    status: InvoiceStatus
    total_cents: int
    lines: list[InvoiceLineRead]


class PaymentIntentRead(BaseModel):
    payment_intent_id: str
    client_secret: str
    amount_cents: int
    currency: str
    status: str
