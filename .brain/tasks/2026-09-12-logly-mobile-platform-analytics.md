# Logly Web And Mobile Analytics Replacement

## Status

Complete — production ingestion and responsive dashboard acceptance passed

## Scope

- Replace the Dealership OpenPanel adapter with Logly.
- Track GND web and Expo mobile in separate `gnd-web` and `gnd-mobile` projects.
- Report iOS/Android sessions, installations, events, app releases, and country visits.
- Preserve GND's analytics privacy boundary and keep credentials server-side.

## Completed

- Replaced the shared OpenPanel client/server implementation.
- Added guarded web and mobile product proxies.
- Added the Expo root analytics runtime and durable native adapter.
- Added source/platform filtering and mobile metadata support in Logly.
- Removed all OpenPanel source, manifest, lockfile, and Turbo environment references.
- Passed `@gnd/events` lint, typecheck, and four focused tests.
- Confirmed consuming app compiler logs have no analytics-owned diagnostics.
- Provisioned separate production `gnd-web` and `gnd-mobile` Logly projects.
- Stored scoped web and mobile credentials in Vercel and public mobile routing configuration in EAS Production.
- Deployed the dealership and API proxies to their canonical production domains.
- Verified production ingestion with one web visit and four mobile events across Android and iOS, all with zero duplicates.
- Verified Nigeria on the Logly heat map and ranked country list with the correct flag, counts and shares.
- Verified Android/iOS sessions, installations, events, version/build reporting and 390-pixel responsive layouts.
- Published full and production-compatible source branches as `codex/gnd-logly-complete` and `codex/gnd-logly-api-prod`.

## Production Evidence

- API deployment: `dpl_5hsNq7h4N3aC3MMUX8RfS4MFD5FS` on `https://api.gndprodesk.com`.
- Dealership deployment: `dpl_EkTJ3sxtcyHxPHvowA4UNQQTMMTK` on `https://dealers.gndprodesk.com`.
- Logly QA report and screenshots: `logly/.brain/tasks/gnd-mobile-platform-analytics/production-qa-2026-09-13.md`.
