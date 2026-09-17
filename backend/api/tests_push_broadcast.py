"""Tests for the manual push broadcasts (api.push, api.forms).

The properties worth holding onto: a broadcast reaches exactly the audience its
scope names and nobody else, somebody following several of an institution's
sensors receives it once rather than once per sensor, and a platform-wide send
is gated behind a permission of its own.
"""

from datetime import date
from unittest.mock import patch

import requests
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase, override_settings
from django.urls import reverse

from .forms import PushBroadcastForm
from .models import (
    DeviceFollower,
    DeviceInstallation,
    Institution,
    InstitutionContract,
    PushBroadcast,
    Regions,
    Stations,
)
from .push import broadcast_tokens, send_broadcast

User = get_user_model()

INSTALLATION_A = "8f14e45f-ceea-467e-bd97-1a2b3c4d5e6f"
INSTALLATION_B = "2c1f9b4a-77d3-4e21-9a5c-6b0e8d3f1a2b"
INSTALLATION_C = "5d2e7a13-90bc-4f88-a1e3-7c4d9b6e2f01"


def ok_tickets(messages):
    return [{"status": "ok", "id": f"tk-{i}"} for i in range(len(messages))]


class Capture:
    def __init__(self):
        self.messages: list[dict] = []

    def __call__(self, messages):
        self.messages.extend(messages)
        return ok_tickets(messages)

    def recipients(self) -> list[str]:
        return sorted(message["to"] for message in self.messages)


class BroadcastAudienceTests(TestCase):
    """Who a broadcast reaches, which is the property that matters most."""

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station_a = Stations.seed_for_tests(
            name="Colegio — patio",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )
        self.station_b = Stations.seed_for_tests(
            name="Colegio — aula",
            region=self.region,
            station_code="RSP-002",
            is_station_on=True,
        )
        self.unrelated = Stations.seed_for_tests(
            name="Otra institución",
            region=self.region,
            station_code="RSP-003",
            is_station_on=True,
        )
        self.institution = Institution.objects.create(legal_name="Colegio San José")
        # Only `station_a` is under contract; `station_b` is deliberately left
        # out so institution scope is proven to follow contracts, not names.
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.station_a,
            start_date=date(2026, 1, 1),
        )

    def _follower(self, installation_id, token, *station_codes):
        installation, _ = DeviceInstallation.register(installation_id, push_token=token)
        for code in station_codes:
            DeviceFollower.objects.create(installation=installation, station_code=code)
        return installation

    def _broadcast(self, scope, **kwargs):
        return PushBroadcast.objects.create(
            scope=scope, push_title="Aviso", push_body="Mensaje.", **kwargs
        )

    def test_station_scope_reaches_only_that_station(self):
        self._follower(INSTALLATION_A, "token-a", "RSP-001")
        self._follower(INSTALLATION_B, "token-b", "RSP-003")

        broadcast = self._broadcast(PushBroadcast.SCOPE_STATION, station=self.station_a)
        self.assertEqual(broadcast_tokens(broadcast), ["token-a"])

    def test_institution_scope_follows_the_contract(self):
        self._follower(INSTALLATION_A, "token-a", "RSP-001")
        # Follows a station of the same institution by name only — no contract,
        # so it is not part of the institution's audience.
        self._follower(INSTALLATION_B, "token-b", "RSP-002")

        broadcast = self._broadcast(
            PushBroadcast.SCOPE_INSTITUTION, institution=self.institution
        )
        self.assertEqual(broadcast_tokens(broadcast), ["token-a"])

    def test_a_device_following_several_stations_is_listed_once(self):
        # The reason deduplication exists: one person, one announcement.
        InstitutionContract.objects.create(
            institution=Institution.objects.create(legal_name="Otra"),
            station=self.station_b,
            start_date=date(2026, 1, 1),
        )
        self._follower(INSTALLATION_A, "token-a", "RSP-001", "RSP-002", "RSP-003")

        broadcast = self._broadcast(PushBroadcast.SCOPE_ALL)
        self.assertEqual(broadcast_tokens(broadcast), ["token-a"])

    def test_all_scope_reaches_every_follower(self):
        self._follower(INSTALLATION_A, "token-a", "RSP-001")
        self._follower(INSTALLATION_B, "token-b", "RSP-003")

        broadcast = self._broadcast(PushBroadcast.SCOPE_ALL)
        self.assertEqual(sorted(broadcast_tokens(broadcast)), ["token-a", "token-b"])

    def test_an_installation_following_nothing_is_not_reached(self):
        # Registered the app but never followed a sensor: no relationship to
        # any station, so a platform announcement is not theirs to receive.
        DeviceInstallation.register(INSTALLATION_C, push_token="token-c")
        self._follower(INSTALLATION_A, "token-a", "RSP-001")

        broadcast = self._broadcast(PushBroadcast.SCOPE_ALL)
        self.assertEqual(broadcast_tokens(broadcast), ["token-a"])

    def test_an_installation_without_a_token_is_skipped(self):
        self._follower(INSTALLATION_A, "", "RSP-001")

        broadcast = self._broadcast(PushBroadcast.SCOPE_STATION, station=self.station_a)
        self.assertEqual(broadcast_tokens(broadcast), [])


