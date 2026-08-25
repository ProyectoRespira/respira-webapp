from typing import Any, cast

import sentry_sdk
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework.exceptions import APIException
from sentry_sdk.types import Event


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
URL_KEYS = {
    "blocked-uri",
    "document-uri",
    "from",
    "referer",
    "referrer",
    "source-file",
    "to",
    "url",
}


def _is_sensitive_key(key: object) -> bool:
    return isinstance(key, str) and any(
        sensitive_key in key.lower() for sensitive_key in SENSITIVE_KEYS
    )


def _remove_query(value: str) -> str:
    return value.split("?", maxsplit=1)[0]


def _scrub_mapping(value: object, key: object | None = None) -> object:
    if isinstance(value, list):
        return [_scrub_mapping(item, key) for item in value]
    if isinstance(value, str) and key in URL_KEYS:
        return _remove_query(value)
    if not isinstance(value, dict):
        return value
    return {
        item_key: (
            "[Filtered]"
            if _is_sensitive_key(item_key)
            else _scrub_mapping(item, item_key)
        )
        for item_key, item in value.items()
    }


def before_send(event: Event, hint: dict[str, Any]) -> Event | None:
    payload = cast(dict[str, Any], event)
    exc_info = hint.get("exc_info")
    original_exception = (
        exc_info[1] if isinstance(exc_info, tuple) and len(exc_info) > 1 else None
    )
    if (
        isinstance(original_exception, APIException)
        and 400 <= (original_exception.status_code) < 500
    ):
        return None
    if isinstance(original_exception, (Http404, PermissionDenied, ValidationError)):
        return None

    request = payload.get("request")
    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        request.pop("query_string", None)
        request["headers"] = _scrub_mapping(request.get("headers", {}))
        request["url"] = _remove_query(request.get("url", ""))

    payload["extra"] = _scrub_mapping(payload.get("extra", {}))
    payload["contexts"] = _scrub_mapping(payload.get("contexts", {}))
    payload["breadcrumbs"] = _scrub_mapping(payload.get("breadcrumbs", {}))
    user = payload.get("user")
    if isinstance(user, dict):
        payload["user"] = {key: user[key] for key in ("id", "role") if key in user}
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
