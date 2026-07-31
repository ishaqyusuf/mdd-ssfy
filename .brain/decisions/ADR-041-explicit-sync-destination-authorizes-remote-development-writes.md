# ADR-041: Explicit Sync Destination Authorizes Preview Writes

## Status

Accepted

## Date

2026-07-31

## Context

The shared database router makes synchronization destinations explicit:
`db:sync` defaults to production-to-local, while `--to-preview` selects the
hosted preview database. GND previously required both a remote destination
flag and `GND_ALLOW_REMOTE_DEV_DB_SYNC=1` before writing to that database.
That second switch duplicated the user's destination choice and made the
shared command contract harder to use consistently.

The shared router now resolves and validates the production source and selected
destination before starting services or dispatching to GND. It rejects
production destinations, rejects a preview target that resolves to production,
blocks passthrough endpoint selectors and URL overrides, and removes inherited
database URL overrides. GND independently refuses source-equals-target and
retains its local-target and PlanetScale branch-identity checks.

## Decision

An explicit `bun run db:sync --to-preview` is the authorization signal for a
preview write. GND no longer reads or requires
`GND_ALLOW_REMOTE_DEV_DB_SYNC`.

No destination flag continues to mean `--from-prod --to-local`. Production is
source-only, and `--to-prod` remains invalid. Operational options such as
`--dry-run` and `--table` must remain after `--` and cannot override the shared
router's source or destination.

## Consequences

- Preview synchronization requires one explicit, visible destination choice.
- Automation no longer needs a separate environment-variable exception.
- Accidental production writes remain blocked by endpoint validation rather
  than by a second acknowledgement switch.
- Operators who want a preview can still run
  `bun run db:sync --to-preview -- --dry-run`.
- GND currently tracks TypeScript and adjacent `tsc`-emitted JavaScript for the
  synchronizer and its tests. Both artifacts must stay aligned while the full
  Bun suite continues to discover the JavaScript mirror; removing those
  generated files is a separate repository build-policy decision.

## Rollback

If explicit destination selection proves insufficient, introduce a centralized
confirmation policy in the shared router. Do not restore a GND-only environment
gate that creates a second project-specific command contract.

## Validation

- `bun test packages/db/src/local-sync.test.ts packages/db/src/local-sync.test.js scripts/db-command-contract.test.ts`
- `bunx tsc --noEmit -p packages/db/tsconfig.json`
- `bun run db:sync --to-preview -- --help`
