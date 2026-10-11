# Mobile app architecture (Expo)

How the Expo client (`riffaa-app/riffaaApp/`) is wired: routing, the auth/session
lifecycle, the API layer, the state layers, and the offline patterns. Read
alongside `../../PROJECT_OVERVIEW.md` §5 and `../ARCHITECTURE.md`; the RTL/math
rendering spike lives in `00_math_rtl_spike.md`.

Stack: Expo SDK 57, React 19, RN 0.86, expo-router, TypeScript, Zustand,
TanStack Query v5, axios, NativeWind, i18n-js, expo-secure-store, NetInfo.
The backend is the single source of truth (`../../backend`); this app only renders
and caches it.

## 1. Directory map

```
app/                      expo-router file-based routes (see §2)
  _layout.tsx             providers + auth guard (single source of truth)
  (auth)/login.tsx, register.tsx
  (tabs)/                 home, courses, groups, schedule, profile,
                          notifications, explore
  course/[id].tsx         player/[lessonId].tsx     survey/[id].tsx
  planner/*               onboarding, weekly
  assessment/*            index, subject, quiz, results, diagnostic,
                          flashcards, planning-modes, fix, math-spike
  goals/*                 index, edit
  analytics.tsx           study-session.tsx   create-schedule.tsx
  dev-kit.tsx             (dev-only surface; bypasses the auth guard)

services/
  api/client.ts           axios instance + interceptors (§4)
  api/*.ts                one module per backend domain
  auth.ts                 session persistence + restore (§3)
  queryClient.ts          TanStack Query defaults + NetInfo/AppState (§5)
  connectivity.ts         sync offline snapshot for the non-React layer
  i18n.ts                 translations + setLocale
  notifications.ts        notification service helpers
  offline/                flashcardDeck.ts, flashcardQueue.ts (§6)

store/                    Zustand stores (§5)
  authStore.ts            in-memory auth (not persisted)
  settingsStore.ts        persisted theme/locale/glass preferences
  plannerStore.ts         persisted plan cache + offline action queue
  pomodoroStore.ts        running timer state
  plannerStore / pomodoroStore → see §5/§6

hooks/                    useBootstrap, useTheme, useTranslation,
                          useDirection, usePomodoro, queries/*
components/               ui/ design system, home/, planner/, analytics/,
                          assessment/, layout/
theme/tokens.ts           design tokens
types/                    shared TypeScript types
```

## 2. Routing and the auth guard

Routes are files under `app/` (expo-router). The root layout
(`app/_layout.tsx:35`) is the composition root and the only auth-routing source
of truth:

- `useBootstrap()` (`hooks/useBootstrap.ts:5`) runs `restoreSession()` once and
  writes the result into `authStore`.
- The guard is a **redirect during render**, not an effect
  (`app/_layout.tsx:96`):
  - no `user` and not in `(auth)` and not `dev-kit` → `<Redirect href="/login" />`
  - `user` present and in `(auth)` → `<Redirect href="/home" />`
- Redirecting during render stops protected screens from mounting (and firing
  authenticated requests) for a frame before login.

Route groups: `(auth)` and `(tabs)` are stacks; modals
(`create-schedule`, `study-session`, `survey/[id]`, `goals/edit`) and fade
transitions for detail screens are declared in the same `Stack`
(`app/_layout.tsx:126-210`).

Layout responsibilities:
- Holds the splash screen until fonts + `settingsStore.hasHydrated` + auth are
  ready (`app/_layout.tsx:81`).
- Provides `GestureHandlerRootView`, `SafeAreaProvider`,
  `QueryClientProvider`, theme vars and `direction` (RTL/LTR), `AppBackground`,
  `PomodoroRuntime` and `OfflineBanner`.
- Remounts the tree on `locale` change so every `translate()` re-evaluates
  (`app/_layout.tsx:110`).
- `ErrorBoundary` renders a friendly `ErrorState` for any route crash.

## 3. Auth and session lifecycle

Session storage: SecureStore key `riffaa-session`, a JSON `AuthSession`
(`services/api/auth.ts:9`) of `{ user, token, refreshToken? }`.

Flow:

1. **Sign in** — `signInWithEmail` / `signInWithGoogle`
   (`services/auth.ts:123`) call `services/api/auth.ts`, save the session with
   `saveSession()`, and return `{ session, profile }`.
2. **Register** — `signUpWithEmail` (`services/auth.ts:156`) posts to `register/`,
   signs in to obtain the JWT, then best-effort attaches onboarding fields
   (`wilaya`) via `students/`. Note: `captcha` defaults to `""`
   (`services/auth.ts:176`) even though the backend expects Turnstile.
3. **Bootstrap** — `restoreSession()` (`services/auth.ts:86`) reads SecureStore
   and re-validates against `users/me/`:
   - `401` → delete the session, return `null` (the interceptor already tried a
     refresh).
   - network error / server unreachable → keep the session and trust the stored
     profile.
   - any other error → keep the session with the stored profile.
4. **In-memory state** — `authStore` (`store/authStore.ts:24`) holds
   `user`, `session`, `loading`; it is **not** persisted. `clearAuth()` is called
   by the API interceptor when a refresh fails, which makes the root guard render
   login.
5. **Sign out** — `signOut()` deletes the SecureStore entry
   (`services/auth.ts:192`). (The backend `logout/` endpoint exists but is not
   called here.)

## 4. API layer (`services/api/client.ts`)

- `apiClient` is a single axios instance with `baseURL` from
  `EXPO_PUBLIC_API_URL` (fallback `https://riffaa.com/api`) and a 20s timeout
  (`client.ts:9`).
