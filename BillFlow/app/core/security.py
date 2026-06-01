"""API-key security primitives.

A raw key has the shape ``<prefix>.<secret>``:

* ``prefix`` is stored in clear and indexed for O(1) lookup.
* ``secret`` is never stored; only its Argon2 hash is persisted.

This lets us authenticate without hashing every row, while keeping the
secret unrecoverable if the database leaks.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

_hasher = PasswordHasher()

_PREFIX_BYTES = 6


@dataclass(frozen=True, slots=True)
class GeneratedKey:
    """A freshly minted API key.

    ``raw`` is returned to the caller exactly once; only ``prefix`` and
    ``secret_hash`` are safe to persist.
    """

    raw: str
    prefix: str
    secret_hash: str


def generate_api_key(secret_bytes: int = 32) -> GeneratedKey:
    """Create a new API key and its storable hash."""
    if secret_bytes < 16:
        raise ValueError("secret_bytes must be >= 16 for adequate entropy")
    prefix = secrets.token_hex(_PREFIX_BYTES)
    secret = secrets.token_urlsafe(secret_bytes)
    raw = f"{prefix}.{secret}"
    return GeneratedKey(raw=raw, prefix=prefix, secret_hash=_hasher.hash(secret))


def split_api_key(raw: str) -> tuple[str, str]:
    """Split a raw key into ``(prefix, secret)``.

    Raises:
        ValueError: if the key is malformed.
    """
    prefix, _, secret = raw.partition(".")
    if not prefix or not secret:
        raise ValueError("malformed API key")
    return prefix, secret


def verify_secret(secret: str, secret_hash: str) -> bool:
    """Verify a presented secret against its stored Argon2 hash.

    Returns ``False`` for any mismatch or malformed hash rather than
    raising, so callers can treat all failures uniformly.
    """
    try:
        return _hasher.verify(secret_hash, secret)
    except (VerifyMismatchError, VerificationError, ValueError):
        return False
