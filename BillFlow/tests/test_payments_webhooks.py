"""Integration tests for payment intents and Stripe webhook settlement."""

from __future__ import annotations

import json

from httpx import AsyncClient

from app.core.stripe_signing import sign_payload

BASE = "/api/v1"


async def _bootstrap(client: AsyncClient, slug: str) -> dict[str, str]:
    tenant = await client.post(
        f"{BASE}/tenants", json={"name": slug.replace("-", " ").title(), "slug": slug}
    )
    assert tenant.status_code == 201, tenant.text
    tenant_id = tenant.json()["id"]
    key = await client.post(
        f"{BASE}/tenants/{tenant_id}/api-keys", json={"role": "admin"}
    )
    raw = key.json()["raw_key"]
    return {"Authorization": f"Bearer {raw}", "tenant_id": tenant_id}


async def _create_open_invoice(client: AsyncClient, headers: dict[str, str]) -> str:
    """Bootstrap a full subscription, record usage, and generate an open invoice.
    Returns the invoice id."""
    auth = {"Authorization": headers["Authorization"]}

    plan = await client.post(
        f"{BASE}/billing/plans",
        headers=auth,
        json={
            "code": "pro",
            "name": "Pro",
            "interval": "month",
            "base_price_cents": 5000,
            "currency": "USD",
            "components": [],
        },
    )
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()["id"]

    customer = await client.post(
        f"{BASE}/billing/customers",
        headers=auth,
        json={"external_id": "cust_pay_1", "email": "pay@test.com"},
    )
    assert customer.status_code == 201, customer.text
    customer_id = customer.json()["id"]

    sub = await client.post(
        f"{BASE}/billing/subscriptions",
        headers=auth,
        json={"customer_id": customer_id, "plan_id": plan_id},
    )
    assert sub.status_code == 201, sub.text
    sub_id = sub.json()["id"]

    invoice = await client.post(
        f"{BASE}/billing/subscriptions/{sub_id}/invoice",
        headers=auth,
    )
    assert invoice.status_code == 201, invoice.text
    assert invoice.json()["status"] == "open"
    return str(invoice.json()["id"])


async def test_pay_invoice_returns_payment_intent(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "pay-tenant")
    auth = {"Authorization": headers["Authorization"]}
    invoice_id = await _create_open_invoice(client, headers)

    resp = await client.post(f"{BASE}/billing/invoices/{invoice_id}/pay", headers=auth)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["payment_intent_id"].startswith("pi_fake_")
    assert body["amount_cents"] == 5000
    assert body["currency"] == "USD"


async def test_webhook_settles_invoice(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "webhook-tenant")
    auth = {"Authorization": headers["Authorization"]}
    invoice_id = await _create_open_invoice(client, headers)

    pay_resp = await client.post(
        f"{BASE}/billing/invoices/{invoice_id}/pay", headers=auth
    )
    assert pay_resp.status_code == 201, pay_resp.text
    pi_id = pay_resp.json()["payment_intent_id"]

    event_body = json.dumps(
        {
            "id": "evt_test_001",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": pi_id}},
        }
    ).encode()
    sig = sign_payload(event_body, "whsec_test_abc123")

    webhook_resp = await client.post(
        f"{BASE}/webhooks/stripe",
        content=event_body,
        headers={"stripe-signature": sig, "content-type": "application/json"},
    )
    assert webhook_resp.status_code == 200, webhook_resp.text
    result = webhook_resp.json()
    assert result["deduped"] is False
    assert result["applied"] is True

    invoice_resp = await client.get(
        f"{BASE}/billing/invoices/{invoice_id}", headers=auth
    )
    assert invoice_resp.json()["status"] == "paid"


async def test_webhook_dedup_on_replay(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "dedup-tenant")
    auth = {"Authorization": headers["Authorization"]}
    invoice_id = await _create_open_invoice(client, headers)

    pay_resp = await client.post(
        f"{BASE}/billing/invoices/{invoice_id}/pay", headers=auth
    )
    pi_id = pay_resp.json()["payment_intent_id"]

    event_body = json.dumps(
        {
            "id": "evt_test_dedup_001",
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": pi_id}},
        }
    ).encode()
    sig = sign_payload(event_body, "whsec_test_abc123")
    headers_wh = {"stripe-signature": sig, "content-type": "application/json"}

    r1 = await client.post(f"{BASE}/webhooks/stripe", content=event_body, headers=headers_wh)
    assert r1.json()["deduped"] is False

    # Replay: same event id must be a no-op.
    sig2 = sign_payload(event_body, "whsec_test_abc123")
    headers_wh2 = {"stripe-signature": sig2, "content-type": "application/json"}
    r2 = await client.post(f"{BASE}/webhooks/stripe", content=event_body, headers=headers_wh2)
    assert r2.status_code == 200
    assert r2.json()["deduped"] is True

    # Invoice must still be paid exactly once.
    inv = await client.get(f"{BASE}/billing/invoices/{invoice_id}", headers=auth)
    assert inv.json()["status"] == "paid"


async def test_webhook_invalid_signature_returns_400(client: AsyncClient) -> None:
    body = b'{"id":"evt_bad","type":"payment_intent.succeeded","data":{"object":{}}}'
    resp = await client.post(
        f"{BASE}/webhooks/stripe",
        content=body,
        headers={"stripe-signature": "t=999,v1=badsig", "content-type": "application/json"},
    )
    assert resp.status_code == 400
