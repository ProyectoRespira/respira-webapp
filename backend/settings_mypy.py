"""Minimal Django settings used only for mypy's django-stubs plugin."""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "mypy-only-secret-key"
DEBUG = False
ALLOWED_HOSTS: list[str] = []

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "api",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

# Project-specific settings the code reads through `django.conf.settings`.
# django-stubs resolves those attributes against this module, so anything not
# shipped by Django itself has to be declared here or mypy reports it missing.
# The values are irrelevant — only the names are.
INSTITUTION_PASSWORD_RESET_URL = "/institucion/restablecer-clave"
INSTITUTION_EMAIL_LOGO_URL = "/favicon.png"
