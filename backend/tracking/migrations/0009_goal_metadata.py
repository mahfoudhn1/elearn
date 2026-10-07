from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tracking", "0008_add_goal_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="goal",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
