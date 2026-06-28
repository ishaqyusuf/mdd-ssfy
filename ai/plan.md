# Sales Form Office/Dealer Shareability Execution

Date: 2026-05-24
Status: Completed

## Goal

Implement the office/dealer sales-form cleanup so `@gnd/sales/sales-form` owns
portable contracts, shared schemas, pricing composition, workflow capability
gating, and reusable adapter helpers while `www` and dealership keep only
host-owned UI and routing.

## Execution Rules

- Keep moving through all phases unless a directly related test/gate fails.
- Keep `bun run test:new-sales-form-migration` as the primary migration gate.
- Preserve rollback controls until browser QA and rollback signoff are complete.
- Do not remove legacy `www` workflow fallback in this pass.

## Checklist

- [x] Restore safe `www` package-panel default.
- [x] Make `SalesFormEnginePanel` the documented shared entrypoint.
- [x] Add shared runtime schemas for sales-form payloads.
- [x] Reuse shared schemas in dealer save input.
- [x] Centralize dealer pricing/save composition in the shared sales-form package.
- [x] Keep DB query modules persistence-focused where feasible.
- [x] Consolidate repeated workflow adapter helpers.
- [x] Move dealer state/payload normalization toward shared package utilities.
- [x] Add/extend contract and parity tests.
- [x] Run focused migration gate.

## Results

- `@gnd/sales/sales-form` now exports shared portable Zod schemas, dealer quote
  record/save/payload composition, dealer quote pricing snapshots, and workflow
  image resolver helpers.
- Dealer quote saving now routes through `apps/api/src/db/queries` so the API
  layer can compose shared sales-form pricing while still using DB persistence
  and dealer visibility checks.
- `apps/www` defaults the package workflow panel to legacy unless explicitly
  opted into `package`.
- The dealership app now delegates dealer quote state hydration, line creation,
  pricing, and save payload mapping to package helpers.

## Notes

- Browser QA is still a separate external gate if local auth/MySQL is unavailable.
- `www` legacy/package switch remains available through env, URL override, and
  local storage until production signoff.
- `bun run test:new-sales-form-migration` passed with 88 sales package tests,
  19 dealer persistence tests, dealership typecheck, and the tolerated `www`
  baseline check.
- Full `@gnd/api` typecheck still has existing unrelated workspace failures; a
  filtered check found no errors in the touched API route/schema/query files.

---

# WWW Unused/Old Code Cleanup Continuation

Date: 2026-06-18
Status: In Progress

## Goal

Continue the conservative `apps/www` unused/old-code cleanup from the current
Knip baseline without widening scope or deleting live compatibility code.

## Execution Rules

- Let Knip identify candidates, then require exact path/symbol scans before
  deleting tracked files.
- Keep tests and sales/payment/production/customer/inventory flows unless a
  candidate is proven detached.
- Use lightweight validation only: focused `rg`, refreshed file-only Knip
  snapshot, and scoped whitespace/diff checks.

## Current Slice

- [x] Verify the app-side clean-code production list/action utility pair.
- [x] Delete only files with clean exact-reference scans.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the slice result.

## Follow-On Slice

- [x] Verify the remaining app-side sales/production helper island.
- [x] Delete only detached helpers while keeping tested production assignment code.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new 96-candidate baseline.

## Current Action Slice

- [x] Verify old action leaves and test-read false positives.
- [x] Delete only detached action files while keeping test-read fallback code.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Second Action Slice

- [x] Verify standalone sales action leaves.
- [x] Delete only app-local actions with no live imports.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Sales Action Island Slice

- [x] Verify old `app-deps/(v1)/(loggedIn)/sales/_actions` leaves.
- [x] Delete only the self-contained v1 sales action island.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Sales Customer Island Slice

- [x] Verify remaining old v1 sales customer/type files.
- [x] Delete only the self-contained customer/type island.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## V1 Utility Helper Slice

- [x] Verify old app-deps wallet/settings/progress/pagination helpers.
- [x] Delete only detached v1 utility helpers.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Root Dispatch Utility Slice

- [x] Verify the root `utils/db/where.dispatch.ts` helper is detached.
- [x] Delete only the root duplicate while keeping live dispatch query helpers.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## App-Local Trigger Email Slice

