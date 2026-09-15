# ADR: Reviewed-ID-Only Public iOS Upload Entry Points

## Status

Accepted — 2026-09-15

## Context

The public GND Millwork iOS release needs a store-profile binary that has been
inspected after the final privacy configuration is embedded. Root EAS upload
aliases already required a build UUID, but a direct `apps/mobile` submit script
could still reach EAS's interactive build selector without an ID. Old signed
builds `5` and `6` are not public-release candidates.

## Decision

Both direct mobile-package submit aliases call one fail-closed adapter. It
accepts only one valid `--id` UUID, rejects every alternate selector/flag and
the two retired candidate IDs, then invokes EAS Submit with fixed iOS platform
and production profile. The adapter strips development login variables and
disables Expo dotenv loading. The root account runner remains an independent
pre-authentication ID guard. A reviewed ID is an accident-prevention condition,
not permission to upload; every actual Apple binary upload still needs
explicit action-time owner confirmation.

## Alternatives

- Keep direct `eas submit` and rely on operators to choose the right build.
  Rejected because it permits the old interactive selector path.
- Remove direct package aliases entirely. Rejected because existing package
  workflows and the root runner depend on them.
- Use automatic build-and-submit for the first release. Deferred because it
  uploads before inspecting the exact privacy-complete IPA.

## Consequences

Accidental latest-build or old-build upload through repository scripts fails
before EAS runs. Operators must supply a reviewed build ID, and the adapter
intentionally does not forward EAS options that can change platform, profile,
source, or tester distribution. Out-of-repository EAS or Transporter commands
are not governed by this adapter; the runbook and action-time gates remain
necessary.

## Implementation Notes

`apps/mobile/scripts/ios-submit-by-id.ts` implements the adapter.
`apps/mobile/package.json` routes both submit aliases through it.
`apps/mobile/scripts/ios-release-readiness.ts` and focused tests validate the
alias, fixed profile, credential stripping, and invalid-command behavior.
Android build/update scripts, EAS owner/project/Updates linkage, and signing
configuration are unchanged.
