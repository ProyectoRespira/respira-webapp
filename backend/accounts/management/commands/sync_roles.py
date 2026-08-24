from django.core.management.base import BaseCommand

from accounts.permissions import ROLE_GROUP_PERMISSIONS, sync_role_groups


class Command(BaseCommand):
    help = "Create/refresh the auth Groups and permissions for each admin role."

    def handle(self, *args, **options):
        sync_role_groups()
        self.stdout.write(
            self.style.SUCCESS(
                f"Synced {len(ROLE_GROUP_PERMISSIONS)} role groups with permissions."
            )
        )
