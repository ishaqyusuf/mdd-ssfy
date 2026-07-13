# New Sales Form Completion Roadmap

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Purpose

This is the full remaining roadmap to make the shared new sales form package
ready for dealership and internal `www` cutover. Browser work is intentionally
last; all implementation, contract, test, review, and documentation phases come
first.

## Execution Rule

- Execute phases in order unless a dependency clearly requires swapping adjacent
  non-browser phases.
- Keep `bun run test:new-sales-form-migration` green after each implementation
  slice.
- Stop on a failed test or failed migration gate.
- Keep browser/runtime QA phases at the end.

## Remaining Phases

| Phase | Scope | Exit Criteria | Status |
| --- | --- | --- | --- |
| 1 | Supplier management slot | Package exposes a host-owned Door supplier surface slot and `www` wires existing supplier manager through it. | Complete |
| 2 | App-specific calculator slots | Package exposes host calculator slots and `www` wires moulding/app-specific calculators without package owning app UI. | Complete |
| 3 | Package UI parity pass | Shelf, Door/HPT, service, and moulding package defaults visually match the real form engine using existing UI primitives. | Complete |
| 4 | Package type hardening | Remaining `any` casts around workflow panel/contracts/wrappers are replaced with stable package types where practical. | Complete |
| 5 | Dealer-protected reference endpoint review | Dealer workflow references are audited for auth scope, payload minimization, and no accidental internal-only exposure. | Complete |
| 6 | Package contract review | `SalesFormWorkflowDataSource`, actions, slots, and exports are reviewed for package portability and app-boundary cleanliness. | Complete |
| 7 | Pricing parity audit | Internal coefficient pricing and dealer percentage pricing are audited across flat, Door/HPT, shelf, moulding, and service lines. | Complete |
| 8 | Taxability and production flag audit | Tax/production flags for service, moulding, shelf, Door/HPT, and flat lines are verified against the old engine contract. | Complete |
| 9 | Save/reopen/convert audit | Non-browser tests cover create/save/reopen/convert payloads for dealership and `www` where local tests can exercise them. | Complete |
| 10 | Persistence regression expansion | Add focused regressions for supplier changes, door-size variants, shelf sections, moulding rows, service rows, redirects, and totals. | Complete |
| 11 | Print/PDF impact audit | Quote/order print data and PDFs continue to render package-authored workflow payloads correctly. | Complete |
| 12 | Inventory sync impact audit | Sales inventory sync behavior is checked for package-authored line/component/HPT payloads. | Complete |
| 13 | Error/loading/empty-state review | Package panel handles missing route data, empty steps, failed queries, and unavailable host hooks without broken controls. | Complete |
| 14 | Accessibility review | Dialog titles, keyboard paths, native controls, labels, focus behavior, and action menus meet expected accessibility standards. | Complete |
| 15 | Mobile/responsive review | Package defaults and wrappers fit mobile/desktop without overlap, layout shift, or unreadable controls. | Complete |
| 16 | Performance/render review | Review render churn, query enabling, dynamic import impact, and expensive derived data in package and wrappers. | Complete |
| 17 | `www` admin capability audit | Package toggle path exposes only wired admin controls and preserves internal-only capabilities through host slots. | Complete |
| 18 | Dealership capability/security audit | Dealership quote page exposes only dealer-appropriate actions, data, totals, and save behavior. | Complete |
| 19 | Feature flag/cutover strategy | Dealership and `www` cutovers have explicit flags/toggles, owner, gates, and rollback criteria. | Complete |
| 20 | Dealership rollback plan | Document and verify how dealership can return to the previous working quote surface if needed. | Complete |
| 21 | `www` rollback plan | Document and verify how internal `www` can return to legacy `ItemWorkflowPanel` if needed. | Complete |
| 22 | Legacy duplication removal plan | Identify app-local workflow logic that can be deleted after cutover and define sequencing. | Complete |
| 23 | Dealership cutover readiness | All non-browser dealership gates are green and cutover criteria are met. | Complete |
| 24 | `www` internal cutover readiness | All non-browser `www` gates are green and package panel can replace the legacy panel behind the chosen flag. | Complete |
| 25 | Docs and Brain finalization | Brain task map, package README, migration notes, and gate instructions reflect the final contract. | Complete |
| 26 | Final migration gate stabilization | The focused migration harness is stable and documents tolerated baseline errors clearly. | Complete |
| 27 | Dealership browser QA | Authenticated dealership create/edit/save/reopen/convert flows pass with screenshots/notes. | Blocked - local MySQL/auth session unavailable |
| 28 | `www` package-toggle browser QA | Authenticated `www` legacy-vs-package comparison passes on real order/quote fixtures. | Browser phase |
| 29 | Browser automation/scripted QA | Repeatable browser smoke coverage exists for the final dealership and `www` package paths. | Browser phase |
| 30 | Final review and ship readiness signoff | Code, tests, browser evidence, rollback plans, and docs are reviewed for production readiness. | Browser phase |