class SendBroadcastTests(TestCase):
    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Colegio San José",
            region=self.region,
            station_code="RSP-001",
            is_station_on=True,
        )

    def _follower(self, installation_id, token):
        installation, _ = DeviceInstallation.register(installation_id, push_token=token)
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")
        return installation

    def _broadcast(self, **kwargs):
        return PushBroadcast.objects.create(
            scope=PushBroadcast.SCOPE_STATION,
            station=self.station,
            push_title=kwargs.pop("push_title", "No hay clases"),
            push_body=kwargs.pop("push_body", "Mañana no hay clases."),
            **kwargs,
        )

    def test_the_composed_text_is_what_is_sent(self):
        self._follower(INSTALLATION_A, "token-a")
        broadcast = self._broadcast(
            push_title="Mantenimiento", push_body="El sensor estará fuera de línea."
        )

        capture = Capture()
        with patch("api.push._post_batch", capture):
            send_broadcast(broadcast)

        self.assertEqual(capture.messages[0]["title"], "Mantenimiento")
        self.assertEqual(
            capture.messages[0]["body"], "El sensor estará fuera de línea."
        )

    def test_the_payload_uses_a_type_the_app_already_understands(self):
        # Regression: a `broadcast` type was silently suppressed in the
        # foreground, because the app maps any type it does not recognise to
        # `unknown` and declines to present it. `forecast` is a type the
        # shipped app knows, so the announcement is actually shown.
        #
        # Not `sensor_alert`, which would route a tap to a single station's
        # screen that an announcement may not be about.
        self._follower(INSTALLATION_A, "token-a")
        broadcast = self._broadcast()

        capture = Capture()
        with patch("api.push._post_batch", capture):
            send_broadcast(broadcast)

        data = capture.messages[0]["data"]
        self.assertEqual(data["screen"], "forecast")
        # The app reads `screen` only when there is no `type` at all, so
        # setting one — even "forecast" — puts the payload back in the
        # suppressed `unknown` branch.
        self.assertNotIn("type", data)

    def test_the_delivery_count_is_recorded(self):
        self._follower(INSTALLATION_A, "token-a")
        self._follower(INSTALLATION_B, "token-b")
        broadcast = self._broadcast()

        with patch("api.push._post_batch", Capture()):
            send_broadcast(broadcast)

        broadcast.refresh_from_db()
        self.assertEqual(broadcast.recipients, 2)
        self.assertEqual(broadcast.failures, 0)

    def test_a_dead_token_is_cleared_without_failing_the_send(self):
        self._follower(INSTALLATION_A, "token-a")
        self._follower(INSTALLATION_B, "token-b")
        broadcast = self._broadcast()

        def one_dead(messages):
            return [
                {"status": "ok", "id": "tk-0"},
                {
                    "status": "error",
                    "message": "gone",
                    "details": {"error": "DeviceNotRegistered"},
                },
            ]

        with patch("api.push._post_batch", one_dead):
            delivery = send_broadcast(broadcast)

        self.assertEqual(delivery.accepted, 1)
        self.assertEqual(delivery.cleared, 1)

    def test_a_network_failure_is_recorded_rather_than_raised(self):
        # Raising would lose the batches already delivered, and retrying the
        # whole broadcast would re-notify everyone the first attempt reached.
        self._follower(INSTALLATION_A, "token-a")
        broadcast = self._broadcast()

        def down(messages):
            raise requests.RequestException("connection reset")

        with patch("api.push._post_batch", down):
            delivery = send_broadcast(broadcast)

        self.assertEqual(delivery.accepted, 0)
        self.assertEqual(delivery.retriable_failures, 1)
        broadcast.refresh_from_db()
        self.assertEqual(broadcast.failures, 1)

    def test_an_audience_of_nobody_sends_nothing(self):
        broadcast = self._broadcast()

        capture = Capture()
        with patch("api.push._post_batch", capture):
            delivery = send_broadcast(broadcast)

        self.assertEqual(capture.messages, [])
        self.assertEqual(delivery.accepted, 0)


