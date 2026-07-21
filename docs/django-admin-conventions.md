# Django Admin — Conventions for Administrative Modules

The Station Administration backoffice will keep growing (Station Details,
Station Override, and other future modules). This document establishes the
reusable configuration patterns every administrative `ModelAdmin` should
follow, so new modules look and behave consistently without re-deriving
these decisions each time.

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

   | Attribute | Value | Why |
   |---|---|---|
   | `list_per_page` | `50` | Consistent pagination across all changelists. |
   | `empty_value_display` | `"—"` | Consistent placeholder for blank/null fields instead of Django's default `-`. |
   | `preserve_filters` | `True` | Filters survive navigating in and out of a record, so operators don't lose their place in a filtered list. |

2. **Explicit permission hooks** (`has_view_permission`,
   `has_add_permission`, `has_change_permission`, `has_delete_permission`,
   `has_module_permission`) that currently defer to Django's own permission
   framework (`super()`), made explicit as the single, overridable
   enforcement point shared by every administrative model. Effective
   permissions are resolved through each user's role → `auth.Group` →
   model permissions, per `accounts/permissions.py`.

`api/admin.py`'s `StationsAdmin` and `RegionsAdmin` are the reference
implementation of this pattern today.

## Standard `ModelAdmin` attributes

Configure these explicitly on every module (don't rely on Django defaults,
which are less useful for an operational backoffice):

### `list_display`

Show the columns an operator needs to identify a record and its state at a
glance — not every field. Example (`StationsAdmin`):

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
search_fields = ("name",)               # StationsAdmin
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

When adding e.g. Station Details or Station Override:

- [ ] `ModelAdmin` extends `RoleBasedModelAdmin`.
- [ ] `list_display` shows identifying fields + status flags, not every column.
- [ ] `list_filter` covers boolean/status/FK fields.
- [ ] `search_fields` covers free-text lookup fields.
- [ ] `ordering` is explicit.
- [ ] `readonly_fields` covers any system-managed fields.
- [ ] `fieldsets` group fields by concern (if the model has more than ~5 fields).
- [ ] Add the model's permissions to `ROLE_GROUP_PERMISSIONS` in
      `accounts/permissions.py` if it should be restricted per role, then run
      `python manage.py sync_roles`.
- [ ] No per-model branding or CSRF configuration — both are inherited
      globally.
