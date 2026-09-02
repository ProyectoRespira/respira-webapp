"""Link an institution to an EXISTING station, creating no measurement data.

For demo, where the readings are already real. This writes only the records the
institutional dashboard needs to resolve a session:

    Institution → InstitutionContract → (an existing station)
    User        → InstitutionUser

It never touches `regions`, `stations` or `station_readings_gold` — those
belong to the dbt pipeline, and the whole point is that the AQI, the three
months of history and the monthly report all come out of readings that are
already there.

Alerts are optional and *derived*, not invented: with SEED_ALERTS on, the
script looks for days on which the station's real AQI actually crossed the
institution's threshold and records one InstitutionAlert per crossing. Nothing
in the platform generates alerts automatically yet, so without this the
"¿Responde a una alerta?" selector has nothing to offer.

Run it on the demo host:

    docker compose exec -T backend python manage.py shell < seed_institution_demo.py

Idempotent: re-running updates the same rows and rebuilds the derived alerts.
"""

import datetime as dt

from django.contrib.auth import get_user_model
from django.db.models import Avg, Max
from django.db.models.functions import TruncDate
from django.utils import timezone

from api.models import (
    Institution,
    InstitutionAlertConfig,
    InstitutionContract,
    InstitutionUser,
    SensitiveGroup,
    StationReadingsGold,
    Stations,
)

# --- edit these ------------------------------------------------------------

# The station the institution leases. Must already exist and be reporting, so
# the dashboard has a current AQI and real history to aggregate.
STATION_ID = 2  # "AireLibre: Villa Adela - Luque" on demo

EMAIL = "institucion@proyectorespira.net"
PASSWORD = "cambiar-esta-clave"

LEGAL_NAME = "Institución de prueba"
DISPLAY_NAME = "Institución de prueba"

ALERT_THRESHOLD = 100

# Record an alert for each day the real AQI crossed ALERT_THRESHOLD, over the
# trailing window below. Set to False to create the institution only.
SEED_ALERTS = True
ALERT_WINDOW_DAYS = 90
MAX_ALERTS = 12

# ---------------------------------------------------------------------------

station = Stations.objects.get(pk=STATION_ID)

readings = StationReadingsGold.objects.filter(station_id=station.id)
if not readings.exists():
    raise SystemExit(
        f"Station {station.name} has no readings; the dashboard would render "
        "empty. Pick a station that is reporting."
    )

# A station is leased by at most one institution (`InstitutionContract.station`
# is a OneToOne). Caught here so picking an already-leased station fails with
# something readable instead of a unique-constraint traceback from Postgres.
taken = (
    InstitutionContract.objects.filter(station_id=station.id)
    .exclude(institution__legal_name=LEGAL_NAME)
    .select_related("institution")
    .first()
)
if taken is not None:
    raise SystemExit(
        f"Station {station.name} is already under contract to "
        f"'{taken.institution}'. Pick another station, or reuse that "
        "institution instead of creating a second one."
    )

institution, _ = Institution.objects.update_or_create(
    legal_name=LEGAL_NAME,
    defaults={
        "display_name": DISPLAY_NAME,
        "institution_type": "Educativa",
        "contact_email": EMAIL,
        "city": "Asunción",
    },
)

today = timezone.now().date()
InstitutionContract.objects.update_or_create(
    institution=institution,
    defaults={
        "station": station,
        "contract_status": InstitutionContract.ContractStatus.ACTIVE,
        "start_date": today.replace(month=1, day=1),
        "end_date": today.replace(month=12, day=31),
    },
)

alert_config, _ = InstitutionAlertConfig.objects.update_or_create(
    institution=institution,
    defaults={"is_enabled": True, "alert_threshold": ALERT_THRESHOLD},
)
alert_config.sensitive_groups.set(SensitiveGroup.objects.all()[:3])

User = get_user_model()
user, _ = User.objects.get_or_create(email=EMAIL, defaults={"is_active": True})
user.set_password(PASSWORD)
user.is_active = True
user.save()

InstitutionUser.objects.update_or_create(
    user=user, defaults={"institution": institution}
)

alerts_created = 0
if SEED_ALERTS:
    # InstitutionAlert arrived with RES-370; import lazily so this script still
    # runs against an older deployment that does not have it yet.
    from api.models import InstitutionAlert

    since = timezone.now() - dt.timedelta(days=ALERT_WINDOW_DAYS)
    crossings = (
        readings.filter(date_utc__gte=since, aqi_pm2_5__isnull=False)
        .annotate(day=TruncDate("date_utc"))
        .values("day")
        .annotate(peak=Max("aqi_pm2_5"), average=Avg("aqi_pm2_5"))
        .filter(peak__gt=ALERT_THRESHOLD)
        .order_by("-day")[:MAX_ALERTS]
    )

    InstitutionAlert.objects.filter(institution=institution).delete()
    for row in crossings:
        # Midday local-ish; the exact hour of the crossing is not recorded in
        # the daily aggregate, and the dashboard only ever shows the date.
        triggered = dt.datetime.combine(
            row["day"], dt.time(12), tzinfo=dt.timezone.utc
        )
        InstitutionAlert.objects.create(
            institution=institution,
            station=station,
            aqi_value=row["peak"],
            alert_threshold=ALERT_THRESHOLD,
            triggered_at=triggered,
            resolved_at=triggered + dt.timedelta(hours=12),
        )
        alerts_created += 1

print("OK — no measurement data was created.")
print(f"  institución : {institution}")
print(f"  estación    : {station.name} (id={station.id}, {readings.count()} lecturas)")
print(f"  alertas     : {alerts_created} (derivadas de cruces reales del umbral)")
print(f"  login       : {EMAIL}")