class PushBroadcastFormTests(TestCase):
    """What a leftover selection does when the scope no longer uses it.

    Which field each scope *requires* is covered by
    `RecipientFieldRelevanceTests`; this is the other half — what happens to a
    value the operator chose before switching scope.
    """

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Colegio", region=self.region, station_code="RSP-001"
        )
        self.institution = Institution.objects.create(legal_name="Colegio San José")

    def _data(self, **kwargs):
        return {"push_title": "Aviso", "push_body": "Mensaje.", **kwargs}

    def test_all_scope_discards_a_leftover_selection(self):
        # Switching to "All users" must not quietly narrow the send to whatever
        # was selected beforehand — the recipients would then be neither what
        # the label says nor what the operator last picked on purpose.
        form = PushBroadcastForm(
            self._data(
                scope=PushBroadcast.SCOPE_ALL,
                station=self.station.pk,
                institution=self.institution.pk,
            )
        )
        self.assertTrue(form.is_valid())
        self.assertIsNone(form.cleaned_data["station"])
        self.assertIsNone(form.cleaned_data["institution"])

    def test_an_institution_send_discards_a_leftover_sensor(self):
        """Its audience comes from the contract, so a stray sensor is dropped.

        Regression: the row used to store whatever sensor was still selected,
        leaving the log naming a sensor that had no part in choosing the
        recipients. The hiding makes it worse, not better — a hidden select is
        still posted, so the operator cannot see the value being recorded.
        """
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.station,
            start_date=date(2026, 1, 1),
        )
        form = PushBroadcastForm(
            self._data(
                scope=PushBroadcast.SCOPE_INSTITUTION,
                institution=self.institution.pk,
                station=self.station.pk,
            )
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["institution"], self.institution)
        self.assertIsNone(form.cleaned_data["station"])


class RecipientOptionsTests(TestCase):
    """The three recipient scopes, and that the labels say who receives them.

    The wording is the feature here: an operator picks recipients from these
    labels alone, and a push sent to the wrong audience cannot be recalled.
    "All of an institution's stations" named stations when the recipients are
    people, so it was read as the institution's own staff.
    """

    def test_exactly_three_recipient_options_are_offered(self):
        self.assertEqual(len(PushBroadcast.SCOPE_CHOICES), 3)

    def test_the_labels_name_the_recipients(self):
        self.assertEqual(
            dict(PushBroadcast.SCOPE_CHOICES),
            {
                PushBroadcast.SCOPE_ALL: "All users",
                PushBroadcast.SCOPE_STATION: "Followers of a specific sensor",
                PushBroadcast.SCOPE_INSTITUTION: "Followers of an institution",
            },
        )

    def test_the_widest_audience_is_listed_first(self):
        # So notifying everybody is a deliberate choice rather than the option
        # an operator lands on by leaving the select alone.
        first_value, _ = PushBroadcast.SCOPE_CHOICES[0]
        self.assertEqual(first_value, PushBroadcast.SCOPE_ALL)

    def test_the_stored_values_did_not_change(self):
        """Rewording must not orphan the broadcasts already logged.

        `scope` is a plain CharField, so a renamed value would leave existing
        rows holding a string the model no longer knows — rendering blank in
        the log and matching no filter.
        """
        self.assertEqual(
            sorted(value for value, _ in PushBroadcast.SCOPE_CHOICES),
            ["all", "institution", "station"],
        )

    def test_an_existing_row_still_renders_its_label(self):
        region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        station = Stations.seed_for_tests(
            name="Colegio", region=region, station_code="RSP-001"
        )
        broadcast = PushBroadcast.objects.create(
            scope=PushBroadcast.SCOPE_STATION,
            station=station,
            push_title="Aviso",
            push_body="Mensaje.",
        )
        self.assertEqual(
            broadcast.get_scope_display(), "Followers of a specific sensor"
        )

    def test_the_form_offers_the_same_three_options(self):
        form = PushBroadcastForm()
        self.assertEqual(
            [value for value, _ in form.fields["scope"].choices],
            ["all", "station", "institution"],
        )


