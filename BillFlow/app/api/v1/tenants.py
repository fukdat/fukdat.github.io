"""Tenant management and API-key issuance endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import TenantServiceDep, require_role
from app.models.api_key import ApiKey, ApiKeyRole
from app.schemas.tenant import (
    ApiKeyCreate,
    ApiKeyCreated,
    TenantCreate,
    TenantRead,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post(
    "",
    response_model=TenantRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_tenant(
    payload: TenantCreate, service: TenantServiceDep
) -> TenantRead:
    """Provision a new tenant. Open endpoint (bootstrap/onboarding)."""
    tenant = await service.create_tenant(payload)
    return TenantRead.model_validate(tenant)


@router.get("", response_model=list[TenantRead])
async def list_tenants(
    service: TenantServiceDep,
    _: ApiKey = Depends(require_role(ApiKeyRole.READ)),
) -> list[TenantRead]:
    """List tenants. Requires a valid API key (read or higher)."""
    tenants = await service.list_tenants()
    return [TenantRead.model_validate(t) for t in tenants]


@router.post(
    "/{tenant_id}/api-keys",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
)
async def issue_api_key(
    tenant_id: str,
    payload: ApiKeyCreate,
    service: TenantServiceDep,
) -> ApiKeyCreated:
    """Issue a new API key for a tenant. The raw key is shown only here."""
    key, raw = await service.issue_api_key(tenant_id, payload.role)
    return ApiKeyCreated(
        id=key.id,
        prefix=key.prefix,
        role=key.role,
        is_active=key.is_active,
        created_at=key.created_at,
        raw_key=raw,
    )
