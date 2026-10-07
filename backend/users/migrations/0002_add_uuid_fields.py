import uuid

from django.db import migrations, models

UUID_MODELS = [
    "FieldOfStudy",
    "Grade",
    "Payment",
    "PaymentHistory",
    "SchoolLevel",
    "Student",
    "Teacher",
]

USER_FIELDS = ["uuid", "verification_token"]


def _uuid_field(unique=False, null=False):
    return models.UUIDField(
        db_index=True,
        default=uuid.uuid4,
        editable=False,
        null=null,
        unique=unique,
    )


def _nullable_uuid_field():
    return models.UUIDField(default=uuid.uuid4, editable=False, null=True)


def _add_fields():
    operations = [
        migrations.AddField(
            model_name=name.lower(),
            name="uuid",
            field=_nullable_uuid_field(),
        )
        for name in UUID_MODELS
    ]
    operations += [
        migrations.AddField(
            model_name="user",
            name="uuid",
            field=_nullable_uuid_field(),
        ),
        migrations.AddField(
            model_name="user",
            name="verification_token",
            field=models.UUIDField(blank=True, default=uuid.uuid4, null=True),
        ),
    ]
    return operations


def _make_unique():
    operations = [
        migrations.AlterField(
            model_name=name.lower(),
            name="uuid",
            field=_uuid_field(unique=True),
        )
        for name in UUID_MODELS
    ]
    operations += [
        migrations.AlterField(
            model_name="user",
            name="uuid",
            field=_uuid_field(unique=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="verification_token",
            field=models.UUIDField(
                blank=True, default=uuid.uuid4, null=True, unique=True
            ),
        ),
    ]
    return operations


def generate_uuids(apps, schema_editor):
    """Give every existing row unique uuid values before the index is added."""
    for name in UUID_MODELS:
        model = apps.get_model("users", name)
        last_pk = 0
        while True:
            batch = list(model.objects.filter(pk__gt=last_pk).order_by("pk")[:500])
            if not batch:
                break
            for obj in batch:
                obj.uuid = uuid.uuid4()
            model.objects.bulk_update(batch, ["uuid"])
            last_pk = batch[-1].pk

    user_model = apps.get_model("users", "User")
    last_pk = 0
    while True:
        batch = list(user_model.objects.filter(pk__gt=last_pk).order_by("pk")[:500])
        if not batch:
            break
        for obj in batch:
            obj.uuid = uuid.uuid4()
            obj.verification_token = uuid.uuid4()
        user_model.objects.bulk_update(batch, USER_FIELDS)
        last_pk = batch[-1].pk


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        *_add_fields(),
        migrations.RunPython(generate_uuids, migrations.RunPython.noop),
        *_make_unique(),
    ]
