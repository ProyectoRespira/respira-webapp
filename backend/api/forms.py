from django import forms

from .models import Institution, InstitutionAlertRule, PushBroadcast, Stations


class InstitutionAlertRuleForm(forms.ModelForm):
    """Offers only the sensor that belongs to the chosen institution.

    ``InstitutionContract.station`` is a ``OneToOneField``, so an institution
    has exactly one sensor under contract. A picker listing every station on
    the platform therefore offers one right answer and many wrong ones, and
    each wrong one configures an institution's wording onto somebody else's
    sensor — visible only when the wrong followers receive it.

    The narrowing happens in two places, because they cover different moments:

    * ``__init__`` narrows the queryset to whatever institution the form
      already knows about — the one being edited, or the one just posted. This
      is what the browser renders, and what a posted value is validated
      against, so a station outside it is rejected by the field itself.
    * ``clean`` fills the field in when it was left blank, since there is only
      ever one valid choice and making the operator select it adds nothing.

    A JavaScript companion (``institution_alert_rule.js``) repopulates the
    select as soon as the institution changes, so the narrowing is visible
    before saving rather than only enforced on submit. It is a convenience:
    with scripting off, the server-side rules above still hold.
    """

    class Meta:
        model = InstitutionAlertRule
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        institution = self._known_institution()
        if institution is None:
            # No institution chosen yet: an empty list says "pick one first"
            # rather than inviting a choice that would have to be rejected.
            self.fields["station"].queryset = Stations.objects.none()
        else:
            self.fields["station"].queryset = Stations.objects.filter(
                institution_contract__institution=institution
            )
        self.fields["station"].required = False
        self.fields[
            "station"
        ].help_text = "The sensor under contract to the selected institution."

    def _known_institution(self):
        """The institution this form is about, from the POST or the instance.

        Reads the raw posted value rather than ``cleaned_data``: ``__init__``
        runs before validation, and the queryset it sets is what that
        validation then checks the posted station against.
        """
        if self.data:
            raw = self.data.get(self.add_prefix("institution"))
            if raw:
                return Institution.objects.filter(pk=raw).first()
        return getattr(self.instance, "institution", None)

    def clean(self):
        cleaned = super().clean()
        institution = cleaned.get("institution")
        if institution is None:
            # Already reported as a required-field error; a second message
            # about the station it would have resolved is just noise.
            return cleaned

        contract = getattr(institution, "contract", None)
        if contract is None or contract.station_id is None:
            raise forms.ValidationError(
                {
                    "institution": (
                        "This institution has no sensor under contract, so "
                        "there is nothing to alert about. Add an institution "
                        "contract first."
                    )
                }
            )

        # Blank is the ordinary case with scripting off, and the only valid
        # answer is the contracted sensor either way.
        if cleaned.get("station") is None:
            cleaned["station"] = contract.station
            self.instance.station = contract.station
        return cleaned


def institution_stations(institution):
    """The stations one institution may be notified about, newest naming first.

    A queryset rather than a single station even though
    ``InstitutionContract.station`` is currently OneToOne, so an institution
    has at most one. The picker and its lookup are written against *the set*
    because that is the promise being made — an institution's notifications go
    to an institution's sensors — and a contract that grows to several stations
    then needs no change here.
    """
    return Stations.objects.filter(
        institution_contract__institution=institution
    ).order_by("name")


def _station_choices(stations):
    """Select options for a station queryset, with the usual empty choice.

    The empty label doubles as the explanation when an institution has nothing
    under contract, so the operator reads why the list is short rather than
    meeting a blank select.
    """
    options = [(station.pk, station.name) for station in stations]
    empty = "---------" if options else "(no sensor under contract)"
    return [("", empty), *options]


