# ADR: Internal iOS TestFlight Distribution And Audited Mobile Access

## Status

Accepted

## Context

GND's first iOS release is employee-only. The Expo project is already owned by
`pcruz321` and linked to EAS project
`8ea2eecb-4109-453c-827f-9b2de2e3a9aa`; Apple's organization identity is a
separate concern. Preview is an internal/ad-hoc EAS build and cannot be uploaded
to TestFlight. Employee access must be authenticated, auditable, and must never
move Apple credentials, passwords, verification codes, or API keys through GND.

## Decision

- Keep the existing EAS owner/project/update linkage and use the production
  profile with explicit `distribution: "store"` for TestFlight.
- Use bundle identifier `com.gnd.prodesk` and Apple team `ZXC78SPCV4` for the
  production iOS release. Keep `com.gnd.prodesk.dev` for development.
- Prefer TestFlight Internal Testing only for staff who can safely be App Store
  Connect users. Use External Testing for ordinary employees who should not
  receive portal access.
- Store one request per employee/platform and an append-only event history for
  `REQUESTED`, `APPROVED`, `INVITED`, `ACCEPTED`, `INSTALLED`, `REJECTED`, and
  `CANCELLED` transitions.
- Require an active employee for self-service and Super Admin for review. Keep
  internal notes and portal references out of employee responses.
- Start with manual portal invitations behind a provider adapter. Do not add App
  Store Connect API automation until a separately approved API key exists in an
  established server-side secret-management boundary.

## Alternatives

- Ad-hoc preview distribution: rejected for TestFlight because it is not an App
  Store/store-signed build.
- Relinking or transferring the EAS project to match the Apple organization:
  rejected because the identities are independent and the current linkage is
  authorized.
- Giving every employee App Store Connect access: rejected because ordinary
  testers do not need portal permissions; External Testing is the safer option.
- Browser-supplied Apple credentials or immediate API automation: rejected due
  to credential exposure and missing approved server-side API-key material.

## Consequences

The release commands are reproducible and Android behavior remains unchanged.
Every employee request and status change has server-derived actor attribution.
Initial invitations require a Super Admin to perform a matching portal action
and then record the result. External Testing can add Beta App Review delay.

## Implementation Notes

The release boundary lives in `apps/mobile/eas.json`, mobile/root package
scripts, and `scripts/eas-account-runner.ts`. The request boundary lives in the
mobile-access Prisma schema, tRPC router/query layer, dashboard support page,
and `mobile-access-invitation.ts` adapter. Uploads, submissions, API-key creation,
permission changes, and tester invitations remain action-time-confirmed
external operations.
