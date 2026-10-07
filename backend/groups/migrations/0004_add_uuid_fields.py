import uuid

from django.db import migrations, models

MODELS = [
    "Group",
    "GroupCourse",
    "Question",
    "Quiz",
    "QuizAttempt",
    "Schedule",
    "StudentAnswer",
    "StudentGroupRequest",
    "Video",
]


def _add_fields():
    return [
        migrations.AddField(
            model_name=name.lower(),
            name="uuid",
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                null=True,
            ),
        )
        for name in MODELS
    ]


def _make_unique():
    return [
        migrations.AlterField(
            model_name=name.lower(),
            name="uuid",
            field=models.UUIDField(
                db_index=True,
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        )
        for name in MODELS
    ]


def generate_uuids(apps, schema_editor):
    """Give every existing row a unique uuid before the unique index is added."""
    for name in MODELS:
        model = apps.get_model("groups", name)
        last_pk = 0
        while True:
            batch = list(model.objects.filter(pk__gt=last_pk).order_by("pk")[:500])
            if not batch:
                break
            for obj in batch:
                obj.uuid = uuid.uuid4()
            model.objects.bulk_update(batch, ["uuid"])
            last_pk = batch[-1].pk


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0003_examdate_scheduledtask_studentblackout_and_more"),
    ]

    operations = [
        *_add_fields(),
        migrations.RunPython(generate_uuids, migrations.RunPython.noop),
        *_make_unique(),
    ]
