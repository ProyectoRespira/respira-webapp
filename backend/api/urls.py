from django.urls import path, include
from rest_framework.routers import DefaultRouter

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import (
    ActionLogViewSet,
    AdminUserViewSet,
    DeviceFollowerViewSet,
    FaqListView,
    InstitutionViewSet,
    StationViewset,
    RegionViewset,
    MapViewset,
    HealthCheckView,
    NearestRegionView,
    NearestStationView,
)

router = DefaultRouter()

router.register(r"regions", RegionViewset, basename="regions")
router.register(r"stations", StationViewset, basename="stations")
router.register(r"admin/users", AdminUserViewSet, basename="admin-users")
router.register(r"institution", InstitutionViewSet, basename="institution")
router.register(r"device-followers", DeviceFollowerViewSet, basename="device-followers")
# Top-level rather than nested under "institution/": the institution router
# entry matches any single path segment as a pk, so "institution/actions/"
# would be swallowed by institution-detail depending on registration order.
router.register(r"action-logs", ActionLogViewSet, basename="action-logs")

urlpatterns = [
    path(r"map/nearest-region/", NearestRegionView.as_view(), name="nearest-region"),
    path(r"stations/nearest/", NearestStationView.as_view(), name="nearest-station"),
    path(r"", include(router.urls)),
    path(r"faq/", FaqListView.as_view(), name="faq"),
    path(r"map/", MapViewset.as_view(), name="map"),
    path(r"health/", HealthCheckView.as_view(), name="health"),
    path(r"schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        r"schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