- [x] Verify the app-local Trigger/email v3 chain is detached from deployment config.
- [x] Delete only the duplicate app-local task/template/resend files.
- [x] Confirm `@gnd/jobs` owns the live `send-composed-email` task.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Dyke Step Component Action Slice

- [x] Verify old app-local step-component actions are detached from imports.
- [x] Delete only the unused action pair and their private schema exports.
- [x] Confirm the active save/pricing path remains in `@gnd/inventory` via inventories tRPC.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## Duplicate Legacy Step Hook Slice

- [x] Verify the app-deps duplicate `legacy/use-dyke-form-step` hook has no imports.
- [x] Delete only the duplicate app-deps hook while keeping the live app-side hook.
- [x] Refresh the Knip file-candidate snapshot.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Sales Form UI Leaf Slice

- [x] Verify the old app-deps sales-form UI leaves have no live imports.
- [x] Delete only the detached `component-section-footer`, old `custom-component`, and `data-page/line-input` leaves.
- [x] Keep similarly named live action/shared line-input files.
- [x] Refresh the Knip file-candidate snapshot to the 53-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Modal Leaf Slice

- [x] Verify orphan `deps-modal` and `height-settings-modal` files have no live imports.
- [x] Delete only the detached modal pairs.
- [x] Keep separate live `component-deps-modal` files.
- [x] Refresh the Knip file-candidate snapshot to the 49-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Step Component Wrapper Follow-On Slice

- [x] Verify `step-component-modal` wrapper/hook files have no external opener.
- [x] Delete only the detached wrapper/hook and follow-on orphan search/render-form helpers.
- [x] Keep live `component-deps-modal` and step-products helpers.
- [x] Refresh the Knip file-candidate snapshot to the 45-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## App-Deps Remaining Form Leaf Slices

- [x] Verify orphan `doors-modal` and private `step-products/product` helper have no live imports.
- [x] Delete only the detached door selector pair while keeping the step-products type barrel.
- [x] Verify duplicate app-deps step/pricing use-case and data-access copies have no live imports.
- [x] Delete only the duplicate app-deps use-case/data-access chain while keeping app-side live copies.
- [x] Verify detached hook/context leaves and empty `hpt-helper` have no live imports.
- [x] Keep live `legacy-dyke-form-helper`, `data-store`, `legacy-hooks`, and `component-deps-modal`.
- [x] Refresh the Knip file-candidate snapshot to the 35-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Customer Data And Duplicate Hook Slice

- [x] Verify `CustomerDataSection` customer data island has no live imports.
- [x] Delete only the detached component and private customer data/cache actions.
- [x] Switch `legacy-dyke-form-helper.tsx` to app-side sales-form hook type imports.
- [x] Delete duplicate app-deps `data-store` and `legacy-hooks` type-source files.
- [x] Refresh the Knip file-candidate snapshot to the 30-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Payment Resolution Island Slice

- [x] Verify `resolvePaymentAction` has no live imports or action references.
- [x] Verify `delete-payroll.ts` is private to the detached action island.
- [x] Delete only the detached payment-resolution action/helper pair.
- [x] Keep production-control reset files because the regression test reads them directly.
- [x] Refresh the Knip file-candidate snapshot to the 28-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Rootless Legacy Dyke Form Chain Slice

- [x] Verify legacy Dyke form hooks/contexts have no live providers or callers.
- [x] Verify app-deps step action/helper/modal files are only referenced inside the same rootless island.
- [x] Verify the app-deps step-products type barrel is private to the deleted island.
- [x] Delete only the rootless legacy Dyke form compatibility chain.
- [x] Keep separate current `zus-step-helper` imports used by active sales-form components.
- [x] Refresh the Knip file-candidate snapshot to the 20-candidate baseline.
- [x] Update Brain report/progress with the new baseline.

## Retained Tail Classification

- [x] Classify remaining file-only Knip candidates after the 20-candidate baseline.
- [x] Confirm 16 remaining candidates are tests and retained by default.
- [x] Confirm 3 remaining production-control files are read directly by `production-control-reset.test.ts`.
- [x] Confirm `styles/globals.css` is tooling-backed by `apps/www/src/components.json` even though it is not runtime-imported.
- [x] Record that no further conservative tracked-file deletion remains without deleting tests or making a tooling/regression-coverage decision.

