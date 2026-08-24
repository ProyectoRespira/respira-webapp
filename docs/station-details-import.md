# Importing the Sensor Registry spreadsheet

One-time migration of station operational metadata from the *Sensor Registry*
Google Spreadsheet into `station_details`, so the Backoffice becomes the single
place that data lives. After this runs, the sheet stops being a source of truth
— further edits belong in Django Admin, on each station's page.

## Running it

1. In Google Sheets: **File → Download → Comma-separated values (.csv)**.
2. Preview the run. Nothing is written, and every row's station match is printed
   so it can be checked against the sheet:

   ```bash
   python manage.py import_station_details registry.csv --dry-run
   ```

   ```
   Columns with no matching field (ignored): Color favorito
     line 2: 'Villa Morra' -> Respira: Villa Morra (create, 8 field(s))
     line 3: 'Costanera' -> MADES: Costanera (update, 5 field(s))
   Dry run — nothing written. Would be: 1 created, 1 updated, 0 skipped of 2 row(s).
   ```

3. Resolve anything reported on stderr (see *When a row is skipped*), then run
   it for real:

   ```bash
   python manage.py import_station_details registry.csv
   ```

Re-running is safe: rows are matched to the same stations and updated in place.

## How rows are matched to stations

By **station name**. The gold pipeline prefixes names by source
(`MADES: Costanera`), while the sheet usually holds the bare name, so the
command tries an exact case-insensitive match first and a `": <name>"` suffix
match second.

The station column can be headed `Estación`, `Station`, `Nombre`, `Name` or
`Sensor`.

> Once `Stations.station_code` ships (RES-326), matching on that code would be
> more robust than on names. This command deliberately does not depend on it, so
> the import can run independently of that work.

## Field mapping

| Spreadsheet column | `StationDetails` field |
| ------------------ | ---------------------- |
| N° de serie | `serial_number` |
| Tipo de Sensor | `sensor_type` |
| Modelo | `model` |
| Ciudad | `city` |
| Ubicación específica | `specific_location` |
| Localidad | `locality` |
| Tipo de entorno | `environment_type` |
| Conectividad | `connectivity` |
| Energía | `power_source` |
| Fecha instalación | `installation_date` |
| Responsable | `responsible` |
| Contacto | `contact_info` |
| Notas | `notes` |

Headers are matched ignoring case, accents, ordinal marks and periods, so
`N° de serie`, `No. de Serie` and `NRO DE SERIE` all resolve to the same field.
Any column that maps to nothing is listed at the start of the run.

`Prioridad` and `Estado` are recognised and skipped on purpose: the product
sheet's open questions dropped the planned-status field, and priority was never
modelled.

Dates accept `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY` and `DD/MM/YY`.

## Safety rules

- **`stations` is never written.** That table belongs to the dbt gold pipeline;
  the command only creates or updates the `StationDetails` record attached to a
  station.
- **A blank cell never clears a stored value.** It means "the sheet doesn't
  know", so a partially filled sheet can be imported repeatedly without erasing
  data an operator has since entered in the admin.
- **No duplicates.** `StationDetails` is a one-to-one with `Stations`, so a
  second run updates the existing record.
- **A bad cell does not lose its row.** An unreadable installation date is
  reported and skipped; the rest of that row still imports.

## When a row is skipped

Skips go to stderr with the line number, and the run continues:

| Message | What to do |
| ------- | ---------- |
| `no station name` | The station column is empty on that row. |
| `no station matches 'X'` | The station isn't in the database, or is named differently. Check against the changelist. |
| `'X' matches A, B` | Two stations fit that name. The command refuses to guess — disambiguate in the sheet using the full prefixed name. |

## Verifying

```bash
python manage.py test api.tests_station_import
```

15 tests cover the field mapping, station linking, accented/odd headers, blank
cells, date formats, ambiguous and unmatched names, idempotency, and that no
dbt-managed station field is touched.
