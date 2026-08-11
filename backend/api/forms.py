from django import forms


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