- **Request interceptor** (`client.ts:42`) reads the session from SecureStore
  and sets `Authorization` via `buildAuthorizationHeader()` (adds `Bearer ` only
  if absent).
- **Single-flight refresh** (`client.ts:102`): a module-level `refreshPromise`
  means parallel 401s share one `POST /token/refresh/`. The new access token is
  written back into the stored session.
- **Response interceptor** (`client.ts:141`): on `401` it retries the original
  request once (`config._retry`), never for the refresh call itself. If refresh
  fails it deletes the session and calls `useAuthStore.getState().clearAuth()`.
- **Error helpers**: `isNetworkError()` distinguishes "never reached the server"
  from a real HTTP error; `describeApiError()` uses `isDeviceOffline()` from
  `services/connectivity.ts` to choose between an "offline" and a "server
  unreachable" message (`client.ts:218-257`). `extractApiErrorMessage()` unwraps
  DRF payloads (`detail`, `non_field_errors`, `message`, `error`).
- `getAuthHeaders()` exposes raw auth headers for non-axios callers.

`services/api/index.ts` re-exports the domain modules. Rough endpoint ownership:

| Backend prefix | Mobile module |
|---|---|
| `users/` (auth, me, students, teachers) | `api/auth.ts` |
| `courses/` | `api/courses.ts` |
| `groups/` | `api/groups.ts` |
| `schedule/`, `study-sessions/`, `productivity/` | `api/schedule.ts` |
| `tracking/` | `api/tracking.ts` |
| `planner/` | `api/planner.ts` |
| `assessment/` | `api/assessment.ts` |
| `notifications/` | `api/notifications.ts` |
| `ai/` | `api/ai.ts` |

> `api/tracking.ts` also carries the study-session/Pomodoro calls
> (`startStudySession`, `pauseStudySession`, … `getExamReadiness`), so it
> straddles both the `tracking` and `schedule` backend apps.

## 5. State layers

The app mixes three patterns deliberately (and sometimes accidentally):

**Zustand** (client/global state):
- `authStore` — in-memory session/user (§3).
- `settingsStore` (`store/settingsStore.ts:41`) — **persisted** theme, locale,
  glass preferences; `hasHydrated` gates the splash.
- `plannerStore` (`store/plannerStore.ts:72`) — **persisted** plan cache +
  offline action queue (§6).
- `pomodoroStore` — running Pomodoro timer state.

**TanStack Query** (server state): configured by `createAppQueryClient()`
(`services/queryClient.ts:16`) with 60s staleTime, 10min gc, `refetchOnWindowFocus:
false`, 2 retries with exponential backoff, and **no retry on 4xx**. `setupQueryManagers()`
(`queryClient.ts:40`) wires `onlineManager` to NetInfo and `focusManager` to
`AppState`. Query hooks live in `hooks/` and `hooks/queries/` (courses,
schedule, notifications, assessment, goals, groups, teachers, study stats).

**Imperative `useEffect` fetches**: home, groups and explore still fetch
directly via the `services/api/*` functions (e.g. `app/(tabs)/home.tsx`). Many
`hooks/queries/*` hooks are unused. This is the main data-layer divergence.

## 6. Offline patterns

- `services/connectivity.ts` keeps a synchronous module-level `deviceOffline`
  snapshot so the non-React API layer can word errors correctly.
- `QueryClient` pauses/retries based on NetInfo (`queryClient.ts:40`).
- `components/OfflineBanner.tsx` + `OfflineNotice` surface connectivity.
- **Planner**: `plannerStore` applies `move/lock/skip/delete` optimistically
  locally, enqueues a `PendingPlannerAction` and flushes on reconnect
  (`store/plannerStore.ts:23`, `flush()`), keyed by `generateUuid()`.
- **Flashcards**: `services/offline/flashcardQueue.ts` queues reviews and replays
  them by idempotency key; the backend is idempotent on `client_review_id`.
- **Pomodoro**: `attachPomodoroNetworkRetry()` (`store/pomodoroStore.ts:226`)
  retries lifecycle calls after connectivity returns.

## 7. Design system, theme, i18n, RTL

- Design tokens live in `theme/tokens.ts`; UI primitives in `components/ui/*`
  (glass surfaces, Button, Card, Screen, Sheet, Text, …), re-exported from
  `components/ui/index.ts`. `tailwind.config.js` + `global.css` back NativeWind.
- Theme: `settingsStore.theme` → `colorScheme.set(theme)`; `useThemeVars()`
  injects CSS variables; `useTheme()` reads them.
- i18n: `services/i18n.ts` + `setLocale()` driven by `settingsStore.locale`;
  UI strings are bilingual AR/EN/FR. `useTranslation()` exposes `t`.
- RTL: `useDirection()` computes `isRTL` from the locale and the tree sets
  `direction` in styles — **never `I18nManager.forceRTL`**, and the tree remounts
  on locale change.
- Accessibility: OS "Reduce Transparency" feeds
  `applyAccessibilityReduceGlass` (`app/_layout.tsx:75`), and Android glass
  samples a single `blurTargetRef` (`SDK 57 BlurView` API).

## 8. Known divergences and caveats

- Two data-access styles (react-query vs imperative `useEffect`); several unused
  query hooks.
- Registration sends an empty Turnstile `captcha`.
- Livestream join is a no-op; chat has no history/realtime on mobile; assessment
  flashcards and planner use the newer patterns above.
- Heavy native deps (Jitsi/WebRTC/etc.) are installed but unused; the Supabase
  client is dead (`extra` keys absent from `app.json`).
- No tests / CI / error tracking.

See `../../PROJECT_OVERVIEW.md` §7 and `../ARCHITECTURE.md` for the shared
cross-client issues.
