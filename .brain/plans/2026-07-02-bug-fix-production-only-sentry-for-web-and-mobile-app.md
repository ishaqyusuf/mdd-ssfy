# Plan: Production-Only Sentry For Web And Mobile App

## Type
Bug Fix

## Status
Implemented

## Created Date
2026-07-02

## Last Updated
2026-07-20

## Goal Or Problem
Sentry should be disabled in local/development runtimes and enabled in production across the Next.js web app and Expo mobile app. The current web client initializes Sentry unconditionally with a hardcoded DSN, while the Expo app does not have Sentry wiring yet.

## Current Context
- `apps/dashboard` already depends on `@sentry/nextjs` and has `next.config.mjs`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, and `src/app/global-error.tsx`.
- `apps/dashboard/next.config.mjs` only applies `withSentryConfig` in production, matching the broad Midday pattern.
- `apps/dashboard/sentry.server.config.ts` and `apps/dashboard/sentry.edge.config.ts` guard initialization with `process.env.NODE_ENV === "production"`, but do not set `environment` or `enabled` inside `Sentry.init`.
- `apps/dashboard/src/instrumentation-client.ts` initializes Sentry on every client load and uses a hardcoded DSN instead of `process.env.NEXT_PUBLIC_SENTRY_DSN`.
- Midday reference: `/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/dashboard` keeps Sentry config files loaded but sets `dsn`, `environment`, and `enabled: process.env.NODE_ENV === "production"` in client/server/edge init, and applies source-map upload only in production.
- Al-ghurobaa reference: `/Users/M1PRO/Documents/code/al-ghurobaa/apps/mobile` uses `@sentry/react-native`, an app-local `src/lib/sentry.ts`, `initSentry()` in `src/app/_layout.tsx`, `Sentry.wrap(RootLayout)`, the Expo config plugin, and Sentry-aware Metro config.

## Proposed Approach
Align the web app with Midday by using environment-based DSNs and explicit `enabled` flags in all Sentry init points, while preserving production-only source-map upload in `next.config.mjs`. Add Expo app Sentry using the al-ghurobaa shape, but make production the default enabled runtime so development builds stay silent even when a DSN is present.

## Visual Plan
```mermaid
flowchart TD
  A["Audit current GND Sentry setup"] --> B["Align apps/dashboard init with Midday"]
  B --> C["Remove hardcoded client DSN"]
  C --> D["Add Expo app Sentry package and wrapper"]
  D --> E["Gate mobile Sentry by production runtime"]
  E --> F["Validate development stays disabled"]
  F --> G["Validate production build/runtime captures errors"]
```

## Implementation Steps
- Update `apps/dashboard/src/instrumentation-client.ts` to use `process.env.NEXT_PUBLIC_SENTRY_DSN`, `environment: process.env.NODE_ENV`, and `enabled: process.env.NODE_ENV === "production"`; keep replay sampling production-friendly.
- Update `apps/dashboard/sentry.server.config.ts` and `apps/dashboard/sentry.edge.config.ts` to use the Midday-style `environment` and `enabled` fields instead of relying only on an outer production guard.
- Keep `apps/dashboard/next.config.mjs` production-only `withSentryConfig`, and consider adding Midday's release/source-map cleanup options when `SENTRY_RELEASE` or `GIT_COMMIT_SHA` is available.
- Confirm `apps/dashboard/src/app/global-error.tsx` remains production-only for manual exception capture.
- Add `@sentry/react-native` to `apps/mobile` and wire the Expo config plugin in `apps/mobile/app.config.ts` using `SENTRY_ORG` and `SENTRY_PROJECT_MOBILE` or `SENTRY_PROJECT`.
- Add `apps/mobile/src/lib/sentry.ts` based on al-ghurobaa, using `EXPO_PUBLIC_SENTRY_DSN`, production-only default enablement, optional debug override, app variant/environment tagging, and Expo update tags.
- Wrap the Expo root layout in `Sentry.wrap(RootLayout)` and call `initSentry()` once before app render in `apps/mobile/src/app/_layout.tsx`.
- Merge `@sentry/react-native/metro` with the existing NativeWind/custom singleton resolver in `apps/mobile/metro.config.js`.
- Update `apps/mobile/scripts/update-preview.mjs` only if mobile source-map upload is intended for preview/production OTA releases.

