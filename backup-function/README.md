# Journal backup and recovery

The `backupJournal` function creates a private, complete snapshot of the journal in
Google Cloud Storage. A snapshot contains:

- every `about_my_day_entries` row for `sam-about-my-day`;
- matching `about_my_day_photos` metadata;
- every referenced photo file;
- SHA-256 checksums and byte counts in `complete.json`.

`complete.json` is written last. A snapshot without that file is incomplete and must
not be used for recovery. `latest.json` points to the most recent complete snapshot.
Snapshots are retained for 90 days by the bucket lifecycle policy.

## Verify backups

```powershell
gcloud storage cat gs://evocative-lodge-442118-j6-journal-backups/latest.json
gcloud storage ls gs://evocative-lodge-442118-j6-journal-backups/snapshots/**/complete.json
gcloud scheduler jobs describe journal-backup-daily --location=us-central1
```

The scheduled function runs every day at 2:00 AM in `America/New_York`. Google Cloud
logs an error when a run fails. Review recent runs with:

```powershell
gcloud functions logs read backupJournal --gen2 --region=us-central1 --limit=20
```

## Recover data

Never restore directly over live data without first downloading and reviewing the
snapshot. Download a complete snapshot to a new empty directory:

```powershell
gcloud storage cp --recursive "gs://evocative-lodge-442118-j6-journal-backups/SNAPSHOT_PREFIX/**" .\journal-recovery\
```

Check `complete.json`, then use the Supabase dashboard SQL Editor to restore a specific
entry from `entries.json`. Restore only the required row, preserving its exact `id`,
`project_id`, `date`, `child_name`, `staff_initials`, `blocks`, and `updated_at` values.
Photo recovery requires uploading the corresponding file under `photos/` back to the
`journal-photos` bucket at its original `storage_path`, then restoring its row from
`photos.json`.

For a full-disaster restore, create a new Supabase project first and import the snapshot
there. Do not test a bulk restore against the production project.

## Deployment settings

The function is private and invoked by Cloud Scheduler with OIDC. Its runtime service
account has write access only to the private backup bucket. The Supabase publishable key
is supplied as a function environment variable; no credentials are committed here.
Copy `deployment.env.example.yaml` to the ignored `deployment.env.yaml`, fill in its
values, and pass it to `gcloud functions deploy` with
`--env-vars-file=backup-function/deployment.env.yaml`.
