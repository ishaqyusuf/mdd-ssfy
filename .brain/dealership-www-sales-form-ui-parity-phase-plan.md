# Dealership / WWW Sales Form UI Parity Phase Plan

Date: 2026-05-23
Status: Implementation complete through non-browser phases; authenticated browser parity is blocked by auth/session fixtures
Owner: Sales Form Rebuild Team

## Goal

Make dealership and `www` render the same new sales form UI composition from
the shared sales package. The dealership surface should differ only through
explicit capability gates, data sources, pricing mode, and dealer-safe actions.

The visual source of truth is the intact `www` new sales form engine, currently
mounted as `ItemWorkflowPanel`.

## Execution Rules

- Use `@gnd/sales` as the final owner of shared form UI composition.
- Do not create a second dealership-specific lookalike.
- Hide unavailable behavior with typed capabilities/slots, not a separate UI.
- Keep `bun run test:new-sales-form-migration` green after every code phase.
- Browser tests remain at the end, but console/hydration warnings found during
  browser work become required fixes before signoff.
- Stop on any failed migration gate.

## Phase List

| Phase | Scope | Exit Criteria | Gate |
| --- | --- | --- | --- |
| 1 | Visual source-of-truth inventory | Every visible `ItemWorkflowPanel` region is mapped to package-owned, host-slot-owned, or gated-hidden. | Complete |
| 2 | Capability matrix | Define internal admin, internal non-admin, and dealership dealer capabilities for every action/control. | Complete |
| 3 | Package engine API design | Define the final shared engine component API, likely `SalesFormEnginePanel`, around record/editor/actions/dataSource/pricing/capabilities/slots. | Complete |
| 4 | Extract line-list composition | Move the exact `www` line list/card/step-shell composition into `@gnd/sales`. | Complete |
| 5 | Extract root/item picker composition | Move root component picker, search, route loading/error, and empty states as the real engine UI, not fallback UI. | Complete |
| 6 | Extract step component composition | Move single-select and multi-select step cards/actions into package-owned UI. | Complete |
| 7 | Extract Door/HPT composition | Make Door step, HPT table, size dialog, supplier display, swap/delete, and configure sizes package-owned with gated slots. | Complete |
| 8 | Extract shelf composition | Make shelf categories, product rows, section totals, add/remove, and empty/loading states package-owned. | Complete |
| 9 | Extract moulding/service composition | Make moulding and service editors package-owned while keeping calculator behavior as host slot where needed. | Complete |
| 10 | Host-only modal slots | Keep app-owned image upload, admin component edit persistence, supplier CRUD, redirect persistence, and door-size variant persistence behind slots. | Complete |
| 11 | Replace `www` wrapper with shared engine | `WwwSalesFormWorkflowPanel` becomes a thin adapter around package engine. | Complete |
| 12 | Make `www` package panel default behind flag | Flip package panel default only after authenticated browser parity checks are ready; legacy remains rollback. | Pending; blocked by phases 21-25. |
| 13 | Replace dealership main panel composition | Dealership mounts the same package engine, not bespoke fallback layout. | Complete |
| 14 | Dealer-safe customer/profile/tax surface | Move customer/profile/tax selection into a shared/gated header pattern that visually aligns with `www`. | Complete |
| 15 | Dealer pricing/read-only gates | Dealer line totals, unit price, admin pricing buttons, and internal controls are hidden/read-only by capability matrix. | Complete |
| 16 | Dealer data-source hardening | Dealer reference endpoints expose only required fields for shared engine rendering. | Complete |
| 17 | Markup/a11y cleanup | Fix known nested button and invalid paragraph/div warnings in package engine path. | Complete |
| 18 | shadcn/design-system cleanup | Replace ad hoc package fallback controls with existing UI primitives and semantic tokens where the real engine requires them. | Complete |
| 19 | Type hardening | Remove practical `any` casts in wrapper/engine contracts introduced during extraction. | Complete |
| 20 | Non-browser regression expansion | Add tests for capability matrix, hidden controls, readonly dealer pricing, slots, and package-vs-legacy behavior where testable. | Complete |
| 21 | `www` legacy-vs-package browser parity | Compare old `ItemWorkflowPanel` against package engine on desktop/mobile fixtures. | Blocked by auth; local `/sales-form/create-quote?packageWorkflowPanel=package` redirects to `/login/v2` and returns TRPC `UNAUTHORIZED`. |
| 22 | Dealership-vs-`www` package browser parity | Compare dealership package engine against `www` package engine. | Blocked by auth; local `/quotes/new` redirects to `/login`. |
| 23 | Authenticated dealership workflow QA | Create/edit/save/reopen/convert dealer quote with flat, Door/HPT, shelf, moulding, and service lines. | Blocked until an authenticated dealer session and seed fixture are available. |
| 24 | Authenticated `www` workflow QA | Create/edit/save/reopen `www` order/quote through package engine. | Blocked until an authenticated internal session and seed fixture are available. |
| 25 | Browser automation | Add repeatable smoke tests for dealership and `www` package paths. | Blocked until phases 21-24 can run against authenticated fixtures. |
| 26 | Remove or freeze legacy duplicate | Either remove legacy `ItemWorkflowPanel` or freeze it as rollback-only with clear owner/date. | Deferred; do not remove rollback UI before authenticated browser parity. |
| 27 | Docs and runbooks | Update package README, parity report, rollback docs, and roadmap with final ownership model. | Partially complete; Brain records current implementation and browser blocker. |
| 28 | Final readiness review | Review code, tests, screenshots, capability gates, and rollback path. | Pending; cannot sign off 100% without browser screenshots and authenticated workflow proof. |