## Package Dependency Cleanup Slice

- [x] Refresh full Knip issue snapshot including dependencies, unlisted, unresolved, and exports.
- [x] Exact-scan high-confidence stale dependency candidates before package edits.
- [x] Remove unused `@gnd/www` package declarations for old GitHub actions, Cloudinary React helpers, MDX/MDX editor packages, accidental `crypto`/`i`/`npm`, `resend`, and `@types/mdx`.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 39 runtime / 3 dev dependency baseline.
- [x] Update Brain report/progress with the dependency cleanup result.

## Package Dependency Cleanup Slice 2

- [x] Exact-scan the remaining 39 runtime dependency candidates against `apps/www` imports and config.
- [x] Remove only package declarations with no direct `apps/www` import/config owner.
- [x] Remove the stale commented `@gnd/events/client` layout import left behind by the dependency cleanup.
- [x] Delete old unreferenced `apps/www/tailwind-copy.config` and remove its private plugin deps.
- [x] Remove unused package-local `vercel` CLI dev dependency while keeping Vercel runtime packages.
- [x] Keep tooling-sensitive candidates for separate review: `eslint`, `eslint-config-next`, `puppeteer-core`, and `tailwindcss`.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the dependency cleanup result.

## Unresolved Import Cleanup Slice

- [x] Inspect the five remaining Knip unresolved import candidates.
- [x] Confirm the affected legacy sales type files are still live through old sales-form paths.
- [x] Retarget stale `@/app/(v2)/(loggedIn)/sales-v2/type` imports to the existing app-deps path.
- [x] Replace deleted private v2 form-action imports with a local structural legacy form type.
- [x] Refresh full Knip snapshot to the 0 unresolved import baseline.
- [x] Update Brain report/progress with the unresolved cleanup result.

## Unlisted Dependency Cleanup Slice

- [x] Verify `server-only` is imported directly by `apps/www` server-only modules.
- [x] Add `server-only` to `@gnd/www` dependencies.
- [x] Refresh `bun.lock` with `bun install --lockfile-only`.
- [x] Refresh full Knip snapshot to the 0 unlisted dependency baseline.
- [x] Update Brain report/progress with the unlisted cleanup result.

## Retained Tooling Candidate Decision

- [x] Verify `eslint` and `eslint-config-next` are retained for package/root lint workflows.
- [x] Verify `puppeteer-core` is retained by Next `serverExternalPackages`.
- [x] Verify `tailwindcss` is retained for Tailwind/PostCSS/shadcn tooling.
- [x] Record the retained-tooling rationale in the cleanup report.

## Export Candidate Triage Slice 1

- [x] Inspect low-risk auth/routing/test-backed export candidates.
- [x] Retain exports that are imported by focused tests.
- [x] Remove only verified unused auth exports: `emptyAuthSnapshot`, `signOut`, and exported `AUTH_LOGIN_ROUTE`.
- [x] Refresh full Knip snapshot to the 550 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 2

- [x] Exact-scan routing, sales-print, payment, and new-sales-form export candidates.
- [x] Demote local-only helpers instead of changing runtime behavior.
- [x] Remove unreferenced new-sales-form hooks/mapper wrappers and unused sales-print wrapper functions.
- [x] Retain test-facing exports in auth, routing, local recovery, payment preview, and sales-print access code.
- [x] Refresh full Knip snapshot to the 525 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 3

- [x] Exact-scan small utility/component export candidates.
- [x] Remove definition-only utility exports while keeping still-imported module helpers.
- [x] Remove now-unused `@date-fns/tz` from `@gnd/www` and refresh `bun.lock`.
- [x] Demote or remove local-only component exports without changing live imports.
- [x] Refresh full Knip snapshot to the 503 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 4

- [x] Exact-scan module-live export candidates where files still have active imports.
- [x] Remove only dead exports from task notification, unit-invoice report definitions, employee list, and community project analytics modules.
- [x] Delete the unmounted debug modal and follow-on `use-debug-params` leaf.
- [x] Refresh full Knip snapshot to the 498 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 5

