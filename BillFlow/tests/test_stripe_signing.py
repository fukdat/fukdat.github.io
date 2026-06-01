"""Unit tests for Stripe HMAC webhook signature."""

from __future__ import annotations

import time

from app.core.stripe_signing import sign_payload, verify_signature

SECRET = "whsec_test_secret_1234567890"
PAYLOAD = b'{"id":"evt_test","type":"payment_intent.succeeded"}'


def test_valid_signature_passes() -> None:
    header = sign_payload(PAYLOAD, SECRET)
    assert verify_signature(PAYLOAD, header, SECRET) is True


def test_tampered_payload_fails() -> None:
    header = sign_payload(PAYLOAD, SECRET)
    assert verify_signature(b'{"tampered":true}', header, SECRET) is False


def test_expired_timestamp_fails() -> None:
    old_ts = int(time.time()) - 400
    header = sign_payload(PAYLOAD, SECRET, timestamp=old_ts)
    assert verify_signature(PAYLOAD, header, SECRET, tolerance_seconds=300) is False


def test_wrong_secret_fails() -> None:
    header = sign_payload(PAYLOAD, SECRET)
    assert verify_signature(PAYLOAD, header, "wrong_secret") is False


def test_empty_header_fails() -> None:
    assert verify_signature(PAYLOAD, "", SECRET) is False


def test_empty_secret_fails() -> None:
    header = sign_payload(PAYLOAD, SECRET)
    assert verify_signature(PAYLOAD, header, "") is False
