"""Sends per-sensor push alerts to the devices following each sensor.

Meant to run on a schedule, shortly after the pipeline publishes new readings.
Kept as a management command rather than a view so it can be driven by cron or
a scheduled container job, and so a dry run is available for checking what a
real run *would* do before enabling delivery.
"""

from django.core.management.base import BaseCommand

from api.push import is_configured, send_sensor_alerts


class Command(BaseCommand):
    help = "Notify each sensor's followers when its air quality changes level."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report which stations would alert without sending anything.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run even when SENSOR_ALERTS_ENABLED is off.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Off by default so a freshly deployed environment cannot start
        # notifying real devices before somebody decides it should.
        if not dry_run and not options["force"] and not is_configured():
            self.stdout.write(
                self.style.WARNING(
                    "SENSOR_ALERTS_ENABLED is off; nothing sent. "
                    "Use --dry-run to preview or --force to override."
                )
            )
            return

        result = send_sensor_alerts(dry_run=dry_run)

        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(
            f"{prefix}{result.considered} followed station(s) read, "
            f"{result.alerted_stations} worsened, "
            f"{result.recovered_stations} improved, "
            f"{result.messages_sent} message(s) accepted, "
            f"{result.tokens_cleared} dead token(s) cleared."
        )

        for error in result.errors:
            self.stdout.write(self.style.ERROR(f"  failed: {error}"))

        if result.errors:
            # A non-zero exit so a scheduler surfaces the failure instead of
            # recording a silently partial run as a success.
            raise SystemExit(1)