- [x] Exact-scan filter/query-param hook export candidates.
- [x] Demote private schemas while preserving live hook and loader exports.
- [x] Remove unreferenced inventory/sales-print loaders and duplicate customer-filter inbound view export.
- [x] Remove dead static-trpc path/invalidate helpers while keeping legacy `_trpc` / `_qc` globals.
- [x] Refresh full Knip snapshot to the 482 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 6

- [x] Exact-scan schema/constants/helper export candidates.
- [x] Demote local-only auth schemas and keep live auth form schemas.
- [x] Remove unused legacy payment, dispatch, HRM, numeric, and currency helper exports.
- [x] Demote `queryMeta` and remove stale constants/type exports.
- [x] Refresh full Knip snapshot to the 469 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 7

- [x] Exact-scan small UI/context/table export candidates.
- [x] Demote local-only context and component helper exports while keeping providers, hooks, and compound components live.
- [x] Remove unused Midday search-filter exports, stale table hook/aliases, and duplicate legacy sales-orders columns.
- [x] Delete the unused generic `tables-2/core` bottom bar after confirming migrated tables use domain-specific bottom bars.
- [x] Refresh full Knip snapshot to the 448 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 8

- [x] Exact-scan small helper export candidates.
- [x] Demote local-only status/id/loader/note context helpers behind live public wrappers.
- [x] Remove the unused dev-flow `logError` wrapper while keeping active flow logger exports.
- [x] Refresh full Knip snapshot to the 443 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 9

- [x] Exact-scan small clean-code UI and helper export candidates.
- [x] Demote local-only combo-box/table, sales-form, shelf, door, product variant, and sales-meta helpers.
- [x] Remove definition-only upload/task-monitor helpers and unused `_v1/icons` `Icon` re-export.
- [x] Refresh full Knip snapshot to the 428 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 10

- [x] Exact-scan legacy clean-code sales-form modal export candidates.
- [x] Demote local-only `useInitContext` helpers while keeping live modal opener exports.
- [x] Demote unused modal component default/named exports and keep directly imported `door-size-modal` default export.
- [x] Refresh full Knip snapshot to the 413 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 11

- [x] Exact-scan sales DTO and utility mirror export candidates.
- [x] Remove empty `salesStatisticDto` stubs from app/app-deps mirrors.
- [x] Demote private DTO/dispatch helpers while preserving the live app-deps delivery helper import.
- [x] Refresh full Knip snapshot to the 404 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 12

- [x] Exact-scan low-risk UI/table export candidates.
- [x] Delete unused page-tab TRPC wrapper file while keeping live `PageTabs` barrel export.
- [x] Demote private scroll-header constants and remove unused aggregate table config accessor.
- [x] Refresh full Knip snapshot to the 394 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 13

- [x] Exact-scan clean-code data-table and sales utility export candidates.
- [x] Demote private search-param parser/schema internals while keeping live parser/cache/serializer/type exports.
- [x] Remove unused duplicate `composeStepFormDisplay` helpers from app/app-deps sales step utility mirrors.
- [x] Demote item-control UID implementation helpers and remove the unused app-side shelf/generate helper path while keeping the live app-deps generate export.
- [x] Refresh full Knip snapshot to the 386 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 14

- [x] Exact-scan clean-code utility, table-settings, and percentile export candidates.
- [x] Remove unused duplicate `dotArray` / `dotKeys` helpers while preserving live `dotObject` / `dotSet` utility exports.
- [x] Demote table-settings default helpers behind exported `mergeWithDefaults`.
- [x] Remove dead percentile value helpers while keeping the type export used by data-table query options.
- [x] Refresh full Knip snapshot to the 376 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 15

- [x] Exact-scan barrel and internal-helper export candidates.
- [x] Demote email composer primitives behind the exported `mailComposer` object.
- [x] Trim notification-center and table-core barrel re-exports while keeping live public barrel entries.
- [x] Demote community-template v1 `FormSection` / `styler` internals while keeping concrete section exports.
- [x] Refresh full Knip snapshot to the 366 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 16

- [x] Exact-scan v2 unit invoice/production table export candidates.
- [x] Remove unused `projectTabColumns` and card component exports from the v2 unit table column modules.
- [x] Preserve live table `columns`, row types, and row id helpers imported by current skeleton/store/data-table modules.
- [x] Refresh full Knip snapshot to the 362 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 17

