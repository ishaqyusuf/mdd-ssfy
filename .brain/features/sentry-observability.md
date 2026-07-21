# Sentry Observability

## Purpose

GND sends production errors, traces, logs, and supported replay/update context to separate Sentry projects for the Next.js web app and Expo mobile app. Local development and preview environments stay silent.

## Projects

- Organization: `gnd-52`
- Web project: `gnd-prodesk-web`
- Mobile project: `gnd-prodesk-mobile`

Web and mobile are intentionally separated so issue ownership, releases, source maps, and platform-specific diagnostics remain distinct.

## Web Runtime

- Client, server, and edge use `NEXT_PUBLIC_SENTRY_DSN`.
- `Sentry.init` is enabled only when `NODE_ENV === "production"`.
- Trace sampling is `0.1`; client replay keeps `0.1` session sampling and `1.0` error sampling.
- `withSentryConfig` runs only for production builds.
- Release order is `SENTRY_RELEASE`, `VERCEL_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`.
- Source maps upload with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`, then are deleted from the deployment artifact.

## Mobile Runtime

- Runtime DSN: `EXPO_PUBLIC_SENTRY_DSN`.
- Initialization requires `EXPO_PUBLIC_SENTRY_ENABLED=true` and a DSN.
- Development/local env uses `EXPO_PUBLIC_SENTRY_ENABLED=false`.
- Production EAS builds explicitly select the `production` EAS environment and `APP_VARIANT=production`.
- `@sentry/react-native/expo` receives `SENTRY_ORG` and `SENTRY_PROJECT_MOBILE`.
- Metro starts from `getSentryExpoConfig` and then composes NativeWind plus the existing singleton resolver.
- The root layout initializes once and is exported through `Sentry.wrap`.
- Events include Expo update id, embedded-update state, and runtime-version tags.

## Environment Ownership

- Vercel Production owns the web runtime DSN and web source-map credentials.
- Expo Production owns the mobile runtime DSN, enable/debug flags, mobile project metadata, and secret source-map token.
- Root `.env.local` / `.env.production` provide shared local tooling values.
- `apps/expo-app/.env.local` is disabled; `apps/expo-app/.env.production` is production-enabled.
- Tokens must never be committed. Example env files contain names and safe defaults only.

## Operational Notes

- Vercel environment changes apply on the next deployment.
- Expo environment changes apply on the next production EAS build/update that consumes the production environment.
- Preview monitoring is intentionally disabled. Add a separate preview Sentry policy instead of reusing production DSNs if preview telemetry becomes necessary.

## Updated

2026-07-20
