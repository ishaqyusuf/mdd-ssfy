# Notification Channels Table

## Purpose
Provide a Sales Orders-style table selector for the Notification Channels settings workspace while preserving the existing channel detail editor.

## Current Behavior
- `/settings/notification-channels` redirects to `/settings/notification-channels/v2`.
- `/settings/notification-channels/v2` uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("notification-channels")`.
- The left channel selector is backed by `components/tables-2/notification-channels/*` instead of mapped card buttons.
- The table reuses the existing `notes.getNotificationChannels` query with `q` search and `size: 200`; no new query, route, filter endpoint, or database schema change was added.
- Row selection keeps the existing `openNotificationChannelId` URL param and right-side detail panel.
- The right-side detail panel still owns delivery toggles, role subscription buttons, manual subscriber add/remove, sync retry messaging, and the existing invalidation flow.

## Table Contract
- Table id: `notification-channels`.
- Columns: `Channel`, `Priority`, `Delivery`, `Audience`, `Category`, `Status`, and `Actions`.
- Compact row height: `56px`.
- Sticky columns: `Channel`; `Actions` is sticky on the right through the column metadata.
- Widths are intentionally content-fit:
  - Channel: `sizes.custom(240, 420, 300)`
  - Priority: `sizes.custom(92, 132, 104)`
  - Delivery: `sizes.custom(118, 164, 132)`
  - Audience: `sizes.custom(126, 170, 142)`
  - Category: `sizes.custom(120, 180, 140)`
  - Status: `sizes.custom(118, 164, 132)`
  - Actions: `sizes.custom(56, 80, 64)`
- Supports table-owned scroll, virtual rows, DnD column ordering, resize handles, persisted visibility/sizing/order/divider settings, column visibility popover, selected-row highlight, loading skeleton, empty state, no-results state, and error state.

## Validation Notes
- Focused parity test: `bun test apps/www/src/components/tables-2/notification-channels/migration-parity.test.ts` passed with 3 tests / 33 assertions.
- Full restarted table parity suite: `bun test apps/www/src/components/tables-2` passed with 195 tests / 1941 assertions.
- Targeted Biome passed for the route, settings workspace, new table files, and table settings/config files.
- Broad `@gnd/www` typecheck still exits on unrelated workspace baseline errors, but a filtered log scan reported no diagnostics for notification-channel/table-settings/table-config changes after the callback return fix.
- Static scans found no live old card selector, manual fetch route path, legacy table import, `PageStickyHeader`, or `@gnd/ui/data-table` usage in this slice.
- Runtime smoke returned `200` for both `https://gndprodesk.localhost/settings/notification-channels/v2` and `http://127.0.0.1:3010/settings/notification-channels/v2` after browser warmup.
- Follow-up authenticated browser proof on `https://gndprodesk.localhost/settings/notification-channels/v2` loaded `57` channels and confirmed a `45px` header, exact `56px` rows, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 3237`, `clientHeight 496`), table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1014`, `clientWidth 556`), `--header-offset: 70px` after scroll, and no document-level horizontal overflow.