- [x] Exact-scan private helper export candidates.
- [x] Demote custom-component combobox and model-install context internals while preserving live public builders/providers/hooks.
- [x] Demote sidebar access-rule plumbing and remove unused active-link helper.
- [x] Remove unused debug-toast hook/helper while keeping `useDebugConsole`.
- [x] Refresh full Knip snapshot to the 354 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 18

- [x] Exact-scan legacy helper export candidates.
- [x] Remove unused packing item context exports while keeping the live packing provider/hook.
- [x] Remove unused legacy Redux dispatch/static-list/navigation helper exports and stale breadcrumb while keeping the store reducer and live transform helper.
- [x] Remove old unreferenced app-local DB query-builder/search helpers while keeping `transformDate`.
- [x] Refresh full Knip snapshot to the 346 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 19

- [x] Exact-scan dashboard params and app-local sales-control utility exports.
- [x] Demote dashboard date/default-param internals while preserving live dashboard public APIs.
- [x] Remove unused app-local sales-control stat composer and private-only quantity helpers while preserving live quantity exports.
- [x] Remove the follow-on app-deps `generateItemControlUid` helper that only fed the deleted path.
- [x] Refresh full Knip snapshot to the 337 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 20

- [x] Exact-scan old static-data hooks, note/community helpers, filter-command helpers, and app-local sales data access.
- [x] Trim `_v2` static-data hooks to the live `useBuilders` export and delete now-orphan static-loader action files.
- [x] Remove unused note/community helper exports while preserving live note tag and community model/search helpers.
- [x] Remove the detached sales filter preset/type island while preserving the live `__findFilterField` import.
- [x] Delete the old app-local `data-access/sales.ts` module and remove its now-dead legacy date query helper.
- [x] Refresh full Knip snapshot to the 302 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 21

- [x] Exact-scan raw data-table/community-template context exports and legacy utility helper exports.
- [x] Demote raw React context exports while preserving provider and hook exports.
- [x] Demote the local-only clean-code `useDataTable` implementation export.
- [x] Remove unused v1 action utility exports and root sales utility helper exports while preserving live neighboring APIs.
- [x] Refresh full Knip snapshot to the 288 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 22

- [x] Exact-scan action/static helper exports with no current imports.
- [x] Remove unused cached sales-accounting filter, sidebar auth override, token validation, static tRPC bootstrap, and single-query tRPC prefetch exports while preserving live sibling APIs.
- [x] Demote file-local role creation, takeoff root-component loading, and sales-settings tag constants.
- [x] Convert value-dead `salesHaving` to the still-live type-only `SalesHaving` union.
- [x] Refresh full Knip snapshot to the 279 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 23

- [x] Exact-scan utility DB query-builder exports and shared `lib/utils.ts` export candidates.
- [x] Demote internal DB `where*` helpers and the sales search parser while preserving live metadata/query exports.
- [x] Remove unused `mergePermissionsQuery` while preserving `whereUsers`.
- [x] Remove unused shared utility exports and demote `removeEmptyValues` to private use by `transformData`.
- [x] Refresh full Knip snapshot to the 248 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 24

- [x] Exact-scan chat barrel, old sales-accounting table, v1 cache helper, and old sales overview data-access candidates.
- [x] Trim unused chat barrel and legacy sales-accounting table column exports while preserving live imports.
- [x] Remove obsolete v1 cache read/write helpers while preserving `_cache`.
- [x] Delete the old sales overview data-access/type utility pair and remove the now-stranded app-deps `SalesIncludeAll` include object.
- [x] Refresh full Knip snapshot to the 242 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 25

- [x] Exact-scan clean-code DB utility include/date helper candidates in app and app-deps mirrors.
- [x] Remove unused infinite-list, Dyke-form include, app-side `SalesIncludeAll`, and app-side `composeQuery` export surfaces while preserving live include/filter imports.
- [x] Remove unused generic date helper exports while keeping app-deps `anyDateQuery` and pagination helpers that still have callers.
- [x] Demote the step price count include to file-local use by `SalesBookFormIncludes`.
- [x] Refresh full Knip snapshot to the 227 export-candidate baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 26

