# Inbound Overview Activity Composer

- Status: Proposed — awaiting implementation approval
- Date: 2026-08-06
- Surface: `apps/dashboard/src/components/sheets/inbound-overview-content.tsx`

## Objective

Turn the existing basic `Activity history` block in Inbound Overview into a
complete inbound-scoped activity workspace: operators can review lifecycle
events, add a manual note, attach images or PDFs, and manage their own manual
notes without mixing activity from another inbound or relying on a single
linked sales order.

## Product Contract

- The section is scoped by the exact `InboundShipment.id`.
- It shows both immutable system lifecycle events (`inventory_inbound_activity`)
  and manual inbound notes (`inventory_inbound`).
- The composer accepts a note, attachments, or both; an empty submission is
  rejected.
- Attachments reuse the existing authenticated upload flow, accept images and
  PDFs, support drag/drop and file browsing, show removable previews before
  send, and allow up to 25 files.
- Manual notes are editable or soft-deletable only by their author or a Super
  Admin, following ADR-044. System activity remains immutable.
- Read-capable users can see activity. Writing requires inbound/order edit
  capability (`editInboundOrder` or `editOrders`) and is enforced by the API,
  not only by hidden UI controls.
- Newest activity appears first and refreshes immediately after a successful
  send, edit, delete, status update, receipt, assignment, or document event.
- A note created from an inbound linked to several orders remains one inbound
  note. Its server-derived sales tags make it discoverable from every linked
  Sales Overview without creating duplicate activity rows.

## Recommended UI

Keep the Activity section after `Inbound items`, but replace the hand-built
bordered cards with one bounded component:

1. Header: `Activity` plus the loaded event count.
2. Composer: a compact multiline input with placeholder
   `Add a note about this inbound…`, attachment control, upload previews, and a
   `Send note` action. Do not expose a channel selector because the entity and
   channel are fixed by the inbound workspace.
3. Timeline: reuse the shared Activity History presentation (timeline rail,
   author, timestamp, subject/headline, note body, attachment previews, and
   manual-note menu) rather than maintaining a second visual language.
4. States: composer upload/submission progress, timeline skeleton, empty state
   (`No inbound activity yet`), inline load failure with retry, and destructive
   toast on send/upload failure. Preserve the draft and successfully uploaded
   previews after a failed send.
5. Responsive behavior: one-column composition at every sheet width; attachment
   previews wrap; actions remain keyboard reachable; Alt+Enter sends to match
   the existing Chat composer.

## Detailed Execution Plan

### Phase 1 — Define the exact-inbound note contract

1. Add an inbound-note input contract with:
   - positive `inboundId`;
   - optional trimmed note, maximum 5,000 characters;
   - zero to 25 attachment pathnames;
   - optional note color only if the shared composer keeps the existing color
     control.
2. Require at least one of note text or attachment.
3. Resolve the inbound server-side and derive its supplier/reference plus the
   unique linked `salesId` and `salesNo` values from active inbound demands.
   Never accept linked sales identity as client authority.
4. Persist one `inventory_inbound` manual activity with `inboundId` and the
   derived sales tags. Preserve the existing scalar sales-note contract for old
   callers while allowing repeated tag values for a multi-order inbound.
5. Enforce `editInboundOrder` or `editOrders` before creating the note. Keep the
   existing view permission/read behavior unchanged.

Dependencies/decision: use a focused `inventories.createInboundActivityNote`
mutation and extract/reuse the current notification-attachment claim/finalize
logic from `notes.createInboxActivity`. This is preferred over letting the
generic notes route trust an arbitrary inbound id.

Validation: contract tests for note-only, attachment-only, empty, invalid
inbound, unauthorized writer, single-order tags, and multi-order tags.

### Phase 2 — Preserve attachment ownership and audit behavior

1. Reuse the existing pending-upload to `notification_activity` ownership
   transition so a failed mutation releases the claim and a successful one
   binds each `StoredDocument` to the created activity.
2. Keep attachment limits and accepted media aligned with the shared Chat
   composer: images and PDFs, maximum 25 files.
3. Store manual upload pathnames under the existing `attachment` tag so the
   shared Activity History renderer can display them without a parallel file
   model.
4. Keep lifecycle receipt/document activity on `documentIds`; do not convert or
   duplicate those system records as manual attachments.
5. Reuse ADR-044 edit/delete mutations. Ensure the inbound activity query
   refreshes after edits/deletes and Super Admin audit mode can still reveal
   soft-deleted roots and immutable revisions.

Validation: attachment claim rollback, successful ownership adoption, duplicate
submission/claim protection, author edit/delete, unauthorized mutation, and
Super Admin audit coverage.

### Phase 3 — Build a reusable inbound activity section

1. Extract `InboundActivitySection` from
   `inbound-overview-content.tsx`; keep the overview component responsible only
   for composing shipment metrics, controls, items, and activity.
