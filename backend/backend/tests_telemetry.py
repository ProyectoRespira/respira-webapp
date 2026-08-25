from types import SimpleNamespace
from unittest.mock import patch

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase
from rest_framework.exceptions import ValidationError

from .middleware import GlitchTipUserContextMiddleware
from .telemetry import before_send, initialize_glitchtip


class GlitchTipTelemetryTests(SimpleTestCase):
    def test_blank_dsn_does_not_initialize_sdk(self):
        with patch("backend.telemetry.sentry_sdk.init") as init:
            initialize_glitchtip(dsn="", environment="production", release="v1.0.0")

        init.assert_not_called()

    def test_configured_dsn_uses_privacy_minimized_options(self):
        with patch("backend.telemetry.sentry_sdk.init") as init:
            initialize_glitchtip(
                dsn="https://key@example.invalid/1",
                environment="production",
                release="v1.0.0",
            )

        init.assert_called_once_with(
            dsn="https://key@example.invalid/1",
            environment="production",
            release="v1.0.0",
            send_default_pii=False,
            auto_session_tracking=False,
            traces_sample_rate=0.0,
            before_send=before_send,
        )

    def test_before_send_scrubs_sensitive_request_and_event_data(self):
        event = {
            "request": {
                "data": {"password": "secret"},
                "cookies": {"sessionid": "cookie"},
                "query_string": "token=secret",
                "headers": {
                    "Authorization": "Bearer secret",
                    "X-Forwarded-For": "203.0.113.1",
                    "X-Real-IP": "203.0.113.1",
                    "X-Request-Id": "request-id",
                },
                "url": "https://example.invalid/api/?token=secret",
            },
            "extra": {"token": "secret", "safe": "value"},
            "breadcrumbs": {
                "values": [{"data": {"password": "secret", "safe": "value"}}]
            },
            "user": {"id": "user-id", "email": "person@example.invalid"},
        }

        scrubbed = before_send(event, {})

        self.assertIsNotNone(scrubbed)
        assert scrubbed is not None
        self.assertNotIn("data", scrubbed["request"])
        self.assertNotIn("cookies", scrubbed["request"])
        self.assertNotIn("query_string", scrubbed["request"])
        self.assertEqual(scrubbed["request"]["url"], "https://example.invalid/api/")
        self.assertEqual(scrubbed["request"]["headers"]["Authorization"], "[Filtered]")
        self.assertEqual(
            scrubbed["request"]["headers"]["X-Forwarded-For"], "[Filtered]"
        )
        self.assertEqual(scrubbed["request"]["headers"]["X-Real-IP"], "[Filtered]")
        self.assertEqual(scrubbed["request"]["headers"]["X-Request-Id"], "request-id")
        self.assertEqual(scrubbed["extra"]["token"], "[Filtered]")
        self.assertEqual(
            scrubbed["breadcrumbs"]["values"][0]["data"]["password"],
            "[Filtered]",
        )
        self.assertEqual(scrubbed["user"], {"id": "user-id"})

    def test_before_send_discards_expected_api_exception(self):
        self.assertIsNone(
            before_send({}, {"exc_info": (None, ValidationError(), None)})
        )

    def test_middleware_sets_only_stable_user_id_and_role(self):
        request = RequestFactory().get("/api/health/")
        request.user = SimpleNamespace(
            is_authenticated=True,
            pk="user-id",
            role_id=1,
            role=SimpleNamespace(slug="admin"),
        )
        middleware = GlitchTipUserContextMiddleware(lambda _: HttpResponse())

        with patch("backend.middleware.sentry_sdk.set_user") as set_user:
            response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set_user.call_args_list[0].args,
            ({"id": "user-id", "role": "admin"},),
        )
        self.assertEqual(set_user.call_args_list[-1].args, (None,))
