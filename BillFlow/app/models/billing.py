"""Billing domain models.

Money is stored as integer **cents** to keep arithmetic exact. Metered
quantities are integers (e.g. API calls, seats, messages).
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class BillingInterval(str, enum.Enum):
    MONTH = "month"
    YEAR = "year"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELED = "canceled"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"


class Plan(UUIDMixin, TimestampMixin, Base):
    """A pricing plan owned by a tenant: a recurring base fee plus optional
    metered components."""

    __tablename__ = "plans"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_plan_code"),)

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval, native_enum=False, length=16), nullable=False
    )
    base_price_cents: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    components: Mapped[list[PlanComponent]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PlanComponent(UUIDMixin, TimestampMixin, Base):
    """A metered price component of a plan (e.g. $0.002 per API call,
    with the first 10_000 included)."""

    __tablename__ = "plan_components"
    __table_args__ = (
        UniqueConstraint("plan_id", "metric", name="uq_component_metric"),
    )

    plan_id: Mapped[str] = mapped_column(
        ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    included_units: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    plan: Mapped[Plan] = relationship(back_populates="components")


class Customer(UUIDMixin, TimestampMixin, Base):
    """An end customer of a tenant — the entity that gets billed."""

    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "external_id", name="uq_customer_external"),
    )

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    external_id: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Subscription(UUIDMixin, TimestampMixin, Base):
    """A customer's active subscription to a plan, with the current billing
    period bounds."""

    __tablename__ = "subscriptions"

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[str] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[str] = mapped_column(
        ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, native_enum=False, length=16),
        nullable=False,
        default=SubscriptionStatus.ACTIVE,
    )
    current_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class UsageRecord(UUIDMixin, TimestampMixin, Base):
    """A single metered usage event.

    The ``(tenant_id, idempotency_key)`` unique constraint guarantees that
    a client retrying the same event never double-bills.
    """

    __tablename__ = "usage_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "idempotency_key", name="uq_usage_idempotency"
        ),
    )

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id: Mapped[str] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    metric: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


class Invoice(UUIDMixin, TimestampMixin, Base):
    """A generated invoice for a subscription's billing period."""

    __tablename__ = "invoices"

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subscription_id: Mapped[str] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, native_enum=False, length=16),
        nullable=False,
        default=InvoiceStatus.OPEN,
    )
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    external_payment_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    lines: Mapped[list[InvoiceLine]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class InvoiceLine(UUIDMixin, Base):
    """A single line item on an invoice."""

    __tablename__ = "invoice_lines"

    invoice_id: Mapped[str] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    invoice: Mapped[Invoice] = relationship(back_populates="lines")
