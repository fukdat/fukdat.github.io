"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed application settings.

    Values are read from environment variables or a local ``.env`` file.
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: Literal["dev", "test", "prod"] = "dev"
    log_level: str = "INFO"

    # SQLAlchemy async URL. Postgres in prod, SQLite for local/tests.
    database_url: str = Field(
        default="sqlite+aiosqlite:///./billflow.db",
        description="Async SQLAlchemy connection URL.",
    )

    # Number of random bytes used for the API-key secret.
    api_key_secret_bytes: int = 32

    # Stripe integration. When the secret key is empty, a fake gateway is used.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_api_base: str = "https://api.stripe.com"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton of application settings."""
    return Settings()
