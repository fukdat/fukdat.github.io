"""Integration tests for the billing domain."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1"


async def _bootstrap(client: AsyncClient, slug: str) -> dict[str, str]:
    """Create a tenant + admin key; return auth headers and tenant id."""
    tenant = await client.post(
        f"{BASE}/tenants", json={"name": slug.title(), "slug": slug}
    )
    tenant_id = tenant.json()["id"]
    key = await client.post(
        f"{BASE}/tenants/{tenant_id}/api-keys", json={"role": "admin"}
    )
    raw = key.json()["raw_key"]
    return {"Authorization": f"Bearer {raw}", "tenant_id": tenant_id}


async def _setup_subscription(
    client: AsyncClient, headers: dict[str, str]
) -> str:
    """Create a plan ($10 base + $0.02/call over 100 included), a customer,
    and an active subscription. Returns the subscription id."""
    auth = {"Authorization": headers["Authorization"]}
    plan = await client.post(
        f"{BASE}/billing/plans",
        headers=auth,
        json={
            "code": "pro",
            "name": "Pro",
            "interval": "month",
            "base_price_cents": 1000,
            "currency": "USD",
            "components": [
                {
                    "metric": "api_calls",
                    "unit_price_cents": 2,
                    "included_units": 100,
                }
            ],
        },
    )
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()["id"]

    customer = await client.post(
        f"{BASE}/billing/customers",
        headers=auth,
        json={"external_id": "cust_1", "email": "a@b.com", "name": "Acme"},
    )
    assert customer.status_code == 201, customer.text
    customer_id = customer.json()["id"]

    sub = await client.post(
        f"{BASE}/billing/subscriptions",
        headers=auth,
        json={"customer_id": customer_id, "plan_id": plan_id},
    )
    assert sub.status_code == 201, sub.text
    return str(sub.json()["id"])


async def test_plan_creation_with_component(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    auth = {"Authorization": headers["Authorization"]}
    resp = await client.get(f"{BASE}/billing/plans", headers=auth)
    assert resp.status_code == 200
    # No plan yet.
    assert resp.json() == []


async def test_duplicate_plan_code_conflicts(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    await _setup_subscription(client, headers)
    auth = {"Authorization": headers["Authorization"]}
    dup = await client.post(
        f"{BASE}/billing/plans",
        headers=auth,
        json={"code": "pro", "name": "Pro2", "interval": "month"},
    )
    assert dup.status_code == 409


async def test_usage_idempotency(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    sub_id = await _setup_subscription(client, headers)
    auth = {"Authorization": headers["Authorization"]}
    body = {
        "subscription_id": sub_id,
        "metric": "api_calls",
        "quantity": 150,
        "idempotency_key": "evt_1",
    }
    first = await client.post(f"{BASE}/billing/usage", headers=auth, json=body)
    second = await client.post(f"{BASE}/billing/usage", headers=auth, json=body)
    assert first.status_code == 201
    assert second.status_code == 200  # replay, not a new record
    assert first.json()["id"] == second.json()["id"]


async def test_invoice_metered_overage_math(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    sub_id = await _setup_subscription(client, headers)
    auth = {"Authorization": headers["Authorization"]}

    # 150 calls, 100 included -> 50 billable @ 2c = 100c, plus 1000c base.
    await client.post(
        f"{BASE}/billing/usage",
        headers=auth,
        json={
            "subscription_id": sub_id,
            "metric": "api_calls",
            "quantity": 150,
            "idempotency_key": "evt_1",
        },
    )
    inv = await client.post(
        f"{BASE}/billing/subscriptions/{sub_id}/invoice", headers=auth
    )
    assert inv.status_code == 201, inv.text
    data = inv.json()
    assert data["total_cents"] == 1100
    assert len(data["lines"]) == 2
    metered = next(line for line in data["lines"] if line["quantity"] == 50)
    assert metered["amount_cents"] == 100


async def test_invoice_no_overage_is_base_only(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    sub_id = await _setup_subscription(client, headers)
    auth = {"Authorization": headers["Authorization"]}
    await client.post(
        f"{BASE}/billing/usage",
        headers=auth,
        json={
            "subscription_id": sub_id,
            "metric": "api_calls",
            "quantity": 80,  # under the 100 included units
            "idempotency_key": "evt_2",
        },
    )
    inv = await client.post(
        f"{BASE}/billing/subscriptions/{sub_id}/invoice", headers=auth
    )
    data = inv.json()
    assert data["total_cents"] == 1000
    assert len(data["lines"]) == 1


async def test_tenant_isolation_on_invoice(client: AsyncClient) -> None:
    a = await _bootstrap(client, "tenant-a")
    sub_a = await _setup_subscription(client, a)
    auth_a = {"Authorization": a["Authorization"]}
    inv = await client.post(
        f"{BASE}/billing/subscriptions/{sub_a}/invoice", headers=auth_a
    )
    invoice_id = inv.json()["id"]

    b = await _bootstrap(client, "tenant-b")
    auth_b = {"Authorization": b["Authorization"]}
    leaked = await client.get(
        f"{BASE}/billing/invoices/{invoice_id}", headers=auth_b
    )
    assert leaked.status_code == 404


async def test_usage_on_missing_subscription(client: AsyncClient) -> None:
    headers = await _bootstrap(client, "acme")
    auth = {"Authorization": headers["Authorization"]}
    resp = await client.post(
        f"{BASE}/billing/usage",
        headers=auth,
        json={
            "subscription_id": "does-not-exist",
            "metric": "api_calls",
            "quantity": 5,
            "idempotency_key": "evt_x",
        },
    )
    assert resp.status_code == 404
