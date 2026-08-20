from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from .models import (
    DeviceFollower,
    FaqCategory,
    FaqQuestion,
    Institution,
    InstitutionContract,
    Regions,
    SensitiveGroup,
    Stations,
    StationReadingsGold,
    UserProfile,
    UserRole,
    faq_localized_map,
    user_role,
)

User = get_user_model()


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regions
        fields = [
            "id",
            "name",
            "region_code",
            "bbox",
            "has_weather_data",
            "has_pattern_station",
        ]


class StationSerializer(serializers.ModelSerializer):
    region = RegionSerializer(allow_null=True)
    coordinates = serializers.SerializerMethodField()
    aqi_pm2_5 = serializers.SerializerMethodField()

    class Meta:
        model = Stations
        fields = [
            "id",
            "name",
            "region",
            "coordinates",
            "is_station_on",
            "is_pattern_station",
            "aqi_pm2_5",
        ]

    @extend_schema_field(
        serializers.ListField(
            child=serializers.FloatField(allow_null=True),
            min_length=2,
            max_length=2,
        )
    )
    def get_coordinates(self, obj) -> list[float | None]:
        return [obj.latitude, obj.longitude]

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_aqi_pm2_5(self, obj) -> float | None:
        last_reading = (
            StationReadingsGold.objects.filter(station_id=obj.id)
            .order_by("-date_utc")
            .first()
        )
        return last_reading.aqi_pm2_5 if last_reading else None


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()


class MapSerializer(serializers.Serializer):
    aqi = serializers.FloatField()
    forecast_6h = serializers.JSONField()
    forecast_12h = serializers.JSONField()


class ForecastSerializer(serializers.Serializer):
    forecast_date = serializers.DateTimeField()
    aqi_level = serializers.JSONField()
    forecast_6h = serializers.JSONField()
    forecast_12h = serializers.JSONField()


class HistorySerializer(serializers.Serializer):
    historical_1d = serializers.JSONField()
    historical_7d = serializers.JSONField()
    historical_30d = serializers.JSONField()


class _RoleAssignmentMixin:
    """Enforce that only a superadmin may assign or modify the superadmin role."""

    def _acting_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def validate_role(self, value):
        acting_user = self._acting_user()
        acting_is_superadmin = (
            acting_user is not None and user_role(acting_user) == UserRole.SUPERADMIN
        )

        if value == UserRole.SUPERADMIN and not acting_is_superadmin:
            raise serializers.ValidationError(
                "Only a superadmin may assign the superadmin role."
            )

        target = getattr(self, "instance", None)
        if (
            target is not None
            and user_role(target) == UserRole.SUPERADMIN
            and value != UserRole.SUPERADMIN
            and not acting_is_superadmin
        ):
            raise serializers.ValidationError(
                "Only a superadmin may modify a superadmin's role."
            )

        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """Read representation of a platform user (auth user + platform role)."""

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.STR)
    def get_role(self, obj) -> str:
        return user_role(obj)


class AdminUserCreateSerializer(_RoleAssignmentMixin, serializers.ModelSerializer):
    """Create a platform user with a hashed password and a unique email."""

    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this email already exists.",
            )
        ]
    )
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    role = serializers.ChoiceField(
        choices=UserRole.choices, required=False, default=UserRole.VIEWER
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "is_active",
        ]

    @transaction.atomic
    def create(self, validated_data):
        role = validated_data.pop("role", UserRole.VIEWER)
        password = validated_data.pop("password")
        email = validated_data["email"]
        # The default Django user requires a username; keep it in sync with email.
        user = User(username=email, **validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user, role=role)
        return user

    def to_representation(self, instance):
        return AdminUserSerializer(instance, context=self.context).data


class AdminUserUpdateSerializer(_RoleAssignmentMixin, serializers.ModelSerializer):
    """Update profile information, role and status of a platform user."""

    email = serializers.EmailField(
        required=False,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this email already exists.",
            )
        ],
    )
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    role = serializers.ChoiceField(choices=UserRole.choices, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "is_active",
        ]

    @transaction.atomic
    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)
        email = validated_data.get("email")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if email:
            instance.username = email
        if password is not None:
            instance.set_password(password)
        instance.save()

        if role is not None:
            profile, _ = UserProfile.objects.update_or_create(
                user=instance, defaults={"role": role}
            )
            # Refresh the cached reverse relation so the response reflects the
            # new role (validate_role may have cached the old profile).
            instance.profile = profile
        return instance

    def to_representation(self, instance):
        return AdminUserSerializer(instance, context=self.context).data


