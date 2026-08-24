# Station Administration — operating guide

Turning a station off used to mean editing `station_status_seed.csv` in
respira-data and opening a PR. It is now a Backoffice action. `stations` itself
is written by the dbt gold pipeline and stays read-only everywhere in the admin
— see [`django-admin-conventions.md`](./django-admin-conventions.md).

## Turning a station off (and back on)

1. Admin → **Stations**, tick the stations, pick **Deactivate selected
   stations** (or **Activate**), press Go.
2. A confirmation page lists the affected stations with their pipeline codes and
   asks for a **reason**. It is mandatory — there is no way to record a status
   change without one.
3. On confirm, one `StationOverride` row per station is created or updated:
   `field=is_station_on`, `value=inactive|active`, plus the reason, the
   timestamp, and `processed=false`.
4. A banner reports *"Changes to station status require a dbt run to take
   effect."* Nothing in `stations` changes until the pipeline runs (hourly).

### What "Activate" actually does

`stations.is_station_on` is derived by the pipeline as *the source reports the
station active **and** it has reported recently*. An override can only force the
first half to false. So:

- **Deactivate** holds the station off, whatever data it sends.
- **Activate** lifts that hold. The station comes back **only if** its source
  still reports it active and it is sending data. Activating does not bring back
  a sensor that stopped reporting — the fix there is the sensor, not the
  Backoffice.

The `active` row is kept rather than deleted because it is the audit trail of
who lifted the hold and why. On the dbt side it simply drops out of
`int_station_status_overrides`, which only emits shutdowns.

## Station codes

Overrides are keyed by `station_code`, the pipeline's stable natural key —
`stations.id` comes from a `row_number()` and shifts whenever a station is
added. The gold `stations` model exposes the code (respira-data,
`stations.sql`); the admin shows it read-only under **Pipeline** on the station
page and it is searchable from the changelist.

A station with no code yet cannot be activated or deactivated: the action
refuses the whole selection and names the offenders. That can only happen before
the pipeline has rebuilt `stations` with the column.

## Deploying alongside respira-data

Three steps, in this order:

1. **respira-webapp** — migration `0006` copies the three rows that
   `station_status_seed.csv` held (`airelibre_d87553`, `mades_open_ic08p0002`,
   `mades_open_lvafyatdnok8ew`) into `station_overrides`. Safe on its own:
   nothing consumes the table yet.
2. **respira-data** — `stations.sql` starts exposing `station_code`,
   `int_station_status_overrides` switches from the CSV seed to
   `source('respira_webapp', 'station_overrides')`, and the seed is retired.
   Wait for one scheduled run so `stations` is rebuilt with the new column.
3. **respira-webapp** — migration `0007` teaches Django about
   `stations.station_code` (state-only; dbt owns the column) and the
   Activate/Deactivate actions ship.

Deployed with steps 1 and 2 swapped, those three stations would come back on for
one pipeline run.
