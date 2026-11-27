"""First access to the institutional dashboard: the invitation email.

A user given dashboard access is created without a password of their own
(``set_unusable_password``) and chooses one through a signed link. This module
is the one place that builds and sends that link, so every way of granting
access — the Django Admin (creating the user, and the action on Institution),
the self-service ``POST /api/auth/activate/`` below, "¿Olvidaste tu
contraseña?" for someone who never chose a password, and later the panel's
Team API and the Admin's bulk import — sends the same message with the same
token.

Deliberately not built on ``PasswordResetForm.save()``: that form only ever
finds *active users with a usable password*, which is exactly the set an
invitee is not in, so an invitation sent through it would silently go nowhere.
The token is still Django's own ``default_token_generator``, which is what lets
the existing ``password-reset/confirm`` endpoint consume an invitation link
unchanged: an unusable password hashes into the token like any other, and
choosing a password invalidates the link.
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.http import HttpRequest
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Institution, get_institution_for_user

logger = logging.getLogger(__name__)

User = get_user_model()

# The query parameter that switches `/institucion/restablecer-clave` from
# "choose a new password" to "create your password". Same page, same submit
# (`password-reset/confirm`); only the copy changes. Kept in step with
# `frontend/src/pages/institucion/restablecer-clave.astro`.
CREATE_MODE_PARAM = "modo"
CREATE_MODE_VALUE = "crear"

SUBJECT_TEMPLATE = "institution/invitation_subject.txt"
TEXT_TEMPLATE = "institution/invitation_email.txt"
HTML_TEMPLATE = "institution/invitation_email.html"


def _absolute_for_email(request: HttpRequest, configured: str) -> str:
    """Resolves a configured path (or URL) against the request being served.

    Same rule as the password-reset email in ``api.views``: a path takes its
    scheme and host from the request, so the link points at whichever
    environment the request came through; an absolute URL in the setting wins.
    """
    if configured.startswith(("http://", "https://")):
        return configured.rstrip("/")
    return request.build_absolute_uri(configured).rstrip("/")


def awaits_first_password(user) -> bool:
    """Whether ``user`` is someone the invitation is for.

    An active account linked to an institution that has never chosen a
    password. An account that already has one is a password *reset*, not an
    invitation — that flow has its own endpoint and its own wording.

    "Never chose one" is read as *no usable password and never signed in*.
    The unusable password alone is not enough: the Admin's "Change password"
    page can also disable password-based authentication on an existing
    account, and an operator doing that to someone who uses the dashboard is
    taking their access away. Since the anonymous endpoints here re-send the
    invitation on request, counting that account as pending would hand a
    working create-password link to whoever reads its mailbox. Signing in is
    only possible with a password, so ``last_login`` tells the two apart
    without a column of its own; the one case it cannot is an account whose
    password was disabled before its first sign-in, which is why the Admin
    says to revoke access with "Active" or by removing the institution link.
    """
    return (
        user.is_active
        and not user.has_usable_password()
        and user.last_login is None
        and get_institution_for_user(user) is not None
    )


def invitation_url(request: HttpRequest, user) -> str:
    """The signed "create your password" link for ``user``.

    ``modo`` goes first so the link still ends in ``uid=…&token=…``, the same
    tail as a reset link — what the frontend and the tests already parse.
    """
    base = _absolute_for_email(request, settings.INSTITUTION_PASSWORD_RESET_URL)
    query = urlencode(
        {
            CREATE_MODE_PARAM: CREATE_MODE_VALUE,
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
    )
    return f"{base}?{query}"


def send_institution_invitation(
    user,
    institution: Institution | None = None,
    *,
    request: HttpRequest,
) -> None:
    """Emails ``user`` a link to create their dashboard password.

    ``institution`` defaults to the one ``user`` is linked to; callers that
    already hold it (the Admin action iterates institutions) pass it to skip
    the lookup. ``request`` is what the link and the logo resolve against.

    Does not check ``awaits_first_password`` itself: the caller decides who is
    invited (the activation endpoint and the Admin action filter on it; an
    operator re-inviting someone is a caller's choice). Mail errors propagate,
    so a caller that must not reveal them (the activation endpoint) has to
    catch them.
    """
    if institution is None:
        institution = get_institution_for_user(user)
    if institution is None:
        raise ValueError("Only a user linked to an institution can be invited.")

    context = {
        "email": user.email,
        "institution_name": str(institution),
        "invitation_url": invitation_url(request, user),
        # Remote image: fetched by the recipient's mail client, so it has to
        # resolve to the public site.
        "logo_url": _absolute_for_email(request, settings.INSTITUTION_EMAIL_LOGO_URL),
        "timeout_hours": settings.PASSWORD_RESET_TIMEOUT // 3600,
    }

    # A header cannot hold a newline, which a template easily ends with.
    subject = "".join(render_to_string(SUBJECT_TEMPLATE, context).splitlines())
    message = EmailMultiAlternatives(
        subject=subject,
        body=render_to_string(TEXT_TEMPLATE, context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    # Multipart, like the reset email: the plain-text body stays the fallback
    # (HTML off, spam filters) and both parts carry the same link.
    message.attach_alternative(render_to_string(HTML_TEMPLATE, context), "text/html")
    message.send()


def invite_pending_users(email: str, *, request: HttpRequest) -> None:
    """Sends the invitation to whoever behind ``email`` awaits a first password.

    The lookup an anonymous caller triggers by typing an address: "¿Sos nuevo
    en la plataforma?" and, for an invitee, "¿Olvidaste tu contraseña?" (see
    ``InstitutionViewSet.password_reset``). Says nothing about the outcome and
    swallows mail errors, so the caller can answer the same whether the
    address is registered, pending, or unknown.
    """
    # `iexact`, like `PasswordResetForm.get_users`: people type their address
    # with whatever capitalisation they remember.
    candidates = User.objects.filter(email__iexact=email).select_related(
        "institution_user__institution"
    )
    for user in candidates:
        if not awaits_first_password(user):
            continue
        try:
            send_institution_invitation(user, request=request)
        except Exception:
            # A failed send must answer like every other case: a 500 only for
            # addresses that exist would be an account oracle.
            logger.exception("Failed to send the dashboard invitation email")


class InstitutionActivateSerializer(serializers.Serializer):
    """The address a "create your password" link was asked for.

    Validates the shape only. Whether it belongs to anybody is decided in the
    view, which answers the same either way.
    """

    email = serializers.EmailField()


@extend_schema(tags=["Institutional Dashboard"])
class InstitutionActivateView(APIView):
    """``POST /api/auth/activate/`` — "¿Sos nuevo en la plataforma?".

    The self-service way to (re)receive the invitation: an operator gave the
    address dashboard access, the person never chose a password (or let the
    first link expire), and asks for a new link from the login page.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account_activation"

    @extend_schema(
        summary="Request a link to create the dashboard password",
        description=(
            "Sends the invitation email — a signed, time-limited link "
            "(`PASSWORD_RESET_TIMEOUT`) to create a password — when the "
            "address belongs to an active dashboard user who has not chosen "
            "a password yet (and so has never signed in: an account whose "
            "password an operator disabled is not re-invited). Nothing is "
            "sent otherwise, and no account is "
            "ever created here. Always answers 204, whether or not anything "
            "was sent, so the endpoint cannot be used to find out which "
            "addresses are registered. Rate limited per client IP."
        ),
        request=InstitutionActivateSerializer,
        responses={204: None},
    )
    def post(self, request, *args, **kwargs):
        serializer = InstitutionActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invite_pending_users(serializer.validated_data["email"], request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)