class FaqQuestionSerializer(serializers.ModelSerializer):
    """Serializes a question into the `{ q: {es, en, pt}, a: {...} }` shape the
    frontend already uses for its bundled seed, so the two are interchangeable.

    The Spanish fallback is applied here rather than in the frontend so the rule
    lives in one place; an untranslated question ships Spanish text under every
    language key instead of an empty string.
    """

    q = serializers.SerializerMethodField()
    a = serializers.SerializerMethodField()

    class Meta:
        model = FaqQuestion
        fields = ["id", "q", "a"]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_q(self, obj):
        return faq_localized_map(obj, "question")

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_a(self, obj):
        return faq_localized_map(obj, "answer")


class FaqCategorySerializer(serializers.ModelSerializer):
    """Serializes a category with its published questions nested.

    ``id`` is the slug, not the primary key: the public page uses it as the
    anchor (``#sensor``), so it must survive rows being recreated.
    """

    id = serializers.CharField(source="slug")
    label = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = FaqCategory
        fields = ["id", "label", "questions"]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_label(self, obj):
        return faq_localized_map(obj, "label")

    @extend_schema_field(FaqQuestionSerializer(many=True))
    def get_questions(self, obj):
        published = [q for q in obj.questions.all() if q.is_published]
        return FaqQuestionSerializer(published, many=True).data


class InstitutionContractSerializer(serializers.ModelSerializer):
    """Contract summary nested under the institution's own dashboard view."""

    station_name = serializers.CharField(source="station.name", read_only=True)

    class Meta:
        model = InstitutionContract
        fields = [
            "id",
            "station",
            "station_name",
            "contract_status",
            "start_date",
            "end_date",
            "monthly_fee",
            "signed_contract_url",
        ]
        read_only_fields = fields


class InstitutionSerializer(serializers.ModelSerializer):
    """Self-service representation of an institution for its own dashboard.

    Distinct from any future backoffice serializer: this is what an
    institutional user sees about *their own* institution, so it never nests
    other institutions' data.
    """

    contract = serializers.SerializerMethodField()

    class Meta:
        model = Institution
        fields = [
            "id",
            "legal_name",
            "display_name",
            "institution_type",
            "contact_name",
            "contact_email",
            "contact_phone",
            "address",
            "city",
            "contract",
        ]
        read_only_fields = fields

    @extend_schema_field(InstitutionContractSerializer(allow_null=True))
    def get_contract(self, obj):
        contract = getattr(obj, "contract", None)
        return InstitutionContractSerializer(contract).data if contract else None


class InstitutionLoginSerializer(serializers.Serializer):
    """Validates institutional-dashboard login credentials.

    Authenticates through the platform's existing ``authenticate()`` call —
    same ``AUTHENTICATION_BACKENDS`` (including axes lockout), same
    ``accounts.User`` model and password hasher as the admin login — so this
    is a new entry point, not a new authentication mechanism.

    Whether the authenticated user actually has an institution to access is
    checked in the view rather than here, so that case can be rejected with
    403 instead of being folded into the 400 this raises for bad credentials.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request, username=attrs["email"], password=attrs["password"]
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.")
        attrs["user"] = user
        return attrs


class SensitiveGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensitiveGroup
        fields = ["key", "label", "emoji"]
        read_only_fields = fields


class DashboardLocationSerializer(serializers.Serializer):
    city = serializers.CharField(allow_blank=True, allow_null=True)
    specific_location = serializers.CharField(allow_blank=True, allow_null=True)
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)


class DashboardSensorSerializer(serializers.Serializer):
    """The institution's assigned sensor, as shown on its dashboard."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.ChoiceField(choices=["online", "offline"])
    location = DashboardLocationSerializer()
    last_measurement_at = serializers.DateTimeField(allow_null=True)


class DashboardAirQualitySerializer(serializers.Serializer):
    """Current AQI plus the Proyecto Respira classification for it."""

    aqi = serializers.FloatField()
    category = serializers.CharField()
    category_label = serializers.CharField()
    message = serializers.CharField()
    recommendations = serializers.ListField(child=serializers.CharField())


class DashboardHistoryPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    aqi = serializers.FloatField(allow_null=True)


class InstitutionAlertConfigSerializer(serializers.Serializer):
    """The institution's alert configuration, or a controlled default.

    Backed by a plain dict built in the view rather than the model directly,
    so an institution with no ``InstitutionAlertConfig`` row still gets a
    valid, consistent shape (disabled, no threshold, no groups) instead of a
    missing section.
    """

    is_enabled = serializers.BooleanField()
    alert_threshold = serializers.IntegerField(allow_null=True)
    sensitive_groups = SensitiveGroupSerializer(many=True)


class InstitutionDashboardSerializer(serializers.Serializer):
    """Consolidated payload for the institutional dashboard's single request."""

    sensor = DashboardSensorSerializer()
    air_quality = DashboardAirQualitySerializer(allow_null=True)
    history = DashboardHistoryPointSerializer(many=True)
    alert_config = InstitutionAlertConfigSerializer()


class DeviceFollowerSerializer(serializers.ModelSerializer):
    """What a mobile installation gets back about the station it follows.

    ``station`` is resolved from the stored ``station_code`` on every read, so
    the id handed to the app is the one that is current *now* — ids move when
    dbt renumbers ``stations``. It is null when the code no longer matches any
    station, which tells the app the sensor is gone rather than silently
    pointing it at whichever station inherited the id.

    The push token is reported as a boolean rather than echoed back: these
    endpoints are unauthenticated, so anyone holding an installation id could
    otherwise read the device's token.
    """

    station = serializers.SerializerMethodField()
    station_name = serializers.SerializerMethodField()
    has_push_token = serializers.SerializerMethodField()

    class Meta:
        model = DeviceFollower
        fields = [
            "installation_id",
            "station",
            "station_code",
            "station_name",
            "has_push_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @staticmethod
    def _station(obj):
        # Cached on the instance so the two method fields below resolve the
        # station once per response instead of querying twice.
        if not hasattr(obj, "_resolved_station"):
            obj._resolved_station = obj.station
        return obj._resolved_station

    @extend_schema_field(OpenApiTypes.INT)
    def get_station(self, obj) -> int | None:
        station = self._station(obj)
        return station.id if station else None

    @extend_schema_field(OpenApiTypes.STR)
    def get_station_name(self, obj) -> str | None:
        station = self._station(obj)
        return station.name if station else None

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_has_push_token(self, obj) -> bool:
        return bool(obj.push_token)


class DeviceFollowerWriteSerializer(serializers.Serializer):
    """Validates a follow / update request from a mobile installation.

    Not a ``ModelSerializer``: the request speaks in station ids while the row
    stores ``station_code``, and the write itself goes through
    ``DeviceFollower.upsert`` so that creating and updating share one path.

    ``installation_id`` is declared here so it appears in the OpenAPI request
    body, but the view resolves it (header first, then query string, then body)
    before this serializer runs — a request may legitimately carry it in the
    header instead.
    """

    installation_id = serializers.UUIDField(
        required=False,
        help_text=(
            "UUIDv4 identifying the app installation. May be sent in the "
            "X-Installation-Id header instead, which is preferred."
        ),
    )
    station = serializers.PrimaryKeyRelatedField(
        queryset=Stations.objects.all(),
        required=False,
        help_text="Id of the station to follow.",
    )
    push_token = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Current FCM/APNs token. Send an empty string to clear it.",
    )

    def __init__(self, *args, require_station=False, **kwargs):
        # Registration needs a station; a partial update may carry only a
        # refreshed push token, so the requirement is set by the caller
        # rather than baked into the field.
        super().__init__(*args, **kwargs)
        self._require_station = require_station

    def validate_station(self, value):
        if not value.station_code:
            # A follower row addresses its station by code, so a station the
            # pipeline has not assigned one to cannot be followed at all —
            # same limitation the admin's activate/deactivate action hits.
            raise serializers.ValidationError(
                "This station has no station code yet and cannot be followed."
            )
        return value

    def validate(self, attrs):
        if self._require_station and "station" not in attrs:
            raise serializers.ValidationError({"station": "This field is required."})
        if not self._require_station and not (attrs.keys() & {"station", "push_token"}):
            raise serializers.ValidationError(
                "Provide at least one of 'station' or 'push_token'."
            )
        return attrs
