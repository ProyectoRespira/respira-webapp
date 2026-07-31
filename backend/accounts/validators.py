import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class ComplexityValidator:
    """Require passwords to mix character classes.

    Enforces at least one letter and one digit, plus (by default) one special
    character. Complements Django's built-in length/common-password validators.
    """

    def __init__(self, require_special: bool = True):
        self.require_special = require_special

    def validate(self, password: str, user=None) -> None:
        errors = []
        if not re.search(r"[A-Za-z]", password):
            errors.append(_("at least one letter"))
        if not re.search(r"\d", password):
            errors.append(_("at least one digit"))
        if self.require_special and not re.search(r"[^A-Za-z0-9]", password):
            errors.append(_("at least one special character"))
        if errors:
            raise ValidationError(
                _("This password must contain %(requirements)s.")
                % {"requirements": ", ".join(errors)},
                code="password_not_complex",
            )

    def get_help_text(self) -> str:
        text = _("Your password must contain at least one letter and one digit")
        if self.require_special:
            text += _(" and one special character")
        return text + "."