## Affected Files Or Areas
- `apps/dashboard/src/instrumentation-client.ts`
- `apps/dashboard/sentry.server.config.ts`
- `apps/dashboard/sentry.edge.config.ts`
- `apps/dashboard/next.config.mjs`
- `apps/dashboard/src/app/global-error.tsx`
- `apps/mobile/package.json`
- `apps/mobile/app.config.ts`
- `apps/mobile/metro.config.js`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/lib/sentry.ts`
- `apps/mobile/scripts/update-preview.mjs`
- `bun.lock`
- Environment variables: `NEXT_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_PROJECT_MOBILE`, `SENTRY_AUTH_TOKEN`, optional `SENTRY_RELEASE`

## Acceptance Criteria
- Local `bun run dev --filter dashboard` does not initialize or send browser, server, edge, request, or global-error events to Sentry.
- Production `apps/dashboard` initializes Sentry on client, server, and edge when `NEXT_PUBLIC_SENTRY_DSN` is present.
- Web Sentry DSN is not hardcoded in source.
- Local `bun run dev --filter mobile dashboard` / development Expo builds do not initialize or send events to Sentry by default.
- Production mobile builds initialize Sentry when `EXPO_PUBLIC_SENTRY_DSN` is present.
- Expo app root is wrapped with Sentry error handling without changing navigation or provider order.
- Source map upload remains production-only and does not run during local development.

## Test Plan
- Run `bun run --filter @gnd/dashboard typecheck`.
- Run `bun run --filter @gnd/mobile typecheck` if available, otherwise run the narrowest Expo TypeScript check used by the package.
- In development, temporarily trigger the existing web Sentry example route or a controlled client error and verify no Sentry network request/event is sent.
- In a production-env local smoke (`bun run dev --prod --filter dashboard api` or production build equivalent), verify Sentry initialization sees `enabled: true` when DSNs are configured.
- Start the Expo app in development and verify the Sentry init guard exits before `Sentry.init`.
- For production/preview mobile release validation, run the project's existing EAS update/build dry run where available and confirm source-map upload behavior matches the selected release policy.

## Risks / Edge Cases
- If `process.env.NODE_ENV` is not `production` for preview builds, preview builds will stay disabled unless explicitly allowed.
- The Expo Metro config already has a custom resolver; Sentry's Metro wrapper must be composed without losing the existing NativeWind and singleton-package behavior.
- Missing DSNs should result in no-op behavior, not runtime crashes.
- `onRequestError` and router transition exports should remain compatible with Next.js even when Sentry is disabled.
- Source-map upload requires valid `SENTRY_AUTH_TOKEN`, org, and project values only in production/release workflows.

## Decisions
- Only production web deployments and production Expo builds send Sentry events. Preview and local/development environments do not receive the DSNs/enabled flag needed to send.
- Web releases use `SENTRY_RELEASE`, then `VERCEL_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`; uploaded source maps are deleted from the deployment artifact.
- Web and mobile use separate Sentry projects under `gnd-52`: `gnd-prodesk-web` and `gnd-prodesk-mobile`.
- The Expo production build profile explicitly selects the EAS `production` environment and `APP_VARIANT=production`.

## Implementation Evidence
- Web client/server/edge initialization now uses environment DSNs, explicit production enablement, and `0.1` trace sampling.
- The hardcoded legacy web DSN was removed.
- `withSentryConfig` remains production-only and now has release tagging, production source-map upload credentials, current debug-log tree shaking, and post-upload source-map deletion.
- Expo now uses `@sentry/react-native`, the Expo config plugin, Sentry-aware Metro serialization composed with the existing NativeWind singleton resolver, one-time initialization, Expo update tags, and `Sentry.wrap(RootLayout)`.
- Vercel Production contains the new web DSN, organization, web project slug, and organization build token.
- Expo Production contains the mobile DSN, enable/debug flags, organization, mobile project slug, and secret build token.
- Root and app-local `.env.local` files are explicitly disabled for mobile telemetry; production env files contain the matching production values.

## Validation Evidence
- Production Expo config import resolved `gnd-52` / `gnd-prodesk-mobile`.
- Metro config import confirmed the Sentry serializer and the composed custom resolver.
- Production Next config import completed without Sentry deprecation warnings.
- Sentry, Vercel, and Expo dashboards were inspected after writes and showed the expected projects, production scopes, and masked secrets.
- No dev server, full build, broad typecheck, or synthetic production error was run.

## Linked Task
- Task Title: Production-Only Sentry For Web And Mobile App
- Task File: brain/tasks/roadmap.md
