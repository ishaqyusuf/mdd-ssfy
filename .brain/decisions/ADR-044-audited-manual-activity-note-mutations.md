# ADR-044: Audited Manual Activity Note Mutations

- Status: Accepted
- Date: 2026-08-04

## Context

Sales Overview activity mixes user-entered notes with immutable system lifecycle events. Operators need to correct or remove their own notes without destroying the operational audit trail, and Super Admin needs retained visibility.

## Decision

- Only `sales_info` and `inventory_inbound` manual activities are mutable.
- The original author or Super Admin may edit or soft-delete a manual activity.
- System lifecycle activity and revision records are immutable.
- Before an edit or delete, the server creates an actor-attributed child `NotePad` snapshot linked through `NoteComments`; tags retain the original author contact and changing user id.
- Edits replace the root note after recording the prior version.
- Deletes set `NotePad.deletedAt`; normal activity reads omit the root, while explicit Super Admin audit reads may include it.
- No physical row deletion is used for activity-note management.

## Consequences

The existing notes schema supplies revision linkage and soft deletion, so no database migration is required. Activity-tree responses expose author profile and deleted metadata to support server-authorized UI state.
