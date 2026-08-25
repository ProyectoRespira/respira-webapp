from typing import Any

import sentry_sdk
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework.exceptions import APIException


SENSITIVE_KEYS = {
    "authorization",
    "client_ip",
    "cookie",
    "csrfmiddlewaretoken",
    "forwarded",
    "ip_address",
    "password",
    "remote_addr",
    "secret",
    "token",
    "x-real-ip",
}


def _is_sensitive_key(key: object) -> bool:
    return isinstance(key, str) and any(
        sensitive_key in key.lower() for sensitive_key in SENSITIVE_KEYS
    )


def _scrub_mapping(value: object) -> object:
    if isinstance(value, list):
        return [_scrub_mapping(item) for item in value]
    if not isinstance(value, dict):
        return value
    return {
        key: "[Filtered]" if _is_sensitive_key(key) else _scrub_mapping(item)
        for key, item in value.items()
    }


def before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    exc_info = hint.get("exc_info")
    original_exception = (
        exc_info[1] if isinstance(exc_info, tuple) and len(exc_info) > 1 else None
    )
    if isinstance(
        original_exception,
        (APIException, Http404, PermissionDenied, ValidationError),
    ):
        return None

    request = event.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        request.pop("query_string", None)
        request["headers"] = _scrub_mapping(request.get("headers", {}))
        request["url"] = request.get("url", "").split("?", maxsplit=1)[0]

    event["extra"] = _scrub_mapping(event.get("extra", {}))
    event["contexts"] = _scrub_mapping(event.get("contexts", {}))
    event["breadcrumbs"] = _scrub_mapping(event.get("breadcrumbs", {}))
    user = event.get("user")
    if isinstance(user, dict):
        event["user"] = {key: user[key] for key in ("id", "role") if key in user}
    return event


def initialize_glitchtip(*, dsn: str, environment: str, release: str) -> None:
    if not dsn:
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=environment or None,
        release=release or None,
        send_default_pii=False,
        auto_session_tracking=False,
        traces_sample_rate=0.0,
        before_send=before_send,
    )
