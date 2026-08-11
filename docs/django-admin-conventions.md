# Django Admin — Conventions for Administrative Modules

The Station Administration backoffice will keep growing. This document
establishes the reusable configuration patterns every administrative
`ModelAdmin` should follow, so new modules look and behave consistently without
re-deriving these decisions each time.

Modules registered today, in `api/admin.py`:

| Module            | Base class            | Owner of the data                       |
| ----------------- | --------------------- | --------------------------------------- |
| `Regions`         | `ReadOnlyModelAdmin`  | dbt gold pipeline                       |
| `Stations`        | `RoleBasedModelAdmin` | dbt gold pipeline (fields all read-only) |
| `StationDetails`  | `StackedInline`       | backoffice — replaces the ops spreadsheet |
| `StationOverride` | `RoleBasedModelAdmin` | backoffice — replaces `station_status_seed.csv` |

## Base class: always extend `RoleBasedModelAdmin`

Every administrative `ModelAdmin` — for models that should be gated by the
role/permission matrix (see
[`admin-auth-configuration.md`](./admin-auth-configuration.md)) — must
extend `accounts.admin_base.RoleBasedModelAdmin` instead of
`django.contrib.admin.ModelAdmin` directly:

```python
from accounts.admin_base import RoleBasedModelAdmin

@admin.register(MyModel)
class MyModelAdmin(RoleBasedModelAdmin):
    ...
```

This base class provides two things:

1. **Shared presentation defaults**, applied to every module automatically:

   | Attribute             | Value  | Why                                                                                                        |
   | --------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
   | `list_per_page`       | `50`   | Consistent pagination across all changelists.                                                              |
   | `empty_value_display` | `"—"`  | Consistent placeholder for blank/null fields instead of Django's default `-`.                              |
   | `preserve_filters`    | `True` | Filters survive navigating in and out of a record, so operators don't lose their place in a filtered list. |

2. **Explicit permission hooks** (`has_view_permission`,
   `has_add_permission`, `has_change_permission`, `has_delete_permission`,
   `has_module_permission`) that currently defer to Django's own permission
   framework (`super()`), made explicit as the single, overridable
   enforcement point shared by every administrative model. Effective
   permissions are resolved through each user's role → `auth.Group` →
   model permissions, per `accounts/permissions.py`.

`api/admin.py`'s `StationOverrideAdmin` is the reference implementation of this
pattern today.

### Read-only modules (externally-managed data)

For models owned by another system — e.g. `regions`, which the dbt gold
pipeline writes — extend **`ReadOnlyModelAdmin`** (a subclass of
`RoleBasedModelAdmin`) instead. It disables add/change/delete for **everyone**
(even superusers), so records can't be edited into a state the pipeline will
overwrite; `has_view_permission` still follows the role matrix, so the data is
visible per role but immutable from the admin:

```python
from accounts.admin_base import ReadOnlyModelAdmin

@admin.register(Regions)
class RegionsViewer(ReadOnlyModelAdmin):
    ...
```

Editable operational data (on/off toggles, contact metadata) belongs in
admin-owned models such as `StationOverride` / `StationDetails` — not in the
reflected pipeline tables.

### Immutable parent with an editable inline

`Stations` is a special case of the above: the table is dbt-managed, but
`StationDetails` — which *is* backoffice-owned — is edited inline on the station
page. **Django refuses to save inlines when the parent denies change
permission**, so `StationsViewer` cannot extend `ReadOnlyModelAdmin`. It extends
`RoleBasedModelAdmin` and reproduces the same immutability by other means:

```python
@admin.register(Stations)
class StationsViewer(RoleBasedModelAdmin):
    # Every dbt-written column, so none of them can be edited.
    readonly_fields = ("name", "region", "latitude", "longitude",
                       "is_station_on", "is_pattern_station")
    inlines = (StationDetailsInline,)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        # "You may open this station to edit its details" — never its own fields.
        return request.user.has_perm("api.change_stationdetails")
```

Two rules make this safe, and both must hold for any module following this
pattern:

1. **Every** field of the parent model is listed in `readonly_fields`. Django
   ignores POSTed values for read-only fields, so a crafted request cannot
   modify them.
2. Change permission is keyed on the **child** model's permission, so the parent
   never grants write access to itself. `add`/`delete` stay denied outright.

Prefer plain `ReadOnlyModelAdmin` whenever the reflected model has no editable
child; only reach for this pattern when an inline actually needs to be saved.

## Standard `ModelAdmin` attributes

Configure these explicitly on every module (don't rely on Django defaults,
which are less useful for an operational backoffice):

### `list_display`

Show the columns an operator needs to identify a record and its state at a
glance — not every field. Example (`StationsViewer`):

```python
list_display = ("name", "region", "is_station_on", "is_pattern_station")
```

Prefer human-readable names, foreign keys (Django resolves `__str__`
automatically), and boolean status flags over IDs or raw timestamps.

### `list_filter`

Add filters for boolean/status/foreign-key fields an operator would
realistically filter by — not free-text fields (those belong in
`search_fields`). Example:

```python
list_filter = ("is_station_on", "is_pattern_station", "region")
```

### `search_fields`

