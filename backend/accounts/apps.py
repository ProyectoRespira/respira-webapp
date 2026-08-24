from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "Accounts"

    def ready(self) -> None:
        # Connect signals that keep user group membership in sync with roles.
        from . import signals  # noqa: F401
