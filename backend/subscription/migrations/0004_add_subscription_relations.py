import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def delete_orphan_rows(apps, schema_editor):
    """Subscriptions and check uploads created before these relations existed
    cannot be assigned an owner, so remove the ones still missing one before
    the fields become required."""
    CheckUpload = apps.get_model("subscription", "CheckUpload")
    Subscription = apps.get_model("subscription", "Subscription")
    CheckUpload.objects.filter(
        models.Q(student__isnull=True) | models.Q(subscription__isnull=True)
    ).delete()
    Subscription.objects.filter(
        models.Q(teacher__isnull=True) | models.Q(student__isnull=True)
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("subscription", "0003_add_uuid_fields"),
        ("users", "0002_add_uuid_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name="subscription",
            name="access_cutoff",
        ),
        migrations.AddField(
            model_name="subscription",
            name="plan",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="subscription.subscriptionplan",
            ),
        ),
        migrations.AddField(
            model_name="subscription",
            name="teacher",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="users.teacher",
            ),
        ),
        migrations.AddField(
            model_name="subscription",
            name="student",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="users.student",
            ),
        ),
        migrations.AddField(
            model_name="checkupload",
            name="student",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="check_uploads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="checkupload",
            name="subscription",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="check_uploads",
                to="subscription.subscription",
            ),
        ),
        migrations.RunPython(delete_orphan_rows, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="subscription",
            name="teacher",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="users.teacher",
            ),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="student",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to="users.student",
            ),
        ),
        migrations.AlterField(
            model_name="checkupload",
            name="student",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="check_uploads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="checkupload",
            name="subscription",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="check_uploads",
                to="subscription.subscription",
            ),
        ),
    ]
