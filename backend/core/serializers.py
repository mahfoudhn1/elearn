import uuid as uuid_module

from django.core.exceptions import ObjectDoesNotExist
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


class UUIDRelatedField(serializers.PrimaryKeyRelatedField):
    """Resolve and represent a relation by its ``uuid`` instead of its pk."""

    default_error_messages = {
        "required": _("This field is required."),
        "does_not_exist": _('Invalid pk "{pk_value}" - object does not exist.'),
        "incorrect_type": _("Incorrect type. Expected uuid value, received {data_type}."),
    }

    def use_pk_only_optimization(self):
        return False

    def get_attribute(self, instance):
        return super().get_attribute(instance)

    def to_internal_value(self, data):
        if data in ("", None) and self.allow_null:
            return None

        if isinstance(data, uuid_module.UUID):
            value = data
        elif isinstance(data, str):
            value = data.strip()
        else:
            self.fail("incorrect_type", data_type=type(data).__name__)

        try:
            return self.get_queryset().get(uuid=value)
        except ObjectDoesNotExist:
            self.fail("does_not_exist", pk_value=data)
        except (TypeError, ValueError):
            self.fail("incorrect_type", data_type=type(data).__name__)

    def to_representation(self, value):
        return str(value.uuid)


class UUIDModelSerializer(serializers.ModelSerializer):
    """ModelSerializer whose public identifiers are uuids.

    * every relational field accepts and emits uuids;
    * the model's primary key is exposed as ``id`` but holds the uuid value.
    """

    serializer_related_field = UUIDRelatedField

    def get_field_names(self, declared_fields, info):
        names = list(super().get_field_names(declared_fields, info))
        # ``uuid`` is an implementation detail; its value is surfaced as ``id``.
        if "uuid" in names and "uuid" not in declared_fields:
            names = [name for name in names if name != "uuid"]
        return names

    def build_standard_field(self, field_name, model_field):
        if field_name == "id":
            return serializers.UUIDField, {"source": "uuid", "read_only": True}
        return super().build_standard_field(field_name, model_field)

    def build_relational_field(self, field_name, relation_info):
        field_class, field_kwargs = super().build_relational_field(
            field_name, relation_info
        )
        if field_class is serializers.PrimaryKeyRelatedField:
            field_class = UUIDRelatedField
        return field_class, field_kwargs