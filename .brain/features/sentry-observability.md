# Sentry Observability

## Purpose

GND sends production errors, traces, logs, and supported replay/update context
to Sentry from the Next.js web app, Expo mobile app, Bun API, and Trigger.dev
jobs. Local development and preview environments stay silent.

## Projects

- Organization: `gnd-52`
- Web project: `gnd-prodesk-web`
- Mobile project: `gnd-prodesk-mobile`
- Backend project: `gnd-prodesk-backend` (API and jobs)

Web and mobile are intentionally separated so issue ownership, releases, source
maps, and platform-specific diagnostics remain distinct. API and jobs share one
backend project and use the `runtime=api|jobs` tag to preserve runtime-level
filtering without duplicating backend project administration.

## Web Runtime

- Client, server, and edge use `NEXT_PUBLIC_SENTRY_DSN`.
- `Sentry.init` is enabled only when `NODE_ENV === "production"`.
- Trace sampling is `0.1`; client replay keeps `0.1` session sampling and `1.0` error sampling.
- `withSentryConfig` runs only for production builds.
- Release order is `SENTRY_RELEASE`, `VERCEL_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`.
- Source maps upload with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`, then are deleted from the deployment artifact. Dashboard builds keep `widenClientFileUpload` disabled so Sentry uploads the required mapping set without widening the artifact scan to thousands of additional files.
- Route-level and root-level error boundaries capture production render failures.
- The legacy public `/api/sentry-example-api` always-throwing route is removed;
  controlled failures must not remain exposed in production.

## Mobile Runtime

- Runtime DSN: `EXPO_PUBLIC_SENTRY_DSN`.
- Initialization requires `EXPO_PUBLIC_SENTRY_ENABLED=true` and a DSN.
- Development/local env uses `EXPO_PUBLIC_SENTRY_ENABLED=false`.
- Production EAS builds and OTA updates explicitly select the `production` EAS environment and `APP_VARIANT=production`; preview releases continue forcing Sentry off.
- `@sentry/react-native/expo` receives `SENTRY_ORG` and `SENTRY_PROJECT_MOBILE`.
- Metro starts from `getSentryExpoConfig` and then composes NativeWind plus the existing singleton resolver.
- The custom app entry initializes Sentry before loading Expo Router so startup
  and route-discovery failures are observable; the root layout remains exported
  through `Sentry.wrap`.
- Events include Expo update id, embedded-update state, and runtime-version tags.
- `EXPO_PUBLIC_SENTRY_SMOKE_TEST=true` enables a one-shot startup verification
  event and explicit flush. It defaults to `false` and must only be enabled for
  controlled validation builds or updates.

## API Runtime

- `apps/api/src/instrument.ts` is imported before the Hono/tRPC application.
- Runtime DSN: `SENTRY_DSN`.
- Capture requires `NODE_ENV=production` and a DSN.
- Releases use `SENTRY_RELEASE`, then `VERCEL_GIT_COMMIT_SHA`, then
  `GIT_COMMIT_SHA`.
- tRPC captures only `INTERNAL_SERVER_ERROR`; expected client, authorization,
  conflict, and not-found responses are not reported.
- Hono captures unexpected errors while preserving explicit `HTTPException`
  responses.
- Events carry route/procedure metadata and `runtime=api`, but no request input,
  body, user, payment, customer, or default PII.
- A final SDK `beforeSend` scrub removes any automatically generated user
  identity and reduces request context to the HTTP method; the same scrub runs
  on transactions after OPTIONS traffic is dropped.
- The compiled Bun/Vercel artifact enables embedded source maps so emitted stack
  traces resolve to original source locations.

## Jobs Runtime

- `packages/jobs/src/tasks/init.ts` initializes the Node SDK and registers the
  Trigger.dev v4 global failure hook from the root of the configured
  `./src/tasks` directory so Trigger automatically loads it.
- Runtime DSN: `SENTRY_DSN`; capture requires production plus a DSN.
- Events carry `runtime=jobs`, task id, Trigger environment, run id, attempt,
  and deployment version.
- Task payloads are intentionally excluded because jobs process customer,
  sales, inventory, payment, and employee data.
- Trigger deploys use Sentry's esbuild plugin to upload source maps to
  `SENTRY_PROJECT_BACKEND`; uploaded map files are deleted from the artifact.

## Environment Ownership

- Vercel Production owns the web runtime DSN and web source-map credentials.
- Expo Production owns the mobile runtime DSN, enable/debug flags, mobile project metadata, and secret source-map token.
- The API deployment and Trigger Production environment each own the backend
  `SENTRY_DSN`.
- Trigger Production owns `SENTRY_PROJECT_BACKEND`, `SENTRY_ORG`, and the
  source-map upload token.
- Root `.env.local` / `.env.production` provide shared local tooling values.
- `apps/mobile/.env.local` is disabled; `apps/mobile/.env.production` is production-enabled.
- Development builds, preview builds, and preview OTA updates explicitly force
  mobile Sentry telemetry/debug/smoke flags off and set
  `SENTRY_DISABLE_AUTO_UPLOAD=true`, even when their wrappers load broader
  environment files.
- Tokens must never be committed. Example env files contain names and safe defaults only.

## Operational Notes

- Vercel environment changes apply on the next deployment.
- Dashboard `GET /api/health/live` is implemented and returns `204` with
  `Cache-Control: no-store`. On 2026-08-30 the authenticated production uptime
  monitor was changed from `/` every minute to `/api/health/live` every five
  minutes, assigned to the `production` environment, and its immediate monitor
  test passed. Historical root-check records can remain visible, but new checks
  must no longer fan out through login/auth work.
- Expo environment changes apply on the next `eas:build --prod` or `eas:update --prod` release that consumes the production environment.
- Preview monitoring is intentionally disabled. Add a separate preview Sentry policy instead of reusing production DSNs if preview telemetry becomes necessary.
- The authenticated Sentry audit on 2026-07-28 confirmed live web ingestion and
  releases. A controlled Android development-client run using production
  Sentry configuration created `GND-PRODESK-MOBILE-1` in the mobile project
  with environment `production`, release `1.0.305 (1)`, Expo runtime tags, and
  `verification=startup-smoke`. The event proves mobile ingestion and early
  startup capture, including capture before a separate baseline React renderer
  mismatch. Its stack remains minified because it was not a native release
  artifact.
- Native Android release validation then completed `assembleRelease` for a
  non-debuggable `1.0.305 (1)` APK, including a 10,273-module production bundle
  and locally generated Hermes/Metro source maps. The APK was installed on an
  Android 14 emulator and a fresh `verification=startup-smoke` event reached
  the authenticated mobile project as production release `1.0.305 (1)`.
- Source-map upload was explicitly disabled for the proof build because it
  transfers private application source to Sentry and requires user approval.
  The fresh native event is therefore intentionally minified. Upload and
  symbolication proof remain pending.
- After the verification event is emitted, the current mobile release fails in
  Expo Router with `ErrorBoundary` undefined. Sentry initializes before that
  failure; fixing the separate mobile dependency/runtime baseline is outside
  this observability rollout.
- Web, mobile, and backend each have a production-only high-priority issue
  alert connected to the corresponding project. Every rule notifies suggested
  assignees, falls through to recently active members, and throttles
  notifications to one per issue per hour.
- Vercel Production has `SENTRY_ENVIRONMENT=production`. Adding the backend
  `SENTRY_DSN` to the shared `prodesk-api` production environment still requires
  explicit approval for that production configuration change.
- Trigger Production still needs `SENTRY_DSN`, `SENTRY_PROJECT_BACKEND`,
  `SENTRY_ORG`, and the source-map token before jobs can report and deploy
  symbolicated events. A controlled backend ingestion event remains pending
  those deployment values.
- `packages/jobs/.env.example` documents the complete runtime and optional
  source-map environment contract without storing values.

## Updated

2026-08-30
