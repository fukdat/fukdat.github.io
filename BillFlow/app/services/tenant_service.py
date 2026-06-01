"""Business logic for tenants and their API keys."""

from __future__ import annotations

from app.core.config import get_settings
from app.core.errors import AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    generate_api_key,
    split_api_key,
    verify_secret,
)
from app.models.api_key import ApiKey, ApiKeyRole
from app.models.tenant import Tenant
from app.repositories.api_key_repo import ApiKeyRepository
from app.repositories.tenant_repo import TenantRepository
from app.schemas.tenant import TenantCreate


class TenantService:
    """Coordinates tenant and API-key use-cases."""

    def __init__(
        self,
        tenants: TenantRepository,
        api_keys: ApiKeyRepository,
    ) -> None:
        self._tenants = tenants
        self._api_keys = api_keys

    async def create_tenant(self, payload: TenantCreate) -> Tenant:
        existing = await self._tenants.get_by_slug(payload.slug)
        if existing is not None:
            raise ConflictError(f"tenant slug '{payload.slug}' already exists")
        tenant = Tenant(name=payload.name, slug=payload.slug)
        return await self._tenants.add(tenant)

    async def get_tenant(self, tenant_id: str) -> Tenant:
        tenant = await self._tenants.get_by_id(tenant_id)
        if tenant is None:
            raise NotFoundError(f"tenant '{tenant_id}' not found")
        return tenant

    async def list_tenants(self) -> list[Tenant]:
        return await self._tenants.list_all()

    async def issue_api_key(
        self, tenant_id: str, role: ApiKeyRole
    ) -> tuple[ApiKey, str]:
        """Create a key for a tenant. Returns the model and the raw token."""
        await self.get_tenant(tenant_id)  # ensures tenant exists
        generated = generate_api_key(get_settings().api_key_secret_bytes)
        key = ApiKey(
            tenant_id=tenant_id,
            prefix=generated.prefix,
            secret_hash=generated.secret_hash,
            role=role,
        )
        await self._api_keys.add(key)
        return key, generated.raw

    async def authenticate(self, raw_key: str) -> ApiKey:
        """Resolve and verify a raw API key.

        Raises:
            AuthenticationError: if the key is malformed, unknown,
                inactive, or its secret does not match.
        """
        try:
            prefix, secret = split_api_key(raw_key)
        except ValueError as exc:
            raise AuthenticationError("malformed API key") from exc

        key = await self._api_keys.get_by_prefix(prefix)
        if key is None or not key.is_active:
            raise AuthenticationError("invalid API key")
        if not verify_secret(secret, key.secret_hash):
            raise AuthenticationError("invalid API key")
        return key
