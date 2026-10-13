from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("planner", "0013_studyplan_engine_diagnostics_and_more")]

    operations = [
        migrations.AddField(
            model_name="plannedsession",
            name="rule_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
