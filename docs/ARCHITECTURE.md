# Riffaa / Elearn — system architecture

Technical architecture for the platform. Scope: the **Django backend** and the
**Expo mobile app**. The product-level overview is `../PROJECT_OVERVIEW.md`; the
web client (`../frontend/elearn`) is a sibling client over the same API and is
only mentioned where it affects the shared contract.

Deep dives:
- Planner engine → `planner/ENGINE.md`
- Assessment mastery → `assessment/MASTERY.md`
- Mobile auth/data layer → `mobile/ARCHITECTURE.md`
- Courses → `../COURSE_FUNCTIONALITY.md`; scheduling/Pomodoro →
  `../SCHEDULING_SYSTEM.md`; tracking → `tracking.md`

## 1. System context

```
        Expo app (mobile)              Next.js app (web)
        riffaa-app/riffaaApp           frontend/elearn
                │                              │
                └──────────────┬───────────────┘
                               ▼
                HTTPS  /api/…        WSS  /riffaa/ws/…
                               │
                     ┌─────────┴──────────┐
                     │  Django 5 + DRF    │
                     │  Channels (ASGI)   │
                     │  Daphne / proxy    │
                     └─────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         PostgreSQL          Redis         External APIs
         (source of      (channel layer)  Zoom, Jitsi JWT,
          truth)                           DeepSeek, R2,
                                           Resend, Telegram,
                                           Google OAuth,
                                           Turnstile
```

The backend is the single source of truth: all business rules, gating and
computation live there. Clients render and cache it.

## 2. Backend composition

Project = `backend/`, settings in `core/` (`core/settings.py`). One Django app
per domain, mounted in `core/urls.py:22`:

| Group | Apps |
|---|---|
| Identity & taxonomy | `users`, `subscription` |
| Content & classes | `courses`, `groups`, `privetsessions`, `languagesteaching`, `media_assets` |
| Live | `jitsi`, `livestream` (Zoom) |
| Learning tools | `flashcards`, `notes`, `riffaaAi`, `studentform`, `froms` (unrouted) |
| Study intelligence | `schedule`, `tracking`, `planner`, `assessment` |
| Comms | `chat`, `notifications` |

### Cross-cutting foundations (`core/`)

- **UUID public IDs** — `core/models.py:UUIDModel` adds an indexed `uuid`;
  `core/serializers.py:UUIDModelSerializer` exposes it as `id` and makes
  relations uuid-based; `core/views.py:UUIDLookupMixin` makes detail routes look
  up by uuid (integer PKs stay internal). Exceptions: notifications and part of
  `privetsessions` still use integer PKs.
- **Auth** — SimpleJWT. `core/authentications.py:JWTAuthenticationWithCookies`
  accepts the `Authorization` header or the `access_token` cookie. Access 1h /
  refresh 7d, rotation + blacklist. DRF default permission is `IsAuthenticated`;
  public endpoints opt out. Token endpoints: `/api/token/`, `/api/token/refresh/`.
- **Realtime (ASGI)** — `core/routing.py` routes
  `riffaa/ws/notifications/` → `NotificationConsumer` and
  `riffaa/ws/chat/<group_uuid>/` → `ChatConsumer`. Redis backs the channel layer;
  `notifications/middleware.py:JWTAuthMiddleware` authenticates the socket from
  the `access_token` cookie.
- **Config** — `.env` driven; `DJANGO_ENV=production|development` toggles DEBUG,
  SSL/HSTS, cookie security and CORS. Admin at an obfuscated path. Media/static
  served under `/api/media/`, `/api/static/` in production.
- **No Celery** — all async work is signal- or request-driven. Subscription
  expiry is computed on read; stale Pomodoro sessions self-heal lazily.

### Layering convention for the intelligence domains

`planner` and `assessment` share a strict layering (the strongest convention in
the repo):

```
pure engine(s)   no Django / DB / clock / randomness  → golden-tested
   ▲
adapters + services   the only ORM/DTO boundary, transactions, persistence
   ▲
views / serializers   thin HTTP; scope to caller; return codes+params
```

This is what makes the study-plan and mastery output deterministic and
explainable. See `planner/ENGINE.md` and `assessment/MASTERY.md`.

## 3. Request lifecycle

1. Client sends `Authorization: Bearer <access>` (or cookie) to `/api/...`.
2. `JWTAuthenticationWithCookies` resolves the user; `IsAuthenticated` (default)
   gates the view.
3. Router resolves the route; `UUIDLookupMixin` resolves uuid → object.
4. Serializer validates input; the view scopes the queryset to the caller
   (e.g. own student/teacher) and delegates to a service for complex writes.
