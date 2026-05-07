from django.db import migrations, models


class Migration(migrations.Migration):
    # atomic=False is required because CREATE INDEX CONCURRENTLY cannot run
    # inside a transaction block. The constraint/unique_together operations run
    # on the brand-new, empty initiative_epics table so the lack of a wrapping
    # transaction is safe.
    atomic = False

    dependencies = [
        ("db", "0110_customproperty_acceptance_criteria"),
    ]

    operations = [
        # Reconcile InitiativeEpic constraint: 0109 created a named UniqueConstraint
        # but the model uses unique_together — remove the named one and add unique_together.
        migrations.RemoveConstraint(
            model_name="initiativeepic",
            name="unique_epic_per_initiative",
        ),
        migrations.AlterUniqueTogether(
            name="initiativeepic",
            unique_together={("epic",)},
        ),
        # Indexes on Initiative (new empty table — regular AddIndex is instant)
        migrations.AddIndex(
            model_name="initiative",
            index=models.Index(fields=["status"], name="initiative_status_idx"),
        ),
        migrations.AddIndex(
            model_name="initiative",
            index=models.Index(fields=["archived_at"], name="initiative_archived_at_idx"),
        ),
        # Indexes on the live issues table.
        # SeparateDatabaseAndState keeps Django's migration state correct while
        # running CONCURRENTLY at the DB level so writes are never blocked.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS issue_parent_idx ON issues (parent_id)",
                    reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS issue_parent_idx",
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="issue",
                    index=models.Index(fields=["parent"], name="issue_parent_idx"),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS issue_type_idx ON issues (type_id)",
                    reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS issue_type_idx",
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="issue",
                    index=models.Index(fields=["type"], name="issue_type_idx"),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS issue_project_type_idx ON issues (project_id, type_id)",
                    reverse_sql="DROP INDEX CONCURRENTLY IF EXISTS issue_project_type_idx",
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="issue",
                    index=models.Index(fields=["project", "type"], name="issue_project_type_idx"),
                ),
            ],
        ),
    ]
