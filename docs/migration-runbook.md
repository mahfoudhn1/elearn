# Migration runbook: courses & tracking

Rolling out the courses/sections/video-upload/quizzes and tracking changes
without breaking already-installed web and mobile clients.

## 1. Backup

1. Snapshot the primary database (Postgres):
   - `pg_dump` to durable storage, or a managed snapshot.
2. Confirm the R2 bucket versioning/lifecycle is in place; no object writes are
   destructive in this release (new keys only).

## 2. Deploy the backend

1. Install dependencies and deploy the new code.
2. Apply migrations: `python manage.py migrate` (adds
   `courses.Section`, lesson video/section fields, survey settings,
   `SurveyAttempt`, `tracking` tables, and `UserLessonProgress.last_position_seconds`).
3. Keep the **deprecated aliases** mounted for one release cycle. The aliases
   that matter:
   - legacy `groups` course/quiz endpoints used by old web builds
     (`/groups/courses/<id>/`, `/groups/studentanswer/`);
   - any old `/api/productivity/*` call sites until clients update.
4. Verify: `python manage.py check`, run the test suite, and smoke-test
   `/api/courses/`, `/api/media/videos/`, and `/api/tracking/` in staging.

## 3. Release web

1. Deploy `frontend/elearn`. The student viewer now reads `params.id` and calls
   `/api/courses/<uuid>/` instead of the legacy groups API.
2. Confirm playback returns signed URLs and that a locked course shows the
   subscribe state and refuses a playback URL.
3. Watch failed-upload logs (`media_assets.uploads`) and R2 error logs
   (`media_assets.r2`) during the first uploads.

## 4. Release mobile

1. Ship the updated `riffaa-app` build (uuid string ids, signed playback with
   resume, quiz start/submit with attempts, batched activity events).
2. Because app-store rollout is staged, old builds may keep calling legacy
   endpoints during the cycle.

## 5. Wait one release cycle

Keep aliases for at least one full release cycle after the last client version
that used them is superseded. Monitor error rates on the aliases.

## 6. Remove deprecated aliases

1. Confirm no traffic remains on the legacy endpoints (gateway/access logs).
2. Remove the alias routes and their handlers.
3. Deploy and re-run the test suite.

## Rollback

- Backend is additive; rolling back the application code is safe while the new
  tables/columns remain. Do **not** reverse the data migrations unless the
  release is fully reverted, and never drop columns that the previous release
  still writes.
- The web fix is a plain redeploy. Mobile cannot be rolled back; ensure backend
  compatibility before shipping.

## Monitoring checklist

- Failed uploads logged by `media_assets.uploads` (init/complete failures and
  size mismatches).
- R2 client errors logged by `media_assets.r2`.
- Alert on a spike of `FAILED` `VideoAsset`s and on `media_assets.r2` errors.