5. Service performs the transaction (often calling a pure engine) and writes;
   signals fan out side effects (notification, mastery recompute, mirroring).
6. Response is serialized JSON with `id` as the uuid.

## 4. Auth & realtime model

- **HTTP**: JWT bearer (mobile) / cookie (web); refresh with rotation+blacklist.
  Mobile refreshes via a single-flight interceptor (`mobile/ARCHITECTURE.md` §4).
- **WebSocket**: the notification and chat consumers authenticate from the
  `access_token` cookie via middleware; notifications write a row and
  `group_send` to `notifications_<user_id>`, chat uses per-group rooms.

## 5. The study-OS loop

The newest and most integrated cross-app flow. `tracking`, `schedule`,
`planner` and `assessment` form a closed loop:

```
              ┌────────────────────────────────────────────┐
              ▼                                            │
  planner generate ──► StudyPlan + PlannedSession           │
        │                    │ mirrored                      │
        │                    ▼                               │
        │        schedule.PersonalScheduleItem               │
        │                    │ start (server-owned clock)    │
        │                    ▼                               │
        │              schedule.StudySession ──close──► tracking.ActivityEvent
        │                    │                               │ (STUDY_SESSION)
        │                    │ history write-back            ▼
        │                    │                        tracking.DailyActivity
        │                    │                        + StudyGoal / Goal
        │                    ▼                               │
        │        assessment: QuizAttempt/FlashcardReview     │
        │                    │                               │
        │                    ▼                               │
        │              Evidence (append-only)                │
        │                    │ signal                        │
        │                    ▼                               │
        │              TopicMastery cache ──► readiness ─────┤
        │                    │ band change → mastery_replan  │
        └────────────────────┴───────────────────────────────┘
                       planner consumes mastery summary
```

1. Onboarding builds `StudentPlannerProfile` (goals, commitments, wake/sleep).
2. `/api/planner/plans/generate/` runs the pure engine → `StudyPlan` +
   `PlannedSession`s, mirrored into `schedule.PersonalScheduleItem`.
3. The student starts a session → `schedule` owns the Pomodoro clock; on close it
   mirrors a `STUDY_SESSION` `ActivityEvent` into `tracking`.
4. `tracking` rolls activity into `DailyActivity` and evaluates `StudyGoal`/`Goal`.
5. Quizzes/flashcards write `Evidence` → `TopicMastery` → readiness.
6. A confidence-band change triggers a debounced planner replan
   (`assessment/mastery_replan.py` → `replan_service`).
7. Planner sessions can link a practice quiz, closing the loop.

Details: `planner/ENGINE.md` §4–7, `assessment/MASTERY.md` §3/§6,
`tracking.md`, `../SCHEDULING_SYSTEM.md`.

## 6. Client relationship

| Backend area | Mobile | Web |
|---|---|---|
| Auth / users | `services/auth.ts`, `services/api/client.ts` | `app/lib/axiosInstance.ts`, Redux `auth` slice |
| Courses | `services/api/courses.ts`, `hooks/useCourses.ts` | `app/courses/*`, `courses.ts` |
| Groups / live | `services/api/groups.ts`, `livestream.ts`, `chat.ts` | `groupsApi(.Server).ts`, Jitsi/Zoom SDKs |
| Schedule / Pomodoro | `services/api/schedule.ts`, `store/pomodoroStore.ts` | schedule pages |
| Tracking / goals | `services/api/tracking.ts`, `hooks/queries/useStudyStats.ts` | (partial) |
| Planner | `services/api/planner.ts`, `store/plannerStore.ts` | (staff/admin only) |
| Assessment | `services/api/assessment.ts`, `app/assessment/*` | (partial) |
| Realtime | Notification provider (hardcoded `wss://riffaa.com`) | two duplicated WS providers |

Shared contract conventions: uuid ids, `{code, params}` reason payloads the
client translates, and a default-authenticated API.

## 7. Deployment / runtime assumptions

- PostgreSQL + Redis required; Daphne/ASGI behind a proxy.
- Production domain `riffaa.com`; clients default to
  `https://riffaa.com/api` when no env override is set.
- No CI, no docker/compose, no documented deployment in-repo. See
  `../PROJECT_OVERVIEW.md` §7 and `TO_VERIFY.md`.

## 8. Known architectural risks

- Secrets in source (Telegram token, R2 bucket) and `.env` files partially
  committed.
- No background worker despite periodic needs (handled lazily).
- Contract drift/typos shared by clients: `livestream/signiture/`, `privet/`,
  `groups/Noroup_students/`.
- Inconsistent public-id strategies (uuid vs integer PK).
- Clients duplicate concerns (three axios layers on web; two data styles on
  mobile); no automated tests on either client.