class PushBroadcastForm(forms.Form):
    """The manual notification an operator composes on the confirmation page.

    A plain ``Form``, not a ``ModelForm``: the ``PushBroadcast`` row is the
    record that a send was *attempted*, so it is created at send time rather
    than existing as an editable draft that could be submitted twice.

    ``scope`` decides which of ``institution`` / ``station`` is required, and
    the two are enforced independently of how they are shown: a JavaScript
    companion hides the field a scope has no use for, and ``clean`` rejects a
    missing one regardless. Hiding alone would be no constraint at all — with
    scripting off every field is visible — and validating alone would leave an
    operator picking a sensor for a send that ignores it.

    The station picker narrows to the chosen institution's own sensors, for the
    same reason ``InstitutionAlertRuleForm`` does: a list of every station on
    the platform offers one right answer and many wrong ones, and each wrong
    one sends an institution's announcement to somebody else's followers —
    a push that cannot be recalled, and is visible only to the people who
    should never have received it.

    Narrowing only applies once an institution is chosen. With none, the field
    keeps every station, because a station-scoped send is also how an outage on
    a public sensor under no contract at all — FIUNA, AireLibre, MADES — is
    announced to the people following it.

    Unlike ``InstitutionAlertRuleForm``, the narrowing here is *not* imposed on
    the field's queryset for validation, only for what the select renders. The
    scope decides whether the pairing matters at all — ``ALL`` deliberately
    discards a leftover institution *and* station — and a field-level queryset
    would reject the pair before ``clean`` ever learns the scope. So the
    boundary is enforced in ``clean``, which also lets the refusal name the
    mismatch instead of emitting "not one of the available choices".
    """

    scope = forms.ChoiceField(
        choices=PushBroadcast.SCOPE_CHOICES,
        label="Recipients",
        help_text="Who receives this notification.",
    )
    institution = forms.ModelChoiceField(
        queryset=Institution.objects.order_by("legal_name"),
        required=False,
        help_text=(
            "Whose followers to notify. Choosing one also narrows the sensor "
            "list below to that institution's own sensors."
        ),
    )
    station = forms.ModelChoiceField(
        queryset=Stations.objects.order_by("name"),
        required=False,
        label="Sensor",
        help_text="The sensor whose followers to notify.",
    )
    push_title = forms.CharField(
        max_length=100,
        label="Title",
        help_text="Shown in bold on the device.",
    )
    push_body = forms.CharField(
        max_length=500,
        label="Message",
        widget=forms.Textarea(attrs={"rows": 4, "cols": 60}),
        help_text="The notification body. Plain text — no {station} substitution here.",
    )

    class Media:
        # Repopulates the station select when the institution changes, so the
        # narrowing is visible while composing rather than only enforced on
        # submit. Progressive enhancement: the rules below hold without it.
        js = ("admin/js/push_broadcast_compose.js",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        institution = self._posted_institution()
        if institution is not None:
            # Only what the widget renders, so a redisplay after a validation
            # error shows the narrowed list the operator should have seen. The
            # field still accepts any station; `clean` is what judges the pair,
            # because only it knows the scope.
            self.fields["station"].widget.choices = _station_choices(
                institution_stations(institution)
            )

    def _posted_institution(self):
        """The institution this submission is about, read from the raw POST.

        ``__init__`` runs before validation, so ``cleaned_data`` does not exist
        yet. A GET has no data at all and leaves the full list, which is what
        the composer opens with.
        """
        if not self.data:
            return None
        raw = self.data.get(self.add_prefix("institution"))
        if not raw:
            return None
        return Institution.objects.filter(pk=raw).first()

    def clean(self):
        cleaned = super().clean()
        scope = cleaned.get("scope")

        if scope == PushBroadcast.SCOPE_STATION and not cleaned.get("station"):
            raise forms.ValidationError(
                {"station": "Choose the sensor whose followers should be notified."}
            )
        if scope == PushBroadcast.SCOPE_INSTITUTION and not cleaned.get("institution"):
            raise forms.ValidationError(
                {"institution": "Choose the institution whose followers to notify."}
            )
        if scope == PushBroadcast.SCOPE_ALL:
            # Cleared rather than rejected: a selection left over from switching
            # scope must not quietly narrow a send meant for every user. This is
            # also what "All users needs no institution or sensor" amounts to in
            # practice — a leftover pair is discarded, never demanded.
            cleaned["institution"] = None
            cleaned["station"] = None
            return cleaned

        if scope == PushBroadcast.SCOPE_INSTITUTION:
            # Same reasoning, one field along: this scope derives its audience
            # from the institution's contracts, so a sensor left selected from
            # before the scope changed had no part in choosing the recipients.
            # Storing it anyway would leave the log naming a sensor that did
            # not determine who was notified — and the companion script hides
            # this field here, so the browser posts a value the operator can no
            # longer see.
            cleaned["station"] = None
            return cleaned

        self._reject_foreign_station(cleaned)
        return cleaned

    def _reject_foreign_station(self, cleaned):
        """Refuses a station that belongs to somebody other than the institution.

        This is the actual enforcement, not a second line of defence: the
        narrowing in ``__init__`` only shapes the select, so a posted pair — a
        hand-edited POST, a stale page, scripting off — is judged here. Running
        after the ``ALL`` branch has returned is what lets that scope keep
        discarding a leftover pair instead of erroring on it.

        An institution with no station under contract is caught by the same
        check: a station-scoped send for it can only name somebody else's
        sensor.
        """
        institution = cleaned.get("institution")
        station = cleaned.get("station")
        if institution is None or station is None:
            return

        if not institution_stations(institution).filter(pk=station.pk).exists():
            self.add_error(
                "station",
                f"{station.name} does not belong to {institution}. An "
                "institution's notification can only go to its own sensors.",
            )


class StationStatusOverrideForm(forms.Form):
    """Reason captured on the activate/deactivate confirmation page.

    The note is what tells the next operator *why* a station was turned off, so
    it is required here even though ``StationOverride.note`` stays optional at
    the model level — an override can also be created by hand for other fields.
    """

    note = forms.CharField(
        label="Reason",
        widget=forms.Textarea(attrs={"rows": 4, "cols": 60}),
        help_text="Why this station is being activated or deactivated.",
        strip=True,
    )
