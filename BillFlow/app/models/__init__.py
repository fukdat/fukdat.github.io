"""ORM models package.

Importing every model here guarantees they are registered on
``Base.metadata`` before ``create_all`` / Alembic autogeneration runs.
"""

from app.models.api_key import ApiKey, ApiKeyRole
from app.models.billing import (
    BillingInterval,
    Customer,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Plan,
    PlanComponent,
    Subscription,
    SubscriptionStatus,
    UsageRecord,
)
from app.models.tenant import Tenant
from app.models.webhook_event import WebhookEvent

__all__ = [
    "ApiKey",
    "ApiKeyRole",
    "BillingInterval",
    "Customer",
    "Invoice",
    "InvoiceLine",
    "InvoiceStatus",
    "Plan",
    "PlanComponent",
    "Subscription",
    "SubscriptionStatus",
    "Tenant",
    "UsageRecord",
    "WebhookEvent",
]
