# ADR-022: Default sales-form autosave with local recovery fallback

## Status

Accepted

## Context

The shared sales-form editor already has queued autosave, local recovery
snapshots, and leave-risk warnings, but its initial editor state disabled
autosave. That made the safest draft-preservation path opt-in and left a dirty
form dependent on manual saves unless the user changed the editor setting.

## Decision

Enable `autosaveEnabled` by default when the shared sales-form state is created
or hydrated. Keep the explicit editor toggle so users can choose manual-save
behavior. Continue writing dirty payloads to the versioned local-recovery key
on change/page-leave and warning when autosave is disabled, stale, or failed.

## Consequences

- New and reopened sales forms automatically use the existing debounced save
  queue.
- Local recovery remains the fallback for browser/page termination and failed
  or deliberately disabled autosave.
- The setting is shared by `www` and dealership through the sales package, so
  both surfaces retain the same safety contract.