- [x] Exact-scan utility/action helper export candidates in sales utility mirrors, cached HRM, v1 session utilities, generic DB utils, and sales-form helper code.
- [x] Remove unused exports while preserving live sales status/sort/URL/payment helpers, permissions cache, session/user/auth ID helpers, and current pagination imports.
- [x] Remove the now-unused `bcrypt-ts` app dependency after exact source scans found no remaining `apps/www` import.
- [x] Refresh split Knip snapshots to the 208 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 27

- [x] Exact-scan legacy `_v1` table helper export candidates in row actions, base columns, and follow-on color helpers.
- [x] Remove unused row-action wrapper exports while preserving live `DeleteRowAction` and `MenuItem`.
- [x] Remove unused old base-column helper exports while preserving live `Cell`.
- [x] Remove the follow-on unused `getBadgeColor` / `statusColor` helper path.
- [x] Refresh split Knip snapshots to the 194 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 28

- [x] Exact-scan legacy community unit modal, invoice item component slice, and sales type re-export candidates.
- [x] Demote the unused `HomeModal` default export while preserving the live `useHomeModal` opener.
- [x] Remove unused invoice item component action creator exports while preserving the mounted reducer.
- [x] Remove the unused app-side `HousePackageToolMeta` re-export while preserving file-local type use and the app-deps type surface.
- [x] Refresh split Knip snapshots to the 185 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 29

- [x] Exact-scan legacy Cloudinary and revalidate helper exports.
- [x] Remove the unused no-op Cloudinary `saveToDatabase` export while preserving live `getSignature`.
- [x] Remove the unused raw `__revalidatePath` export while preserving live keyed `_revalidate`.
- [x] Refresh split Knip snapshots to the 183 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 30

- [x] Exact-scan old v1 community builder/project action exports and v1 action pagination utilities.
- [x] Remove unused builder table/task mutation exports while preserving live `staticBuildersAction`.
- [x] Remove unused community project table/update wrappers while preserving live `saveProject`, `staticProjectsAction`, and `updateProjectMeta`.
- [x] Remove follow-on unused `queryFilter` / `getPageInfo` v1 action utilities while preserving live date helpers.
- [x] Refresh split Knip snapshots to the 174 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 31

- [x] Exact-scan old v1 auth, notification, community-template, and follow-on utility exports.
- [x] Remove unused legacy auth reset/login exports while preserving live reset-request, email-login-link, and quick-login helpers.
- [x] Remove unused old notification action exports while preserving live `INotification` and `_notify`.
- [x] Remove unused old community-template mutation/import exports while preserving live `staticCommunity`.
- [x] Remove follow-on unused app-local community cost/pivot and numeric helper exports.
- [x] Refresh split Knip snapshots to the 153 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 32

- [x] Exact-scan old sales-form wrapper and step-helper export candidates.
- [x] Demote the app-local `getSalesBookFormUseCase` value export while preserving the live `GetSalesBookForm` type surface.
- [x] Remove unused app/app-deps `getStepDta` and `validateNextStepIdDta` helpers.
- [x] Remove the unused v1 `_getSalesFormAction` wrapper while preserving live `salesFormData`.
- [x] Refresh split Knip snapshots to the 147 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 33

- [x] Exact-scan app-deps sales-form step mirror exports.
- [x] Remove unused app-deps step routing/delete/meta/update helpers that current callers do not import.
- [x] Preserve app-deps `getSalesFormStepByIdDta`, which remains imported by app-deps sales-form data access.
- [x] Refresh split Knip snapshots to the 140 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.

## Export Candidate Triage Slice 34

- [x] Exact-scan app-deps sales-book use-case, production list, production assignment, labor-cost, and customer-transaction candidates.
- [x] Remove unused app-deps sales-book settings/copy/move use-case exports while preserving live form load/create/save exports.
- [x] Demote internal production list/customer transaction helpers while preserving live exported entry points.
- [x] Demote raw production assignment and labor-cost mutation helpers while preserving public safe-action wrappers.
- [x] Refresh split Knip snapshots to the 129 export-candidate baseline and 3 runtime / 1 dev dependency baseline.
- [x] Update Brain report/progress with the export cleanup result.
