"""API-key model used to authenticate tenant requests."""

from __future__ import annotations

import enum

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class ApiKeyRole(str, enum.Enum):
    """Coarse-grained permission level granted to a key."""

    ADMIN = "admin"
    WRITE = "write"
    READ = "read"


class ApiKey(UUIDMixin, TimestampMixin, Base):
    """A credential scoped to a single tenant.

    Only the Argon2 hash of the secret is stored; the ``prefix`` is kept
    in clear and uniquely indexed for fast lookup.
    """

    __tablename__ = "api_keys"

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prefix: Mapped[str] = mapped_column(
        String(32), nullable=False, unique=True, index=True
    )
    secret_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[ApiKeyRole] = mapped_column(
        Enum(ApiKeyRole, native_enum=False, length=16),
        nullable=False,
        default=ApiKeyRole.WRITE,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
