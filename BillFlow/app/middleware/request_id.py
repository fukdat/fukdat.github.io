"""Middleware that attaches a unique request ID to every request."""

from __future__ import annotations

import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = b"x-request-id"


class RequestIDMiddleware:
    """Ensure each request has an ``X-Request-ID`` and echo it back.

    Uses a client-supplied ID when present (for distributed tracing),
    otherwise generates one. The value is stored on ``scope`` so handlers
    and loggers can read it.
    """

    def __init__(self, app: ASGIApp) -> None:
        self._app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming = headers.get(REQUEST_ID_HEADER)
        request_id = incoming.decode() if incoming else str(uuid.uuid4())
        scope["request_id"] = request_id

        async def send_with_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers") or [])
                raw_headers.append((REQUEST_ID_HEADER, request_id.encode()))
                message["headers"] = raw_headers
            await send(message)

        await self._app(scope, receive, send_with_id)
