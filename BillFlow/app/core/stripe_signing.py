"""Stripe webhook signature verification.

Implements Stripe's scheme: the ``Stripe-Signature`` header carries a timestamp
``t`` and one or more ``v1`` HMAC-SHA256 signatures over ``"{t}.{payload}"``
keyed by the endpoint's webhook secret. ``sign_payload`` is the inverse, used in
tests to produce valid signatures without a live Stripe account.
"""

from __future__ import annotations

import hashlib
import hmac
import time


def sign_payload(payload: bytes, secret: str, timestamp: int | None = None) -> str:
    """Produce a valid ``Stripe-Signature`` header value for ``payload``."""
    ts = timestamp if timestamp is not None else int(time.time())
    signed = f"{ts}.".encode() + payload
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={ts},v1={digest}"


def _parse_header(header: str) -> tuple[int | None, list[str]]:
    timestamp: int | None = None
    signatures: list[str] = []
    for part in header.split(","):
        key, _, value = part.partition("=")
        key, value = key.strip(), value.strip()
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError:
                timestamp = None
        elif key == "v1":
            signatures.append(value)
    return timestamp, signatures


def verify_signature(
    payload: bytes, header: str, secret: str, tolerance_seconds: int = 300
) -> bool:
    """Return True iff the header carries a valid, fresh signature."""
    if not header or not secret:
        return False
    timestamp, signatures = _parse_header(header)
    if timestamp is None or not signatures:
        return False
    if abs(int(time.time()) - timestamp) > tolerance_seconds:
        return False

    signed = f"{timestamp}.".encode() + payload
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)
