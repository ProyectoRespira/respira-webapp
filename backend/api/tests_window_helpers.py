"""Shared test helper: take the notification window out of the picture.

Alert delivery is confined to :class:`~api.models.PushNotificationWindow`, so
any test that asserts "a notification was sent" now depends on the wall clock
unless it says otherwise. Left alone, the whole alerting suite would pass
during the day and fail overnight — and CI runs on UTC, where the small hours
in Asunción are ordinary working hours in the container.

`UnrestrictedWindowMixin` is for the suites that are about *something else* —
who gets notified, what the payload says, how failures are retried. They
predate the window and their assertions are still exactly right; they just
should not be re-litigating what hour it is.

Tests that are about the window itself belong in tests_notification_window.py,
which stops the clock deliberately instead.
"""

from .models import PushNotificationWindow


class UnrestrictedWindowMixin:
    """Disables the delivery window for the length of each test.

    Hooked on ``_pre_setup`` rather than ``setUp`` deliberately. Django calls
    ``_pre_setup`` itself, before ``setUp``, so this applies even to the many
    existing suites whose ``setUp`` does not call ``super().setUp()`` — with a
    ``setUp`` override the mixin would be silently skipped in exactly those
    classes, which is the bug this comment exists to prevent recurring. It also
    lands after the test database is reset, so the row it writes is inside the
    test's own transaction and rolls back with it.

    ``is_enabled=False`` rather than a 00:00–23:59 window, because that is the
    switch an operator has too — the tests then exercise a configuration that
    really exists rather than one contrived to be always-open.
    """

    def _pre_setup(self):
        super()._pre_setup()
        window = PushNotificationWindow.current()
        window.is_enabled = False
        window.save(update_fields=["is_enabled", "updated_at"])
