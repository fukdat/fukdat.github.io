"""Date helpers for billing period math."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone

from app.models.billing import BillingInterval


def ensure_utc(dt: datetime) -> datetime:
    """Return a timezone-aware UTC datetime.

    Naive datetimes are assumed to already be in UTC.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def add_billing_interval(start: datetime, interval: BillingInterval) -> datetime:
    """Add one billing interval to ``start``.

    Clamps the day to the last valid day of the target month so that
    e.g. Jan 31 + 1 month -> Feb 28/29, and Feb 29 + 1 year -> Feb 28.
    """
    if interval is BillingInterval.YEAR:
        year, month = start.year + 1, start.month
    else:
        month = start.month + 1
        year = start.year + (1 if month > 12 else 0)
        month = month - 12 if month > 12 else month

    last_day = calendar.monthrange(year, month)[1]
    return start.replace(year=year, month=month, day=min(start.day, last_day))
