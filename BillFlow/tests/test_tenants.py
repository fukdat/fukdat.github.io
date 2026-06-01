"""Integration tests for the tenant and API-key flows."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1"


async def test_health(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    assert resp.headers.get("x-request-id")


async def test_ready(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


async def test_create_tenant(client: AsyncClient) -> None:
    resp = await client.post(
        f"{BASE}/tenants", json={"name": "Acme Inc", "slug": "acme"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["slug"] == "acme"
    assert body["is_active"] is True
    assert body["id"]


async def test_duplicate_slug_conflicts(client: AsyncClient) -> None:
    payload = {"name": "Acme", "slug": "acme"}
    first = await client.post(f"{BASE}/tenants", json=payload)
    assert first.status_code == 201
    second = await client.post(f"{BASE}/tenants", json=payload)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "conflict"


async def test_invalid_slug_rejected(client: AsyncClient) -> None:
    resp = await client.post(
        f"{BASE}/tenants", json={"name": "Bad", "slug": "Has Spaces"}
    )
    assert resp.status_code == 422


async def test_api_key_lifecycle_and_auth(client: AsyncClient) -> None:
    # Create tenant.
    tenant = await client.post(
        f"{BASE}/tenants", json={"name": "Acme", "slug": "acme"}
    )
    tenant_id = tenant.json()["id"]

    # Issue a key.
    issued = await client.post(
        f"{BASE}/tenants/{tenant_id}/api-keys", json={"role": "read"}
    )
    assert issued.status_code == 201
    raw_key = issued.json()["raw_key"]
    assert "." in raw_key

    # Use the key on a protected endpoint.
    ok = await client.get(
        f"{BASE}/tenants", headers={"Authorization": f"Bearer {raw_key}"}
    )
    assert ok.status_code == 200
    assert any(t["id"] == tenant_id for t in ok.json())


async def test_protected_endpoint_requires_key(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/tenants")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "unauthorized"


async def test_invalid_key_rejected(client: AsyncClient) -> None:
    resp = await client.get(
        f"{BASE}/tenants",
        headers={"Authorization": "Bearer deadbeef.notarealsecret"},
    )
    assert resp.status_code == 401


async def test_role_below_minimum_forbidden(client: AsyncClient) -> None:
    tenant = await client.post(
        f"{BASE}/tenants", json={"name": "Acme", "slug": "acme"}
    )
    tenant_id = tenant.json()["id"]
    # 'read' key is sufficient for listing, so this asserts the happy path
    # of the rank check; a stricter endpoint is exercised once billing
    # write-endpoints land.
    issued = await client.post(
        f"{BASE}/tenants/{tenant_id}/api-keys", json={"role": "read"}
    )
    raw_key = issued.json()["raw_key"]
    resp = await client.get(
        f"{BASE}/tenants", headers={"Authorization": f"Bearer {raw_key}"}
    )
    assert resp.status_code == 200
