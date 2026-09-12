# Logly Analytics

## Purpose

GND uses first-party Logly analytics for the Dealership web surface and the Expo mobile app. Web and mobile use separate Logly projects so visits, events, countries, platforms, and release adoption remain independently reportable.

## Projects

- `gnd-web`: browser `site_visit`, `page_view`, and allowlisted dealership product events.
- `gnd-mobile`: iOS/Android `app_session`, `screen_view`, and allowlisted product events.

The product proxies fix the destination project and hold the ingest credentials. No Logly credential ships to browsers or mobile bundles.

## Web Flow

`apps/dealership` mounts the shared `@gnd/events/client` provider and posts sanitized batches to same-origin `POST /api/analytics`. The route validates the browser origin, fixes the `gnd-web` project, removes unapproved properties and routes, and forwards the trusted Vercel country header to Logly.

## Mobile Flow

`apps/mobile` mounts one analytics runtime at the root. It uses a random installation ID stored in Expo SecureStore, emits at most one `app_session` per UTC day, deduplicates screen views, retains stable event IDs in a bounded retry queue, and flushes on backgrounding. It records only `ios` or `android`, native app version/build, an allowlisted top-level route, and allowlisted primitive properties.

The mobile bundle posts to `EXPO_PUBLIC_LOGLY_ENDPOINT`, normally `https://api.gndprodesk.com/api/analytics/mobile`. `apps/api` validates the native batch, rejects browser-origin requests, fixes the `gnd-mobile` project, and forwards the hosting edge's country code. Country reflects the delivery network; GND does not request GPS or persist IP addresses.

## Privacy Boundary

Analytics must never contain email addresses, names, raw authenticated user IDs, form values, order/customer identifiers, or cross-project identity. Routes are reduced to an allowlisted first segment. Properties are restricted to `section`, `has_filters`, `status`, `action`, and `result`.

## Environment Contract

Server-only:

- `LOGLY_COLLECTOR_URL`
- `LOGLY_PROJECT_KEY`
- `LOGLY_MOBILE_PROJECT_KEY`
- `LOGLY_MOBILE_PROJECT=gnd-mobile`
- `GND_LOGLY_ORIGIN=https://dealers.gndprodesk.com`

Public configuration:

- `NEXT_PUBLIC_LOGLY_ENABLED=true`
- `NEXT_PUBLIC_LOGLY_PROJECT=gnd-web`
- `EXPO_PUBLIC_LOGLY_ENABLED=true`
- `EXPO_PUBLIC_LOGLY_PROJECT=gnd-mobile`
- `EXPO_PUBLIC_LOGLY_ENDPOINT=https://api.gndprodesk.com/api/analytics/mobile`

OpenPanel and `OPENPANEL_SECRET_KEY` are retired from source, package manifests, the lockfile, and Turbo's environment contract.

## Validation

`@gnd/events` lint, typecheck, and focused tests cover the native session/release contract, privacy sanitization, trusted mobile country forwarding, fixed project credentials, and web-origin enforcement. The mobile, dealership, and API compiler logs contain no diagnostics for analytics-owned files. Their broad checks retain unrelated pre-existing sales/order diagnostics.

Production canaries passed on 2026-09-13: the API accepted one Android and one iOS session plus their screen views, and the dealership accepted one browser visit. Logly displayed the corresponding Nigeria country totals, flag, map heat state, platform split and version/build rows. The legacy Bun Vercel runtime decodes base64 request bodies before constructing the Fetch `Request`, and all analytics environment values are trimmed at the proxy boundary.
