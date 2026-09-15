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
and production profile. The adapter also requires
`GND_IOS_UPLOAD_ACK=1` for that invocation. The root account runner requires
`--acknowledge-upload` after validating the ID and before EAS authentication,
then passes the scoped acknowledgment to the direct adapter. The adapter strips
development login variables and disables Expo dotenv loading. A reviewed ID
and a local acknowledgment are accident-prevention conditions, not permission
to upload; every actual Apple binary upload still needs explicit action-time
owner confirmation. Do not persist the acknowledgment in an `.env` file or
shell profile.

## Alternatives

- Keep direct `eas submit` and rely on operators to choose the right build.
  Rejected because it permits the old interactive selector path.
- Remove direct package aliases entirely. Rejected because existing package
  workflows and the root runner depend on them.
- Use automatic build-and-submit for the first release. Deferred because it
  uploads before inspecting the exact privacy-complete IPA.

## Consequences

Accidental latest-build or old-build upload through repository scripts fails
before EAS runs. A valid ID without the scoped upload acknowledgment also
fails before EAS runs. Operators must supply a reviewed build ID, and the adapter
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
