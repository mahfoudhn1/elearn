import django.db.models.deletion
from django.db import migrations, models


def delete_orphan_meetings(apps, schema_editor):
    """Meetings created before the teacher relation existed cannot be assigned
    an owner, so remove the ones that are still missing a teacher before the
    field becomes required."""
    ZoomMeeting = apps.get_model("livestream", "ZoomMeeting")
    ZoomMeeting.objects.filter(teacher__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("livestream", "0002_add_uuid_fields"),
        ("groups", "0004_add_uuid_fields"),
        ("users", "0002_add_uuid_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="zoommeeting",
            name="group",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="groups.group",
            ),
        ),
        migrations.AddField(
            model_name="zoommeeting",
            name="teacher",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="users.teacher",
            ),
        ),
        migrations.RunPython(delete_orphan_meetings, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="zoommeeting",
            name="teacher",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="users.teacher",
            ),
        ),
    ]
