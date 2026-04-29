from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0107_migrate_filters_to_rich_filters"),
    ]

    operations = [
        migrations.AddField(
            model_name="issue",
            name="epic",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="epic_issues",
                to="db.issue",
            ),
        ),
    ]
