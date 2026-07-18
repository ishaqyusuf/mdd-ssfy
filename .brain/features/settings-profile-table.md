# Settings Profile Table

## Status
- 2026-07-17: `/settings/profile` Active Sessions is migrated to the `tables-2` table standard.

## Surface
- Route: `apps/www/src/app/(sidebar)/settings/profile/page.tsx`
- Component: `apps/www/src/components/user-logged-in-devices.tsx`
- Table module: `apps/www/src/components/tables-2/user-logged-in-devices/*`
- Table settings id: `user-logged-in-devices`

## Behavior
- The settings profile route now hydrates persisted table settings with `getInitialTableSettings("user-logged-in-devices")`.
- `UserLoggedInDevices` no longer renders an inline `@gnd/ui/table`, `DataSkeletonProvider`, or `skeletonListData` rows.
- The restarted table keeps the existing mock active-session rows and placeholder logout behavior while moving row rendering, empty/skeleton states, column actions, DnD, resize, persisted visibility/sizing/order/divider settings, horizontal pagination, and scroll ownership into `tables-2/user-logged-in-devices`.

## Compact Table Contract
- `TABLE_CONFIGS["user-logged-in-devices"]` uses compact 40px rows.
- Sticky columns: Device on the left, Actions on the right through the column meta class.
- Widths:
  - Device: `sizes.custom(180, 320, 220)`
  - Location: `sizes.custom(140, 240, 170)`
  - IP Address: `sizes.custom(120, 190, 140)`
  - Last Login: `sizes.custom(132, 210, 154)`
  - Actions: `sizes.custom(56, 80, 64)`

## Validation
- Focused Biome passed for the route, component, new table module, table settings, and table config files.
- Focused parity test passed: `bun test apps/www/src/components/tables-2/user-logged-in-devices/migration-parity.test.ts` with 4 tests / 43 assertions.
- Full restarted table parity suite passed with 159 tests / 1519 assertions.
- Touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
- Static scans found no inline `@gnd/ui/table`, `Table*`, `DataSkeletonProvider`, `skeletonListData`, or stale copied-module names in the profile component/new module.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` diff stayed clean.
