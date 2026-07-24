import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Create a superuser from BACKEND_SUPERUSER_EMAIL / "
        "BACKEND_SUPERUSER_PASSWORD if it does not exist yet. Idempotent and "
        "safe to run on every deploy: an existing account is left untouched "
        "(its password is never reset). No-op when the env vars are unset."
    )

    def handle(self, *args, **options):
        email = (os.getenv("BACKEND_SUPERUSER_EMAIL") or "").strip()
        password = os.getenv("BACKEND_SUPERUSER_PASSWORD") or ""

        if not email or not password:
            self.stdout.write(
                "BACKEND_SUPERUSER_EMAIL / BACKEND_SUPERUSER_PASSWORD not set; "
                "skipping superuser bootstrap."
            )
            return

        User = get_user_model()
        email = User.objects.normalize_email(email)

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                f"Superuser {email} already exists; leaving it unchanged."
            )
            return

        User.objects.create_superuser(email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Created superuser {email}."))