2. Compose the existing `Chat` primitives for the note input and attachment
   picker, but submit through the focused inbound mutation via `onSubmitData`.
   Fix the channel to `inventory_inbound` and payload to `inboundId`.
3. Query the shared activity tree with an AND filter for the exact `inboundId`
   and an OR filter for `inventory_inbound` and
   `inventory_inbound_activity`. This retains the existing hierarchy,
   author/Super Admin note controls, and attachment rendering.
4. Reuse `ActivityHistory` for presentation. If a small API is needed, add a
   focused invalidation callback/query-key prop instead of duplicating its
   timeline markup.
5. Remove the current raw `inventories.inboundActivity` card mapping from the
   sheet after parity is proven. Keep that endpoint for other inventory and
   sales-inbounds consumers until they are migrated separately.
6. Derive `canWrite` from the authenticated permission projection for display,
   while retaining server enforcement. Read-only users see the timeline without
   the composer.

Validation: focused component/source tests prove exact inbound filtering,
fixed channel, permissions, composer controls, activity invalidation, and no
eager mounting outside an open Inbound Overview.

### Phase 4 — Integrate mutation refresh behavior

1. After send, invalidate the exact inbound activity-tree query and any mounted
   Sales Overview activity query that matches the server-derived linked sales
   tags.
2. Keep the existing shipment detail/list invalidation for status and receive
   mutations; also invalidate the exact activity-tree query so their lifecycle
   entries appear immediately.
3. After edit/delete, invalidate both the shared activity-tree path and the
   exact inbound activity key if another mounted legacy consumer is present.
4. Do not refetch shipment detail for a note-only change.

Validation: mutation tests prove one activity write, immediate refresh, no
duplicate note after invalidation, and no unrelated shipment-detail refetch for
note-only submissions.

### Phase 5 — Accessibility, responsive QA, and release checks

1. Verify keyboard focus order, visible focus states, attachment remove labels,
   file-preview alt text, menu access, and Alt+Enter submission.
2. Verify desktop wide two-pane Sales Overview, one-pane fallback widths, the
   global Inbound Overview sheet, and a 390px viewport. The composer must not
   widen either pane or hide the send/remove actions.
3. Browser-test note-only, attachment-only, mixed submission, failed send with
   retained draft, edit, delete, read-only visibility, Super Admin audit, and a
   multi-order inbound.
4. Run focused notification/API/component tests, targeted Biome, relevant
   package typechecks, Dashboard typecheck (recording only pre-existing
   baseline failures), and the narrowest relevant build or browser smoke.
5. Update `.brain/features/order-inbound-status.md` with the shipped activity
   contract, `.brain/api/endpoints.md` and `.brain/api/contracts.md` for the new
   mutation, `.brain/api/permissions.md` for write access, and
   `.brain/progress.md` with validation evidence. Add an ADR only if the final
   implementation changes the accepted ADR-044 audit model or introduces a new
   durable attachment ownership rule.

## Primary Files

- `apps/dashboard/src/components/sheets/inbound-overview-content.tsx`
- `apps/dashboard/src/components/sheets/inbound-activity-section.tsx` (new)
- `apps/dashboard/src/components/chat/chat.tsx` (only if a narrow reusable hook
  or invalidation seam is required)
- `apps/dashboard/src/components/chat/activity-history.tsx` (only for a narrow
  reuse seam; no inbound-specific branching)
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/api/src/trpc/routers/notes.route.ts` and/or a shared attachment-claim
  helper extracted from it
- `apps/api/src/db/queries/inbound-receiving.ts`
- `packages/notifications/src/schemas.ts`
- `packages/notifications/src/types/inventory-inbound.ts`

## Risks and Mitigations

- **A manual note appears on the wrong order.** Resolve linked sales server-side
  from the inbound id and write all applicable tags in the same activity.
- **Multi-order inbounds create duplicate notes.** Persist one inbound-rooted
  note with repeated sales tag values instead of one row per order.
- **Generic note creation bypasses inbound permissions.** Use a focused
  inventories mutation with server permission checks.
- **Failed submissions orphan uploaded files.** Reuse the existing claim lease,
  rollback, and ownership-finalization path.
- **Two competing activity renderers drift.** Reuse the shared Chat and Activity
  History primitives and remove the sheet's hand-built event cards.
- **System events become editable.** Restrict mutation eligibility to manual
  `inventory_inbound` notes and retain immutable lifecycle/revision types.
- **The full sheet becomes heavier.** Keep activity inside the already-open
  inbound detail and avoid mounting it anywhere outside an active inbound pane.

## Out of Scope

- Comments/replies beyond the revision history already used for audit.
- Mentions, subscriber selection, email/SMS delivery, or notification-channel
  switching.
- Editing lifecycle events or replacing the separate inbound receipt/document
  extraction workflow.
- Migrating the `/inventory/inbounds` and `/sales-book/inbounds` activity panels
  in the same slice.

