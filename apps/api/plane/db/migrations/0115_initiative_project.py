import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0114_remove_initiative_initiative_status_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="initiative",
            name="project",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="project_initiatives",
                to="db.project",
            ),
        ),
    ]
