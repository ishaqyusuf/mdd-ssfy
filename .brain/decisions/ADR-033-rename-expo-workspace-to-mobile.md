# ADR-033: Rename the Expo Workspace to Mobile

- Status: accepted
- Date: 2026-07-28

## Context

The React Native application lived at `apps/expo-app` with package name
`@gnd/expo-app`. That name described its framework rather than its product role
and produced the inconsistent local port key `GND_EXPO_PORT`.

The shared development launcher derives a package's port key from the final
package-name segment. Profile-prefixed environment keys are matched by that
derived suffix.

## Decision

- Rename the workspace directory to `apps/mobile`.
- Rename the workspace package to `@gnd/mobile`.
- Use `mobile` for Turbo and local-infra development filters.
- Rename the local port key to `GND_MOBILE_PORT`.
- Keep Expo/EAS application identifiers, native bundle identifiers, release
  channels, and Sentry project identities unchanged; those are deployment
  identities rather than workspace-layout names.

## Consequences

- Mobile development starts with `bun run dev --filter mobile dashboard`.
- The shared launcher derives `MOBILE_PORT`, which matches the
  profile-prefixed `GND_MOBILE_PORT` environment key.
- Repository paths, scripts, tests, lockfile workspace entries, and Brain
  references use `apps/mobile`.
- Existing native installations, EAS projects, updates, releases, and Sentry
  event continuity are not reset by this source-layout rename.
