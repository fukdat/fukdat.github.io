"""Request/response schemas for the tenant domain."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.api_key import ApiKeyRole

_SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$")


class TenantCreate(BaseModel):
    """Payload to create a new tenant."""

    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=3, max_length=64)

    @field_validator("slug")
    @classmethod
    def _validate_slug(cls, value: str) -> str:
        value = value.strip().lower()
        if not _SLUG_RE.match(value):
            raise ValueError(
                "slug must be lowercase alphanumeric with internal hyphens"
            )
        return value


class TenantRead(BaseModel):
    """Public representation of a tenant."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    is_active: bool
    created_at: datetime


class ApiKeyCreate(BaseModel):
    """Payload to issue a new API key for a tenant."""

    role: ApiKeyRole = ApiKeyRole.WRITE


class ApiKeyRead(BaseModel):
    """API key metadata (never exposes the secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    prefix: str
    role: ApiKeyRole
    is_active: bool
    created_at: datetime


class ApiKeyCreated(ApiKeyRead):
    """Returned only once at creation time, including the raw key."""

    raw_key: str
