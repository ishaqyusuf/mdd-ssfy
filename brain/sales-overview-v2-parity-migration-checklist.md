# Sales Overview V2 Parity Migration Checklist

## Objective

Turn `sales-overview-system` into an optimized and standardized replica of the current production Sales Overview sheet before any user-facing redesign continues.

## Migration Rule

V2 parity work must preserve the current UI and behavior. Architecture, data loading, query normalization, tab ownership, and render performance may change; visible layout, tab names, actions, permissions, and workflow behavior should not change during the parity migration.

## Production Reference

- Current sheet: `apps/www/src/components/sheets/sales-overview-sheet/*`
- Migration target: `apps/www/src/components/sales-overview-system/*`
- V2 sheet mount: `apps/www/src/components/sheets/sales-overview-system-sheet/index.tsx`
- V2 page route: `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/overview-v2/page.tsx`

## Phase Gates

### Phase 0. Contract

- [x] V2 is treated as the destination architecture, not a separate redesign.
- [x] Current main sheet remains production source of truth until cutover.
- [x] UI parity is mandatory during migration.
- [ ] New sales overview feature work lands in v2 parity first or is mirrored into this checklist.

### Phase 1. Tab Contract Parity

- [x] V2 defaults `overview` to legacy-compatible `v1` instead of redesigned `v2`.
- [x] V2 includes `activity` as a first-class tab.
- [x] V2 labels `overview` as `General`.
- [x] V2 labels `production` as `Productions`.
- [x] V2 keeps `Finance` and `Details` hidden during parity.
- [x] V2 supports production badges and disabled state.
- [ ] V2 exactly mirrors legacy default tab visibility for admin orders.
- [ ] V2 exactly mirrors legacy tab visibility for quotes.
- [ ] V2 exactly mirrors legacy tab visibility for production users.
- [ ] V2 exactly mirrors legacy tab visibility for dispatch users.

### Phase 2. Query Compatibility

- [x] V2 sheet/page parsers accept existing `order` sales type values.
- [x] Legacy `salesTab` values are mapped into canonical v2 tab ids.
- [x] Legacy `transaction` alias maps to `transactions`.
- [x] Legacy `inbound` alias maps to activity/inbound mode.
- [ ] Existing close behavior clears query params and runs close callbacks.

### Phase 3. Initial Open Performance

- [ ] Opening v2 sheet fires only the root overview query.
- [x] Inactive production query does not run on open.
- [x] Inactive dispatch query does not run on open.
- [ ] Inactive packing query does not run on open.
- [ ] Inactive transactions query does not run on open.
- [ ] Activity/history loads only when its tab is active.

### Phase 4. Tab UI Parity

- [ ] General tab screenshot matches the current main sheet.
- [ ] Productions tab screenshot matches the current main sheet.
- [ ] Transactions tab screenshot matches the current main sheet.
- [ ] Activity tab screenshot matches the current main sheet.
- [ ] Dispatch tab screenshot matches the current main sheet.
- [ ] Packing tab screenshot matches the current main sheet where reachable.

### Phase 5. Action Parity

- [ ] Edit order/quote actions match main sheet.
- [ ] Print/preview actions match main sheet.
- [ ] Payment actions match main sheet.
- [ ] Reminder actions match main sheet.
- [ ] Production assignment/submission actions match main sheet.
- [ ] Dispatch creation/update actions match main sheet.
- [ ] Packing actions match main sheet.
- [ ] Activity/inbound note actions match main sheet.

### Phase 6. Cutover Readiness

- [ ] Internal users can open v2 from the current sales surfaces.
- [ ] V2 supports both sheet and page from the same core.
- [ ] Old sheet remains available behind fallback during rollout.
- [ ] Performance is measured against the current sheet baseline.
- [ ] No P0/P1 parity gaps remain.
- [ ] Brain architecture docs are updated after cutover.

## Notes

- Do not delete the legacy sheet until v2 is default, monitored, and rollback has not been needed through a stability window.
- Redesigned tab versions may remain in the codebase, but parity defaults must point to legacy-compatible versions until cutover is complete.
