from collections.abc import Callable
from typing import Protocol, cast

import sentry_sdk
from django.http import HttpRequest, HttpResponse


class TelemetryRole(Protocol):
    slug: str


class TelemetryUser(Protocol):
    is_authenticated: bool
    pk: object
    role_id: int | None
    role: TelemetryRole


class GlitchTipUserContextMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        user = cast(TelemetryUser, request.user)
        if user.is_authenticated:
            sentry_sdk.set_user(
                {
                    "id": str(user.pk),
                    "role": user.role.slug if user.role_id else None,
                }
            )

        try:
            return self.get_response(request)
        finally:
            sentry_sdk.set_user(None)
