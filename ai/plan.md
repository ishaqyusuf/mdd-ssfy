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
