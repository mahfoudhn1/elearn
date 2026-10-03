# Planner — Phase 9: mobile (Expo Router, TS)

All work is in `riffaa-app/riffaaApp`. Conventions reused: zustand + persist
(`store/pomodoroStore.ts` pattern), `services/api/*` + `apiClient`, `theme/tokens`,
`services/i18n.ts` (ar/en/fr flat keys), `hooks/{useTranslation,useTheme,useDirection}`,
UI kit (`Sheet`, `SegmentedControl`, `Chip`, `Card`, `Row`, `Stack`, `AppText`,
`Badge`, `Button`, `ProgressBar`, `TextField`, `Screen`, `ScreenHeader`).

## Files

- `services/api/planner.ts` — typed client for `/api/planner/` (onboarding state +
  PUT, generate, current, diff, session PATCH/skip/DELETE, weekly report).
- `store/plannerStore.ts` — persisted cache of the current plan + sessions,
  `fetchedAt`, `lastDiff`; **offline queue** (`move`/`lock`/`skip`/`delete`) with
  optimistic local apply; `flush()` on reconnect via NetInfo (`startPlannerQueue`);
  `isStale()`. Server wins for fixed events (never queued), student wins for own
  sessions (optimistic + queued).
- `utils/plannerReasons.ts` — reason code → i18n key + compact numeric detail;
  activity/block-kind label maps.
- `components/planner/*` — `ReasonList`, `UnmetBanner`, `SessionActionsSheet`
  (Start/Move quick-shifts/Lock/Skip/Delete + reasons), `DiffSheet`
  ("What changed" added/removed/moved), `PlannerDayTimeline` (virtualized
  `FlatList`, memoized rows; locked busy blocks grayed), `PlannerPlanPanel`
  (orchestrator: stale badge, unmet banner, regenerate, Sheets).
- `app/planner/onboarding.tsx` — wizard, one step per group (routine → school →
  tutoring → preferences → confidence → exams), **only the `missing` steps** from
  `/onboarding/state/`, progress bar, resumable via an AsyncStorage draft, single
  `PUT /onboarding/` at the end.
- `app/planner/weekly.tsx` — planned vs actual per subject/activity, streak (reuses
  `useStudyStats`, i.e. the productivity endpoint), coarse exam-readiness, suggestions.
- `app/(tabs)/schedule.tsx` — added a **Tasks / Plan** `SegmentedControl`; the Plan
  view renders `PlannerPlanPanel` for the selected day, over the existing week strip.
- `services/i18n.ts` — added all planner + reason keys in **ar / en / fr**.

## RTL & performance
- Layouts use the UI kit's direction-aware components and `start/end` conventions;
  the new components avoid hard-coded `left/right`.
- Day timeline uses `FlatList` (`scrollEnabled={false}` inside the screen's
  `ScrollView`) with `memo`ized `TimelineRow`s; entry lists are `useMemo`ed.

## Offline behaviour
- Current plan is cached; the panel renders it while offline with a stale badge.
- Move/lock/skip/delete apply optimistically and queue; `flush()` retries in order
  and stops on the first network error, resyncing on success. `startPlannerQueue()`
  is initialised from the Schedule tab.

## Unmet demand
The backend plan payload has no `unmet` field, so the banner is derived
client-side from the weekly report's `INCREASE_ALLOCATION` suggestions
(`deficit_minutes`) and rendered as "you need X more min of Subject". A dedicated
unmet field would need a backend phase.

## Live-join (per your instruction)
`components/LiveTab.tsx` has a no-op join button. I did **not** fix it: the mobile
app has no reusable Jitsi-join helper (only meeting CRUD/token refresh in
`services/api/livestream.ts`), so this is not an "easy reuse". Left an explicit
`TODO(live)` describing what's missing (a `joinLiveRoom(roomName)` service +
in-app WebView/deep link, using `activeSession.Meeting.room_name`).

## Verification
- `tsc --noEmit` passes (via `node node_modules/typescript/bin/tsc`).
- `npx expo lint` could not run in this environment (`expo` binary not installed);
  CI's `npm run typecheck` + `npx expo lint` remain the gate.
- New routes are pushed with a cast (`as never`) because the local generated
  `.expo/types/router.d.ts` was stale; it is not committed.

## NOT in this phase
- Web UI parity, parent features.
- Full drag-and-drop move editor (quick-shift buttons instead).
- Backend `unmet` field (banner is derived).
