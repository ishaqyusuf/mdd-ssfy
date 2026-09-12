# Logly Web And Mobile Analytics Replacement

## Status

In Progress — production provisioning and acceptance remain

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

## Remaining

- Create the production `gnd-web` and `gnd-mobile` Logly projects and store their scoped ingest keys in the correct deployments.
- Apply the Logly production database migration and deploy the dashboard/collector.
- Deploy the GND web/API changes and provide the Expo environment to future builds.
- Generate real web/mobile test events and capture responsive Logly screenshots for platform usage and country heat-map/list verification.