class RecipientFieldRelevanceTests(TestCase):
    """Only the field a scope uses is asked for — and only it is required.

    The hiding itself is done by `push_broadcast_compose.js`; what is pinned
    here is the half that holds with scripting off, which is the half that
    decides whether a send goes out.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            "operator", password="x", is_staff=True, is_superuser=True
        )
        self.client.force_login(self.user)

        region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Colegio", region=region, station_code="RSP-001"
        )
        self.institution = Institution.objects.create(legal_name="Colegio San José")
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.station,
            start_date=date(2026, 1, 1),
        )

    def _data(self, **kwargs):
        return {"push_title": "Aviso", "push_body": "Mensaje.", **kwargs}

    def test_all_users_needs_no_institution_or_sensor(self):
        form = PushBroadcastForm(self._data(scope=PushBroadcast.SCOPE_ALL))
        self.assertTrue(form.is_valid(), form.errors)

    def test_a_sensor_send_requires_the_sensor(self):
        form = PushBroadcastForm(self._data(scope=PushBroadcast.SCOPE_STATION))
        self.assertFalse(form.is_valid())
        self.assertIn("station", form.errors)

    def test_an_institution_send_requires_the_institution(self):
        form = PushBroadcastForm(self._data(scope=PushBroadcast.SCOPE_INSTITUTION))
        self.assertFalse(form.is_valid())
        self.assertIn("institution", form.errors)

    def test_an_institution_send_needs_no_sensor(self):
        # Its audience is derived from the contract, so asking for a sensor
        # would be asking for something the send ignores.
        form = PushBroadcastForm(
            self._data(
                scope=PushBroadcast.SCOPE_INSTITUTION,
                institution=self.institution.pk,
            )
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertIsNone(form.cleaned_data["station"])

    def test_the_rows_are_addressable_for_hiding(self):
        """`data-field` is what the script hides a whole row by.

        Without it the script can only reach the input, leaving the label and
        help text of an irrelevant field on screen.
        """
        page = self.client.get(reverse("admin:api_pushbroadcast_send")).content.decode()
        self.assertIn('data-field="institution"', page)
        self.assertIn('data-field="station"', page)

    def test_the_templates_own_notes_do_not_reach_the_page(self):
        """Regression: `{# … #}` does not span lines, `{% comment %}` does.

        A multi-line `{#` note was being emitted verbatim into the markup —
        once per field, since it sat inside the loop — putting implementation
        notes on screen for anyone who opens the composer.
        """
        page = self.client.get(reverse("admin:api_pushbroadcast_send")).content.decode()
        self.assertNotIn("companion script", page)
        self.assertNotIn("data-field` is what", page)

    def test_the_composer_shows_the_recipient_labels(self):
        page = self.client.get(reverse("admin:api_pushbroadcast_send")).content.decode()
        self.assertIn("All users", page)
        self.assertIn("Followers of a specific sensor", page)
        self.assertIn("Followers of an institution", page)

    @override_settings(SENSOR_ALERTS_ENABLED=True)
    def test_the_logged_row_records_only_what_chose_the_recipients(self):
        """The hidden field is still submitted, so the row must drop it.

        Sent through the page rather than the form, because this is about what
        ends up in the log an operator later reads to answer "who got this?".
        """
        installation, _ = DeviceInstallation.register(
            INSTALLATION_A, push_token="token-a"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")

        with patch("api.push._post_batch", side_effect=ok_tickets):
            self.client.post(
                reverse("admin:api_pushbroadcast_send"),
                {
                    "scope": PushBroadcast.SCOPE_INSTITUTION,
                    "institution": self.institution.pk,
                    # Left selected from before the scope changed, and hidden by
                    # the script — but browsers post hidden selects all the same.
                    "station": self.station.pk,
                    "push_title": "Aviso",
                    "push_body": "Mensaje.",
                },
            )

        broadcast = PushBroadcast.objects.get()
        self.assertEqual(broadcast.institution, self.institution)
        self.assertIsNone(broadcast.station)
        # The delivery itself is unchanged: the contract is what resolves it.
        self.assertEqual(broadcast.recipients, 1)


class StationScopedToInstitutionTests(TestCase):
    """An institution's notification can only name the institution's own sensors.

    The boundary this holds: the composer offers every station on the platform,
    so before this narrowing an operator sending on one institution's behalf
    could pick a sensor belonging to FIUNA, AireLibre, MADES or another
    institution entirely — and the push would reach that sensor's followers
    with somebody else's announcement, unrecallable, visible only to the people
    who should never have received it.
    """

    def setUp(self):
        self.region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.mine = Stations.seed_for_tests(
            name="Colegio San José — patio",
            region=self.region,
            station_code="RSP-001",
        )
        self.also_mine = Stations.seed_for_tests(
            name="Colegio San José — aula",
            region=self.region,
            station_code="RSP-002",
        )
        self.theirs = Stations.seed_for_tests(
            name="FIUNA", region=self.region, station_code="RSP-003"
        )
        self.uncontracted = Stations.seed_for_tests(
            name="AireLibre: Centro", region=self.region, station_code="RSP-004"
        )

        self.institution = Institution.objects.create(legal_name="Colegio San José")
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.mine,
            start_date=date(2026, 1, 1),
        )
        self.other_institution = Institution.objects.create(legal_name="FIUNA")
        InstitutionContract.objects.create(
            institution=self.other_institution,
            station=self.theirs,
            start_date=date(2026, 1, 1),
        )

    def _data(self, **kwargs):
        return {
            "scope": PushBroadcast.SCOPE_STATION,
            "push_title": "Aviso",
            "push_body": "Mensaje.",
            **kwargs,
        }

    def _offered(self, form):
        """The station ids the rendered select actually offers.

        Read off the widget rather than the field's queryset: the narrowing is
        applied to what is rendered, while `clean` judges the pair — so the
        widget is where "what could the operator pick?" is answered.
        """
        return [value for value, _ in form.fields["station"].widget.choices if value]

    # --- the picker's options ----------------------------------------------

    def test_the_station_choices_narrow_to_the_chosen_institution(self):
        form = PushBroadcastForm(
            self._data(institution=self.institution.pk, station=self.mine.pk)
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(self._offered(form), [self.mine.pk])

    def test_another_institutions_station_is_not_offered(self):
        form = PushBroadcastForm(
            self._data(institution=self.institution.pk, station=self.mine.pk)
        )
        form.is_valid()
        offered = self._offered(form)
        self.assertNotIn(self.theirs.pk, offered)
        self.assertNotIn(self.uncontracted.pk, offered)

    def test_an_institution_with_no_contract_says_so_in_the_empty_select(self):
        orphan = Institution.objects.create(legal_name="Sin contrato")
        form = PushBroadcastForm(self._data(institution=orphan.pk))
        form.is_valid()

        labels = [label for _, label in form.fields["station"].widget.choices]
        self.assertEqual(labels, ["(no sensor under contract)"])

    def test_with_no_institution_every_station_stays_available(self):
        """A notice about a public sensor under no contract is still sendable."""
        form = PushBroadcastForm(self._data(station=self.uncontracted.pk))
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data["station"], self.uncontracted)

    def test_the_composer_opens_with_every_station(self):
        # A GET has no institution yet, so narrowing it here would leave the
        # operator an empty select with nothing explaining why.
        form = PushBroadcastForm()
        self.assertIn(self.theirs, list(form.fields["station"].queryset))

    # --- multi-station institutions ----------------------------------------

    def test_an_institution_with_several_stations_offers_all_of_them(self):
        """The DoD's multi-station case, exercised through the same code path.

        `InstitutionContract.institution` is OneToOne, so an institution cannot
        hold two contracts today — the two-station relationship is stood in for
        rather than stored. That is exactly what is being pinned: every caller
        goes through `institution_stations`, which answers with a *set*, so the
        day a contract covers several sensors — or that OneToOne becomes an FK —
        the picker and the validation already handle it with nothing to change.
        """
        both = Stations.objects.filter(pk__in=[self.mine.pk, self.also_mine.pk])

        with patch("api.forms.institution_stations", return_value=both):
            form = PushBroadcastForm(
                self._data(institution=self.institution.pk, station=self.also_mine.pk)
            )
            self.assertTrue(form.is_valid(), form.errors)

        self.assertEqual(
            sorted(self._offered(form)),
            sorted([self.mine.pk, self.also_mine.pk]),
        )
        # Displayed *and* accepted: the second sensor is a valid target, not
        # just a visible option.
        self.assertEqual(form.cleaned_data["station"], self.also_mine)

    # --- submitting an invalid pair anyway ---------------------------------

    def test_a_cross_institution_pair_is_refused(self):
        """Hand-edited POST: the backend refuses it, not just the dropdown."""
        form = PushBroadcastForm(
            self._data(institution=self.institution.pk, station=self.theirs.pk)
        )
        self.assertFalse(form.is_valid())
        self.assertIn("station", form.errors)

    def test_the_refusal_names_the_mismatch(self):
        # The field's generic "not one of the available choices" reads as a bug
        # rather than as the boundary being enforced.
        form = PushBroadcastForm(
            self._data(institution=self.institution.pk, station=self.theirs.pk)
        )
        form.is_valid()
        self.assertIn("does not belong to", " ".join(form.errors["station"]))

    def test_an_uncontracted_station_is_refused_for_an_institution(self):
        form = PushBroadcastForm(
            self._data(institution=self.institution.pk, station=self.uncontracted.pk)
        )
        self.assertFalse(form.is_valid())
        self.assertIn("station", form.errors)

    def test_an_institution_with_no_contract_cannot_name_a_station(self):
        orphan = Institution.objects.create(legal_name="Sin contrato")
        form = PushBroadcastForm(
            self._data(institution=orphan.pk, station=self.mine.pk)
        )
        self.assertFalse(form.is_valid())
        self.assertIn("station", form.errors)

    def test_institution_scope_is_unaffected_by_the_narrowing(self):
        # Institution scope derives its stations from the contract, so it needs
        # no station at all — the narrowing must not start demanding one.
        form = PushBroadcastForm(
            {
                "scope": PushBroadcast.SCOPE_INSTITUTION,
                "institution": self.institution.pk,
                "push_title": "Aviso",
                "push_body": "Mensaje.",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertIsNone(form.cleaned_data["station"])

    def test_all_scope_still_discards_a_cross_institution_leftover(self):
        # Clearing runs before the cross-check, so a leftover pair that would
        # be invalid for a narrower scope must not block a platform-wide send.
        form = PushBroadcastForm(
            {
                "scope": PushBroadcast.SCOPE_ALL,
                "institution": self.institution.pk,
                "station": self.theirs.pk,
                "push_title": "Aviso",
                "push_body": "Mensaje.",
            }
        )
        self.assertTrue(form.is_valid(), form.errors)
        self.assertIsNone(form.cleaned_data["station"])


class SenderRefusesAnInvalidPairTests(TestCase):
    """The gate behind the form, for rows the composer did not write.

    A `PushBroadcast` can be created from a shell, a script or a data
    migration, none of which pass through `PushBroadcastForm`. Since a push
    cannot be recalled, the sender treats a station outside the named
    institution as an audience of nobody rather than delivering to whoever
    happens to follow it.
    """

    def setUp(self):
        region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.mine = Stations.seed_for_tests(
            name="Colegio", region=region, station_code="RSP-001"
        )
        self.theirs = Stations.seed_for_tests(
            name="FIUNA", region=region, station_code="RSP-003"
        )
        self.institution = Institution.objects.create(legal_name="Colegio San José")
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.mine,
            start_date=date(2026, 1, 1),
        )

        installation, _ = DeviceInstallation.register(
            INSTALLATION_B, push_token="token-theirs"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-003")

    def test_a_foreign_station_reaches_nobody(self):
        broadcast = PushBroadcast.objects.create(
            scope=PushBroadcast.SCOPE_STATION,
            institution=self.institution,
            station=self.theirs,
            push_title="Aviso",
            push_body="Mensaje.",
        )
        self.assertEqual(broadcast_tokens(broadcast), [])

    def test_the_institutions_own_station_still_reaches_its_followers(self):
        installation, _ = DeviceInstallation.register(
            INSTALLATION_A, push_token="token-mine"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")

        broadcast = PushBroadcast.objects.create(
            scope=PushBroadcast.SCOPE_STATION,
            institution=self.institution,
            station=self.mine,
            push_title="Aviso",
            push_body="Mensaje.",
        )
        self.assertEqual(broadcast_tokens(broadcast), ["token-mine"])

    def test_a_station_notice_with_no_institution_is_left_alone(self):
        """No institution named means no boundary to cross."""
        broadcast = PushBroadcast.objects.create(
            scope=PushBroadcast.SCOPE_STATION,
            institution=None,
            station=self.theirs,
            push_title="Sensor fuera de servicio",
            push_body="Mensaje.",
        )
        self.assertEqual(broadcast_tokens(broadcast), ["token-theirs"])


class GlobalBroadcastPermissionTests(TestCase):
    """Notifying the whole platform takes a permission of its own."""

    def setUp(self):
        self.user = User.objects.create_user(
            "operator", password="x", is_staff=True, is_superuser=False
        )
        for codename in ("view_pushbroadcast", "add_pushbroadcast"):
            self.user.user_permissions.add(Permission.objects.get(codename=codename))
        self.client.force_login(self.user)

    def test_the_global_permission_exists_and_is_not_granted_by_default(self):
        self.assertTrue(
            Permission.objects.filter(codename="send_global_pushbroadcast").exists()
        )
        self.assertFalse(self.user.has_perm("api.send_global_pushbroadcast"))

    def test_a_platform_wide_send_is_refused_without_it(self):
        with patch("api.push.send_broadcast") as sender:
            response = self.client.post(
                reverse("admin:api_pushbroadcast_send"),
                {
                    "scope": PushBroadcast.SCOPE_ALL,
                    "push_title": "Aviso",
                    "push_body": "Mensaje.",
                },
                follow=True,
            )

        self.assertEqual(response.status_code, 200)
        sender.assert_not_called()
        self.assertFalse(PushBroadcast.objects.exists())


@override_settings(SENSOR_ALERTS_ENABLED=True)
class SendPageTests(TestCase):
    """The operational notice has a page of its own, reachable without an alert.

    An announcement about maintenance has no AQI threshold, so requiring an
    operator to pick one of the AQI alerts on the way to sending it would be
    asking for a number that has no bearing on the message.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            "operator", password="x", is_staff=True, is_superuser=False
        )
        for codename in ("view_pushbroadcast", "add_pushbroadcast"):
            self.user.user_permissions.add(Permission.objects.get(codename=codename))
        self.client.force_login(self.user)

        region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.station = Stations.seed_for_tests(
            name="Respira: Villa Morra",
            region=region,
            station_code="RSP-001",
            is_station_on=True,
        )
        installation, _ = DeviceInstallation.register(
            "8f14e45f-ceea-467e-bd97-1a2b3c4d5e6f", push_token="token-a"
        )
        DeviceFollower.objects.create(installation=installation, station_code="RSP-001")

    def test_the_page_opens_without_selecting_an_alert(self):
        response = self.client.get(reverse("admin:api_pushbroadcast_send"))
        self.assertEqual(response.status_code, 200)

    def test_a_maintenance_notice_reaches_the_sensors_followers(self):
        with patch("api.push._post_batch", side_effect=ok_tickets) as post:
            response = self.client.post(
                reverse("admin:api_pushbroadcast_send"),
                {
                    "scope": PushBroadcast.SCOPE_STATION,
                    "station": self.station.pk,
                    "push_title": "Mantenimiento programado",
                    "push_body": "El sensor estará fuera de servicio el martes.",
                },
                follow=True,
            )

        self.assertEqual(response.status_code, 200)
        [messages_sent] = [call.args[0] for call in post.call_args_list]
        self.assertEqual(messages_sent[0]["to"], "token-a")
        self.assertEqual(messages_sent[0]["title"], "Mantenimiento programado")

        broadcast = PushBroadcast.objects.get()
        self.assertEqual(broadcast.recipients, 1)
        self.assertEqual(broadcast.sent_by, self.user)

    def test_an_operator_without_the_permission_cannot_reach_the_page(self):
        self.user.user_permissions.remove(
            Permission.objects.get(codename="add_pushbroadcast")
        )
        # Permissions are cached on the instance for the length of a request.
        self.client.force_login(User.objects.get(pk=self.user.pk))

        response = self.client.get(reverse("admin:api_pushbroadcast_send"))
        self.assertEqual(response.status_code, 403)

    def test_the_log_stays_read_only(self):
        # The record of a send is not an editable draft: Django's own add page
        # for this model must stay closed, so the only way to create a row is
        # actually sending one.
        response = self.client.get(reverse("admin:api_pushbroadcast_add"))
        self.assertEqual(response.status_code, 403)

    def test_the_composer_loads_the_script_that_narrows_the_select(self):
        # The page extends `base_site.html`, which does not emit form media on
        # its own — so this is what proves the narrowing is actually visible in
        # the browser and not just enforced on submit.
        response = self.client.get(reverse("admin:api_pushbroadcast_send"))
        self.assertContains(response, "push_broadcast_compose.js")

    def test_a_cross_institution_send_is_refused_and_nothing_goes_out(self):
        institution = Institution.objects.create(legal_name="Colegio San José")
        other = Stations.seed_for_tests(
            name="FIUNA",
            region=Regions.objects.get(region_code="GA"),
            station_code="RSP-009",
            is_station_on=True,
        )
        InstitutionContract.objects.create(
            institution=institution, station=self.station, start_date=date(2026, 1, 1)
        )

        with patch("api.push.send_broadcast") as sender:
            response = self.client.post(
                reverse("admin:api_pushbroadcast_send"),
                {
                    "scope": PushBroadcast.SCOPE_STATION,
                    "institution": institution.pk,
                    "station": other.pk,
                    "push_title": "Aviso",
                    "push_body": "Mensaje.",
                },
            )

        # Redisplayed with the error rather than redirecting, and no row means
        # the send was never attempted.
        self.assertEqual(response.status_code, 200)
        sender.assert_not_called()
        self.assertFalse(PushBroadcast.objects.exists())


