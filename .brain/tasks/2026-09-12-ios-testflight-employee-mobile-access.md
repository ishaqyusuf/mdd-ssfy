# Task: iOS TestFlight Internal Distribution And Employee Mobile Access

## Status
In Progress — External Action Gate

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 1/1

## Source Context
Prepare GND's Expo SDK 54 app for secure employee-only iOS distribution through TestFlight while preserving Android and the existing EAS project/update linkage. Add an authenticated, auditable employee mobile-access request and admin review lifecycle, complete local validation and documentation, and stop only at an explicit Apple/Expo credential, permission, upload, submission, or invitation gate.

## Implementation Progress
- Completion: 100% of safe local preparation
- Current Checklist: 11/11 — Safe local work is complete; Terms V100 is accepted,
  EAS is authenticated as `pcruz321`, and the retained project link is verified
- Blocker: App Store Connect still has no app record for `com.gnd.prodesk`.
  Creating it is the next explicit external-action gate; build/signing/upload and
  tester operations remain separately gated afterward.

## Implementation Checklist
- [x] Audit Expo/EAS, authentication, permissions, updates, signing assumptions, dependencies, and release docs
- [x] Add explicit iOS TestFlight store build, submit, and build-and-submit profiles/scripts without changing Android behavior or EAS linkage
- [x] Determine export-compliance declaration from repository evidence and configure only the supported value
- [x] Add focused iOS release-readiness validation and tests
- [x] Add a durable, auditable mobile-access request/status model and migration
- [x] Add authenticated employee self-service and permission-gated admin API contracts with manual invitation operations
- [x] Add the employee request and admin review/status dashboard experience using existing UI patterns
- [x] Document the activation-day/TestFlight runbook, internal-vs-external tester policy, adapter boundary, and troubleshooting
- [x] Update required Brain feature, API, database, decision, task, and progress documentation
- [x] Run focused tests, config introspection, package typechecks, UI validation, and final code review
- [x] Commit the scoped work and stop at the first gated external Apple/Expo action

## Validation Evidence
- `bun test apps/mobile/scripts/ios-release-readiness.test.ts apps/mobile/src/lib/preview-build-security.test.ts` - 5 passed, 37 assertions.
- `bun run ios:release:check` - 18/18 readiness checks passed after adding SDK
  dependency and native-resolution invariants.
- Dependency-hardening release/workflow/Metro regression subset - 16 passed /
  77 assertions; the broader consolidated suite remains 33 / 141.
- `bunx expo install --check` reports dependencies up to date after pinning
  NetInfo and updating the Expo SDK 54 patch set.
- `bunx expo-doctor` passes 17/18 checks. The remaining duplicate native-module
  warning comes from Bun's isolated peer installations; SDK 54
  `autolinkingModuleResolution` is enabled and verified in public config so
  Metro uses the native installation selected by Expo Autolinking.
- Production-mode iOS Metro export passed (8,450 modules) after separating a
  mobile-safe sales completion filter contract from the server implementation's
  `node:crypto` dependency.
- Sales completion boundary regression: 53 tests / 187 assertions passed.
- Final focused suite - 33 passed / 141 assertions.
- `bun run --filter @gnd/db typecheck` passed.
- `bun run --filter @gnd/api typecheck` reached one unrelated pre-existing error in `packages/sales/src/copy-sales.ts:521`; no mobile-access file failed.
- Dashboard typecheck required an 8 GiB heap, then reached the existing repository-wide error backlog. Scoped output identified only the new route test's `import.meta.dir`; it was replaced with standards-based `import.meta.url`. Remaining matched `sidebar-links.test.ts` matcher typing errors pre-date this change, and the runtime sidebar suite passes.
- `bunx tsc --noEmit -p apps/mobile/tsconfig.json` reaches existing mobile/API/path-alias errors; no release-config/readiness file failed.
- Public Expo config resolved production bundle, EAS owner/project/update link, export flag, and empty embedded development password as expected.
- The full 134-migration chain passed in an isolated local database; the temporary database was removed. Local `db:push` reports the schema in sync.
- Local unauthenticated browser smoke test returned 200 for `/support/mobile-app` with no console errors or failed document/assets; authenticated UI content was not exposed to the isolated headless session.
- `bun run eas:auth` passed its focused tests and authenticated the configured
  account as `pcruz321` after explicit approval. Read-only `eas project:info`
  verified `@pcruz321/gnd-prodesk` and the retained project ID; its iOS build
  history is empty.
- Read-only Apple inspection verified active organization membership, Account
  Holder role, Team ID, active Free Apps Agreement, and empty app/signing-resource
  inventories. App Store Connect Terms of Service V100 was accepted after
  explicit approval. The Apps page remains empty and is prepared at the app-record
  creation gate. API integration access separately requires `Request Access`.
