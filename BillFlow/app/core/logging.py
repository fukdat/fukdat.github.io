"""Structured JSON logging configuration."""

from __future__ import annotations

import logging

try:  # python-json-logger >= 3 moved the module
    from pythonjsonlogger.json import JsonFormatter
except ImportError:  # pragma: no cover - older versions
    from pythonjsonlogger.jsonlogger import (  # type: ignore[attr-defined]
        JsonFormatter,
    )

from app.core.config import get_settings

_configured = False


def configure_logging() -> None:
    """Install a JSON log formatter on the root logger (idempotent)."""
    global _configured
    if _configured:
        return

    settings = get_settings()
    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"levelname": "level", "asctime": "ts"},
        )
    )
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())
    _configured = True