Add the field(s) an operator would type into the search box — names, codes,
emails. Example:

```python
search_fields = ("name",)               # StationsViewer
search_fields = ("email", "username")   # UserAdmin
```

### `ordering`

Always set an explicit, stable default ordering (don't rely on database
insertion order):

```python
ordering = ("name",)   # or ("email",) for UserAdmin
```

### `readonly_fields`

Use for fields that are system-managed or shouldn't be hand-edited from the
admin (timestamps, computed values, hashed passwords). Example from
`UserAdmin` (via Django's own `UserChangeForm`): the `password` field is
rendered through `ReadOnlyPasswordHashField` rather than being directly
editable — the hash is shown, with a link to the dedicated password-change
form instead. New modules with system-managed fields (e.g. a future audit
timestamp on Station Override) should follow the same pattern:

```python
readonly_fields = ("created_at", "updated_at")
```

### `fieldsets`

Group related fields for the detail/edit view instead of listing them flat.
`UserAdmin` is the reference example:

```python
fieldsets = (
    (None, {"fields": ("email", "password")}),
    ("Personal info", {"fields": ("first_name", "last_name", "username")}),
    ("Role", {"fields": ("role",)}),
    ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser",
                                 "groups", "user_permissions")}),
    ("Important dates", {"fields": ("last_login", "date_joined")}),
)
```

Group by concern (identity, role/permissions, audit/dates, ...), not by
field-declaration order in the model. `add_fieldsets` (used only on the "add
new record" form) should show the minimum required to create the record —
see `UserAdmin.add_fieldsets`, which only asks for `email` +
`password1`/`password2`.

## Actions that change operational state

Bulk actions that change how the platform behaves (today: **Activate** /
**Deactivate** on `StationsViewer`) must confirm before they write, and must
capture *why*. The pattern follows Django's own `delete_selected`:

1. The action calls a shared handler that **returns a `TemplateResponse`** the
   first time round — a confirmation page listing the affected records, with a
   required reason field and a note about what the change does *not* do yet.
2. The page posts back to the changelist with the same `action` and
   `_selected_action` values plus a `confirm` flag, so Django re-dispatches the
   same action.
3. On that second pass the handler validates the reason, writes, calls
   `message_user` and **returns `None`**, which sends the operator back to the
   changelist with the messages rendered as banners.

```python
@admin.action(description="Deactivate selected stations", permissions=["override"])
def deactivate_stations(self, request, queryset):
    return self._override_status(request, queryset, StationOverride.Status.INACTIVE)
```

Two rules:

- **Gate the action on the permission of the model it writes**, via
  `permissions=["<name>"]` + a matching `has_<name>_permission` method — not on
  the permission of the model being listed. The station actions write
  `StationOverride`, so they require `add_stationoverride` /
  `change_stationoverride`, even though `Stations` grants nobody write access.
- **Refuse the whole selection** when any record can't be acted on, rather than
  applying the change to part of it. A partial success that looks like a full
  one is worse than an error.

### Deferred effects must be stated in the UI

When an admin write only takes effect through another system, say so on the
confirmation page *and* in a message after the operation. `api/admin.py` keeps
those strings in module constants so the two uses can't drift:

```python
DBT_RUN_NOTICE = "Changes to station status require a dbt run to take effect."
STATUS_EXPLANATION = {...}   # what each action actually does downstream
```

## Branding

Admin-wide branding is set once, globally, in `accounts/admin.py` — new
modules never need to (and must not) override it per-model:

```python
admin.site.site_header = "Proyecto Respira — Administration"
admin.site.site_title = "Proyecto Respira Admin"
admin.site.index_title = "Station Administration"
```

## Validation messages

Don't write custom validation error strings unless the default Django
message is actually unclear for the field in question — the built-in
messages (required field, invalid choice, uniqueness violation, password
validators) are already consistent across every module and translated. Only
add a custom `clean_<field>`/`ValidationError` when there's a rule Django
can't express declaratively (see `UserCreationForm.clean_password2` in
`accounts/forms.py` for an example: confirming `password1 == password2`).

## CSRF

Nothing to configure per module — `CsrfViewMiddleware` is enabled globally
(see [`admin-security-hardening.md`](./admin-security-hardening.md)) and
protects every admin form automatically, including ones added by future
modules.

## Checklist for a new administrative module

- [ ] `ModelAdmin` extends `RoleBasedModelAdmin` (or `ReadOnlyModelAdmin` for
      pipeline-owned data).
- [ ] `list_display` shows identifying fields + status flags, not every column.
- [ ] `list_filter` covers boolean/status/FK fields.
- [ ] `search_fields` covers free-text lookup fields.
- [ ] `ordering` is explicit.
- [ ] `readonly_fields` covers any system-managed fields.
- [ ] `fieldsets` group fields by concern (if the model has more than ~5 fields).
- [ ] Any action that changes operational state confirms first, captures a
      reason, and is gated on the permission of the model it writes.
- [ ] Add the model's permissions to `ROLE_GROUP_PERMISSIONS` in
      `accounts/permissions.py` if it should be restricted per role, then run
      `python manage.py sync_roles`.
- [ ] No per-model branding or CSRF configuration — both are inherited
      globally.
