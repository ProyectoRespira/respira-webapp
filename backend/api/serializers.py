from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from .models import (
    Regions,
    Stations,
    StationReadingsGold,
    UserProfile,
    UserRole,
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
        write_only=True, validators=[validate_password], style={"input_type": "password"}
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