## Non-Negotiable Acceptance Criteria

- Dealership and `www` mount the same package-owned form engine component.
- The intact `www` UI is preserved as the visual baseline.
- Dealer differences are capability-driven:
  - no internal pricing edit
  - no component image upload
  - no supplier CRUD unless explicitly allowed
  - no redirect/configuration authoring
  - dealer-facing totals are read-only
- Package code does not import from `apps/www` or `apps/dealership`.
- Browser QA proves desktop and mobile parity.
- Browser console has no React hydration, invalid nesting, or interactive nesting warnings.
- `bun run test:new-sales-form-migration` remains green.

## Current Implementation Status

Phases 1-11 and 13-20 are implemented in code. The shared package now exposes
`SalesFormEnginePanel`, centralizes the workflow capability matrix, filters
privileged host slots/data-source hooks, and is mounted by both the `www`
package path and dealership.

Dealer-safe gates now hide or make read-only internal controls including:

- line price editing;
- shelf price editing;
- HPT base cost and component surcharge breakdown rows;
- HPT addon/custom price inputs;
- door-size dialog price inputs;
- moulding addon/custom price inputs;
- service unit price, tax, and production flag controls;
- image upload, component edit, redirect authoring, supplier management, and
  moulding calculator hooks unless explicitly allowed by capabilities.

## Browser End-Phase Result

Browser parity could not be completed in this unauthenticated local session:

- `http://127.0.0.1:3005/sales-form/create-quote?packageWorkflowPanel=package`
  returns the `www` shell but redirects to `/login/v2` and includes TRPC
  `UNAUTHORIZED`.
- `http://127.0.0.1:3005/sales-form/create-order?packageWorkflowPanel=package`
  has the same `/login/v2` / TRPC `UNAUTHORIZED` blocker.
- `http://127.0.0.1:3006/quotes/new` returns a dealership `307` redirect to
  `/login` from `requireDealer`.

The auth redirects prove the routes compile and reach the app guards, but they
do not prove visual parity. Phases 12 and 21-28 must remain open until an
authenticated dealer/internal browser fixture can exercise the actual form UI.
