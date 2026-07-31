from django.contrib import admin


class RoleBasedModelAdmin(admin.ModelAdmin):
    """Base ModelAdmin whose access is gated by Django model permissions.

    Effective permissions come from the ``auth.Group`` synced to each user's
    ``Role`` (see ``accounts.permissions``). The ``has_*_permission`` methods
    below defer to Django's permission framework, made explicit here so this is
    the single, overridable enforcement point shared by administrative models.

    Consequences of the default matrix:
      * Viewer (only ``view_*``)   -> read-only changelist/detail.
      * Editor (``change_/view_``) -> can edit but not add or delete.
      * Admin / Superadmin         -> per the permission matrix.

    It also carries the shared presentation defaults every administrative model
    should inherit (see docs/django-admin-conventions.md). Subclasses override
    ``list_display`` / ``list_filter`` / ``search_fields`` / ``ordering`` /
    ``readonly_fields`` / ``fieldsets`` as needed.
    """

    # Shared presentation defaults for a consistent backoffice experience.
    list_per_page = 50
    empty_value_display = "—"
    preserve_filters = True

    def has_view_permission(self, request, obj=None):
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return super().has_delete_permission(request, obj)

    def has_module_permission(self, request):
        return super().has_module_permission(request)


class ReadOnlyModelAdmin(RoleBasedModelAdmin):
    """Admin for models owned by an external system (e.g. the dbt gold
    pipeline that writes ``stations`` / ``regions``).

    View-only: add/change/delete are disabled for **everyone**, so records
    can never be edited from the admin into a state the pipeline will overwrite
    on its next run. Visibility still follows the role matrix through
    ``has_view_permission`` — a user needs the ``view_*`` permission to see the
    data, but nobody (not even a superuser) can mutate it here.

    Editable operational data belongs in admin-owned models such as the future
    Station Details / Station Override, not in the reflected pipeline tables.
    """

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
