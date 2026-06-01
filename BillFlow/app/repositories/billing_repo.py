"""Data-access layer for the billing domain."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billing import (
    Customer,
    Invoice,
    Plan,
    Subscription,
    UsageRecord,
)


class PlanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, plan: Plan) -> Plan:
        self._session.add(plan)
        await self._session.flush()
        return plan

    async def get(self, tenant_id: str, plan_id: str) -> Plan | None:
        plan = await self._session.get(Plan, plan_id)
        if plan is None or plan.tenant_id != tenant_id:
            return None
        return plan

    async def list_for_tenant(self, tenant_id: str) -> list[Plan]:
        result = await self._session.execute(
            select(Plan)
            .where(Plan.tenant_id == tenant_id)
            .order_by(Plan.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_code(self, tenant_id: str, code: str) -> Plan | None:
        result = await self._session.execute(
            select(Plan).where(Plan.tenant_id == tenant_id, Plan.code == code)
        )
        return result.scalar_one_or_none()


class CustomerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, customer: Customer) -> Customer:
        self._session.add(customer)
        await self._session.flush()
        return customer

    async def get(self, tenant_id: str, customer_id: str) -> Customer | None:
        customer = await self._session.get(Customer, customer_id)
        if customer is None or customer.tenant_id != tenant_id:
            return None
        return customer

    async def get_by_external_id(
        self, tenant_id: str, external_id: str
    ) -> Customer | None:
        result = await self._session.execute(
            select(Customer).where(
                Customer.tenant_id == tenant_id,
                Customer.external_id == external_id,
            )
        )
        return result.scalar_one_or_none()


class SubscriptionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, subscription: Subscription) -> Subscription:
        self._session.add(subscription)
        await self._session.flush()
        return subscription

    async def get(
        self, tenant_id: str, subscription_id: str
    ) -> Subscription | None:
        sub = await self._session.get(Subscription, subscription_id)
        if sub is None or sub.tenant_id != tenant_id:
            return None
        return sub


class UsageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, record: UsageRecord) -> UsageRecord:
        self._session.add(record)
        await self._session.flush()
        return record

    async def get_by_idempotency_key(
        self, tenant_id: str, idempotency_key: str
    ) -> UsageRecord | None:
        result = await self._session.execute(
            select(UsageRecord).where(
                UsageRecord.tenant_id == tenant_id,
                UsageRecord.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    async def sum_quantity(
        self,
        subscription_id: str,
        metric: str,
        period_start: datetime,
        period_end: datetime,
    ) -> int:
        result = await self._session.execute(
            select(func.coalesce(func.sum(UsageRecord.quantity), 0)).where(
                UsageRecord.subscription_id == subscription_id,
                UsageRecord.metric == metric,
                UsageRecord.recorded_at >= period_start,
                UsageRecord.recorded_at < period_end,
            )
        )
        return int(result.scalar_one())


class InvoiceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, invoice: Invoice) -> Invoice:
        self._session.add(invoice)
        await self._session.flush()
        return invoice

    async def get(self, tenant_id: str, invoice_id: str) -> Invoice | None:
        invoice = await self._session.get(Invoice, invoice_id)
        if invoice is None or invoice.tenant_id != tenant_id:
            return None
        return invoice

    async def get_by_payment_id(self, payment_id: str) -> Invoice | None:
        """Look up an invoice by its external payment id (system-wide).

        Webhooks are not tenant-scoped, so this intentionally crosses tenants.
        """
        from sqlalchemy import select

        result = await self._session.execute(
            select(Invoice).where(Invoice.external_payment_id == payment_id)
        )
        return result.scalar_one_or_none()
