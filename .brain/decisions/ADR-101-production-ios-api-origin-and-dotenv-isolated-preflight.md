# ADR: Production iOS API Origin and Dotenv-Isolated Preflight

## Status

Accepted

## Context

The installed iOS production build embeds `extra.appVariant = production`, but
mobile tRPC routing previously used `EXPO_PUBLIC_BASE_URL` only when
`EXPO_PUBLIC_APP_VARIANT = preview`. The production environment has a public
HTTPS base origin but no public variant flag. A signed store binary could
therefore fall back to an Expo debugger host or fail before authentication.
Its separate web/auth URL may also be development-only.

The package preflight strips development credentials before launching Bun,
but installed Bun 1.3.0 reloads local `.env*` values when invoked from the
mobile app directory. `EXPO_NO_DOTENV=1` controls Expo, not Bun's runtime
dotenv loading.

## Decision

Installed preview/production releases resolve the embedded `extra.appVariant`
first and use `EXPO_PUBLIC_BASE_URL` as the shared tRPC and Better Auth origin.
Production requires a public HTTPS root origin; missing or non-public values
fail closed. Expo development sessions retain debugger-host routing.

The iOS production config and release checker validate the origin before EAS
build queueing. The production preflight uses a Node wrapper that removes
development login variables and launches the Bun checker by absolute path from
a neutral temporary-directory working directory. The final EAS invocation
still strips the same variables and sets `EXPO_NO_DOTENV=1`.

## Alternatives

- Continue relying on `EXPO_PUBLIC_APP_VARIANT` and debugger-host fallback:
  rejected because the installed variant is already embedded and the public
  flag is absent in the selected production environment.
- Use `EXPO_PUBLIC_WEB_URL` for production auth while the API uses Base URL:
  rejected for this release because its selected value is not public HTTPS;
  separate origins would require explicit authentication/CORS review.
- Rely only on Bun `--no-env-file` or `bunfig.toml env=false`: rejected as the
  installed Bun 1.3.0 probe still loaded local dotenv values after stripping.

## Consequences

- Production tRPC and auth must both be served by the approved base origin;
  verify both routes and an actual installed-build login before App Review.
- A syntactically public HTTPS origin check does not prove DNS reachability,
  backend health, or legal approval of the privacy-policy URL.
- The wrapper adds a small Node subprocess to preflight but avoids modifying
  any `.env*` file or transmitting credentials.

## Implementation Notes

`apps/mobile/src/lib/release-base-url.ts` is a pure resolver used by
`base-url.ts`, `app.config.ts`, and the iOS readiness checker. The app's
production `ios.env` flag activates the iOS-only build guard; Android's
existing build routing is unchanged. The wrapper is
`apps/mobile/scripts/run-ios-release-preflight.cjs`.
