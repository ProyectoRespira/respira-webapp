"""backend URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path, include

# Password recovery for backoffice (admin/staff) accounts.
#
# Django ships the views but does not route them: `admin.site.urls` only wires
# *password change*, so without these four entries `admin_password_reset` does
# not resolve and the admin login template hides its "Forgotten your password?"
# link (the template renders it behind `{% url 'admin_password_reset' %}`).
# Registering the name is therefore all that is needed to surface the link.
#
# Every path lives under `admin/` deliberately: the reverse proxy only forwards
# `/admin/`, `/api/` and `/static/` to Django (see proxy/nginx.conf.template),
# so a reset link at the project root — Django's documented `reset/<uidb64>/…` —
# would be handed to the Astro frontend and 404. Institutional users get their
# own reset flow through the API instead (api.views.InstitutionViewSet).
admin_password_reset_patterns = [
    path(
        "admin/password_reset/",
        # The email's domain comes from the request (django.contrib.sites is not
        # installed, so `get_current_site` falls back to `RequestSite`), which is
        # what keeps the link pointing at whichever environment was used.
        auth_views.PasswordResetView.as_view(),
        name="admin_password_reset",
    ),
    path(
        "admin/password_reset/done/",
        auth_views.PasswordResetDoneView.as_view(),
        name="password_reset_done",
    ),
    path(
        "admin/reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "admin/reset/done/",
        auth_views.PasswordResetCompleteView.as_view(),
        name="password_reset_complete",
    ),
]

urlpatterns = [
    # Ahead of `admin.site.urls`: that entry matches the whole `admin/` prefix,
    # and an unmatched sub-path under it raises the admin's own 404 rather than
    # falling through to a later pattern.
    *admin_password_reset_patterns,
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
