# ADR-043: New sales form manual-save default

## Status

Accepted

## Date

2026-08-03

## Context

The shared new-sales-form editor previously enabled debounced autosave whenever
state was created or a saved record was hydrated. Product direction now
requires autosave to be opt-in so opening or editing a form does not initiate
background persistence unless the user deliberately enables it.

## Decision

Set the shared sales-form editor state's `autosaveEnabled` default to `false`.
Newly created and hydrated order and quote forms begin in manual-save mode. Keep
the existing editor toggle so a user can enable autosave for the current form
session. Keep local dirty-draft recovery and leave-risk warnings unchanged.

This supersedes ADR-022's default-on decision.

## Consequences

- Merely opening and editing a new sales form does not schedule debounced
  background saves by default.
- Draft and final save actions continue to work explicitly.
- The header reports `Autosave: Off` until the user enables it.
- The shared state applies the same default to dashboard and dealership hosts.
- Local recovery remains available for dirty forms, and navigation warnings
  continue to protect unsaved work.

## Validation

No tests or browser validation were run, per the user's explicit instruction
for this narrow default change. The existing hydrated-state expectation was
updated to describe the new contract for the next normal test run.

## Rollback

Restore `initialSalesFormEditorState.autosaveEnabled` to `true` and reinstate
ADR-022 if product direction returns to default-on background persistence.
