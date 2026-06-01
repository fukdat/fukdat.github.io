"""Business logic for billing: plans, subscriptions, metered usage and
invoice generation."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dates import add_billing_interval, ensure_utc
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.billing import (
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
from app.repositories.billing_repo import (
    CustomerRepository,
    InvoiceRepository,
    PlanRepository,
    SubscriptionRepository,
    UsageRepository,
)
from app.services.payments import PaymentGateway, PaymentIntent
from app.schemas.billing import (
    CustomerCreate,
    PlanCreate,
    SubscriptionCreate,
    UsageCreate,
)


class BillingService:
    """Coordinates the billing use-cases for a single tenant context."""

    def __init__(
        self,
        session: AsyncSession,
        plans: PlanRepository,
        customers: CustomerRepository,
        subscriptions: SubscriptionRepository,
        usage: UsageRepository,
        invoices: InvoiceRepository,
    ) -> None:
        self._session = session
        self._plans = plans
        self._customers = customers
        self._subs = subscriptions
        self._usage = usage
        self._invoices = invoices

    # --- Plans ---------------------------------------------------------

    async def create_plan(self, tenant_id: str, payload: PlanCreate) -> Plan:
        if await self._plans.get_by_code(tenant_id, payload.code) is not None:
            raise ConflictError(f"plan code '{payload.code}' already exists")

        metrics = [c.metric for c in payload.components]
        if len(metrics) != len(set(metrics)):
            raise ValidationError("duplicate metric in plan components")

        plan = Plan(
            tenant_id=tenant_id,
            code=payload.code,
            name=payload.name,
            interval=payload.interval,
            base_price_cents=payload.base_price_cents,
            currency=payload.currency.upper(),
        )
        plan.components = [
            PlanComponent(
                metric=c.metric,
                unit_price_cents=c.unit_price_cents,
                included_units=c.included_units,
            )
            for c in payload.components
        ]
        return await self._plans.add(plan)

    async def list_plans(self, tenant_id: str) -> list[Plan]:
        return await self._plans.list_for_tenant(tenant_id)

    # --- Customers -----------------------------------------------------

    async def create_customer(
        self, tenant_id: str, payload: CustomerCreate
    ) -> Customer:
        existing = await self._customers.get_by_external_id(
            tenant_id, payload.external_id
        )
        if existing is not None:
            raise ConflictError(
                f"customer external_id '{payload.external_id}' already exists"
            )
        customer = Customer(
            tenant_id=tenant_id,
            external_id=payload.external_id,
            email=str(payload.email),
            name=payload.name,
        )
        return await self._customers.add(customer)

    # --- Subscriptions -------------------------------------------------

    async def create_subscription(
        self, tenant_id: str, payload: SubscriptionCreate
    ) -> Subscription:
        customer = await self._customers.get(tenant_id, payload.customer_id)
        if customer is None:
            raise NotFoundError("customer not found")
        plan = await self._plans.get(tenant_id, payload.plan_id)
        if plan is None:
            raise NotFoundError("plan not found")
        if not plan.is_active:
            raise ValidationError("cannot subscribe to an inactive plan")

        start = datetime.now(timezone.utc)
        subscription = Subscription(
            tenant_id=tenant_id,
            customer_id=customer.id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=start,
            current_period_end=add_billing_interval(start, plan.interval),
        )
        return await self._subs.add(subscription)

    # --- Usage ---------------------------------------------------------

    async def record_usage(
        self, tenant_id: str, payload: UsageCreate
    ) -> tuple[UsageRecord, bool]:
        """Record a metered usage event idempotently.

        Returns ``(record, created)``. A repeated ``idempotency_key``
        returns the original record with ``created=False`` and never
        double-counts — even under concurrent retries.
        """
        existing = await self._usage.get_by_idempotency_key(
            tenant_id, payload.idempotency_key
        )
        if existing is not None:
            return existing, False

        subscription = await self._subs.get(tenant_id, payload.subscription_id)
        if subscription is None:
            raise NotFoundError("subscription not found")
        if subscription.status is not SubscriptionStatus.ACTIVE:
            raise ValidationError("subscription is not active")

        recorded_at = (
            ensure_utc(payload.recorded_at)
            if payload.recorded_at is not None
            else datetime.now(timezone.utc)
        )
        record = UsageRecord(
            tenant_id=tenant_id,
            subscription_id=subscription.id,
            metric=payload.metric,
            quantity=payload.quantity,
            idempotency_key=payload.idempotency_key,
            recorded_at=recorded_at,
        )
        try:
            await self._usage.add(record)
        except IntegrityError:
            # Lost a race against a concurrent identical request: roll back
            # and return the row the winner committed.
            await self._session.rollback()
            winner = await self._usage.get_by_idempotency_key(
                tenant_id, payload.idempotency_key
            )
            if winner is None:  # pragma: no cover - defensive
                raise
            return winner, False
        return record, True

    # --- Invoices ------------------------------------------------------

    async def generate_invoice(
        self, tenant_id: str, subscription_id: str
    ) -> Invoice:
        """Build an invoice for a subscription's current billing period:
        base fee plus metered overage per plan component."""
        subscription = await self._subs.get(tenant_id, subscription_id)
        if subscription is None:
            raise NotFoundError("subscription not found")
        plan = await self._plans.get(tenant_id, subscription.plan_id)
        if plan is None:  # pragma: no cover - FK guarantees presence
            raise NotFoundError("plan not found")

        period_start = subscription.current_period_start
        period_end = subscription.current_period_end

        lines: list[InvoiceLine] = []
        if plan.base_price_cents > 0:
            lines.append(
                InvoiceLine(
                    description=f"{plan.name} (base)",
                    quantity=1,
                    unit_price_cents=plan.base_price_cents,
                    amount_cents=plan.base_price_cents,
                )
            )

        for component in plan.components:
            used = await self._usage.sum_quantity(
                subscription.id, component.metric, period_start, period_end
            )
            billable = max(0, used - component.included_units)
            if billable <= 0:
                continue
            amount = billable * component.unit_price_cents
            lines.append(
                InvoiceLine(
                    description=f"{component.metric} usage",
                    quantity=billable,
                    unit_price_cents=component.unit_price_cents,
                    amount_cents=amount,
                )
            )

        invoice = Invoice(
            tenant_id=tenant_id,
            subscription_id=subscription.id,
            period_start=period_start,
            period_end=period_end,
            currency=plan.currency,
            status=InvoiceStatus.OPEN,
            total_cents=sum(line.amount_cents for line in lines),
        )
        invoice.lines = lines
        return await self._invoices.add(invoice)

    async def get_invoice(self, tenant_id: str, invoice_id: str) -> Invoice:
        invoice = await self._invoices.get(tenant_id, invoice_id)
        if invoice is None:
            raise NotFoundError("invoice not found")
        return invoice

    async def create_payment_intent(
        self, tenant_id: str, invoice_id: str, gateway: PaymentGateway
    ) -> PaymentIntent:
        """Create a payment intent for an open invoice via the gateway and
        record its id so the matching webhook can settle it."""
        invoice = await self._invoices.get(tenant_id, invoice_id)
        if invoice is None:
            raise NotFoundError("invoice not found")
        if invoice.status is not InvoiceStatus.OPEN:
            raise ValidationError("only open invoices can be paid")
        if invoice.total_cents <= 0:
            raise ValidationError("invoice total must be positive to collect payment")

        intent = await gateway.create_payment_intent(
            amount_cents=invoice.total_cents,
            currency=invoice.currency,
            idempotency_key=f"invoice_{invoice.id}",
            metadata={"invoice_id": invoice.id, "tenant_id": tenant_id},
        )
        invoice.external_payment_id = intent.id
        return intent