class InstitutionStationsLookupTests(TestCase):
    """The JSON the composer's select is repopulated from.

    Behind the same permission as the page it serves: which sensors an
    institution leases is not public information.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            "operator", password="x", is_staff=True, is_superuser=False
        )
        for codename in ("view_pushbroadcast", "add_pushbroadcast"):
            self.user.user_permissions.add(Permission.objects.get(codename=codename))
        self.client.force_login(self.user)

        region = Regions.seed_for_tests(name="Gran Asunción", region_code="GA")
        self.mine = Stations.seed_for_tests(
            name="Colegio — patio", region=region, station_code="RSP-001"
        )
        self.theirs = Stations.seed_for_tests(
            name="FIUNA", region=region, station_code="RSP-003"
        )
        self.institution = Institution.objects.create(legal_name="Colegio San José")
        InstitutionContract.objects.create(
            institution=self.institution,
            station=self.mine,
            start_date=date(2026, 1, 1),
        )
        self.url = reverse("admin:api_pushbroadcast_institution_stations")

    def test_it_returns_the_institutions_own_stations(self):
        payload = self.client.get(self.url, {"institution": self.institution.pk}).json()
        self.assertEqual(
            payload["stations"],
            [{"id": self.mine.pk, "name": "Colegio — patio"}],
        )

    def test_it_omits_stations_belonging_to_others(self):
        payload = self.client.get(self.url, {"institution": self.institution.pk}).json()
        self.assertNotIn(self.theirs.pk, [s["id"] for s in payload["stations"]])

    def test_an_institution_with_no_contract_returns_an_empty_list(self):
        orphan = Institution.objects.create(legal_name="Sin contrato")
        payload = self.client.get(self.url, {"institution": orphan.pk}).json()
        self.assertEqual(payload["stations"], [])

    def test_a_missing_or_unknown_institution_returns_an_empty_list(self):
        self.assertEqual(self.client.get(self.url).json()["stations"], [])
        self.assertEqual(
            self.client.get(self.url, {"institution": 999999}).json()["stations"], []
        )

    def test_it_is_refused_without_the_send_permission(self):
        self.user.user_permissions.remove(
            Permission.objects.get(codename="add_pushbroadcast")
        )
        # Permissions are cached on the instance for the length of a request.
        self.client.force_login(User.objects.get(pk=self.user.pk))

        response = self.client.get(self.url, {"institution": self.institution.pk})
        self.assertEqual(response.status_code, 403)

    def test_the_lookup_url_is_not_swallowed_by_the_object_id_catch_all(self):
        # `send/institution-stations/` sits under the same prefix as `send/`,
        # and both are registered ahead of the admin's `<path:object_id>/`.
        self.assertEqual(
            self.url.rstrip("/").split("/")[-2:], ["send", "institution-stations"]
        )
