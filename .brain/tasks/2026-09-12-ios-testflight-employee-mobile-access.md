# Task: Public iOS App Store Distribution And Employee Mobile Access

## Status
In Progress — Public App Store preparation and external action gates

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-15

## Global Ticket
- Ticket Position: 1/1

## Source Context
Prepare GND's Expo SDK 54 app for secure employee-only iOS distribution through TestFlight while preserving Android and the existing EAS project/update linkage. Add an authenticated, auditable employee mobile-access request and admin review lifecycle, complete local validation and documentation, and stop only at an explicit Apple/Expo credential, permission, upload, submission, or invitation gate.

The September 12–14 TestFlight objective is historical. On September 15 the
product owner changed the target to a public, globally available App Store app
with no internal TestFlight distribution. The existing request/audit work
remains; ordinary users need no ASC portal membership to download the public
binary. Existing company-account authentication remains until a separately
approved public registration design exists.

## Implementation Progress
- Completion: 14/15 — the public-release code/build path and conditional
  in-app policy link are prepared; final privacy-policy approval and URL,
  Apple listing/compliance,
  upload, review, and release remain gated
- Local source checkpoint: scoped public-release and mobile-access hardening
  committed as `56d1d91d7` on September 15. The 26-test / 128-assertion
  release-and-access subset passes; no fresh privacy-complete IPA, Apple
  upload, metadata save, App Review submission, or public release occurred.
  This commit is a reproducible source baseline, not proof that the submitted
  binary embeds an approved policy URL.
- Current Checklist: 14/15 — Terms V100 is accepted,
  EAS is authenticated as `pcruz321`, the retained project link is verified, and
  the build-only store release path completed successfully
- Remaining gate: The Account Holder signed in on September 15 and live
  App Store Connect readiness was inspected read-only. Worldwide
  release also requires accurate App Privacy/privacy-policy URL, final listing
  screenshots and support URL, review account/demo, age rating, EU trader
  declaration, pricing/availability, and separate binary upload/App Review/
  public-release confirmations. EAS now securely stores Apple Distribution certificate `ZDC9NMPYX8`
  and App Store profile `6VT956987X`; all temporary exported private material was
  removed. Store build `3f3a6acf-ac06-42b8-ab72-1837480f49cc` completed for
  version `1.0.305` / build `5`. It is validation-only because unrelated dirty
  workspace state was present. Clean detached build `6`, EAS ID
  `f3985128-844d-432c-bbc3-e0e4c93e37ac`, then completed from reviewed commit
  `40a62218e` and passed independent IPA metadata/profile inspection. Explicit
  upload approval was given, but EAS requires creation of a new App Store Connect
  API key. The submit command was cancelled before key creation or Apple upload;
  separate action-time confirmation for that key is now required. The old EAS
  Apple ID prompt was cancelled after the public-direction change; no key or
  Apple upload was created. TestFlight tester groups/invitations are no longer
  part of this release.
  A September 15 source-backed privacy audit found conditional Logly analytics
  and Sentry diagnostics, authenticated profile/session data, and employee and
  dispatch document/photo/signature upload paths. The live
  `gndmillwork.com/privacy-policy/` page is only a candidate for the Apple
  privacy-policy URL until the legal owner confirms seller/app coverage and
  accurate data practices. Both sign-in designs and the production signed-in
  Settings footer now have an accessible in-app link wired to
  `EXPO_PUBLIC_PRIVACY_POLICY_URL`; it remains hidden until the
  owner-approved HTTPS URL is supplied. Readiness fails on that missing value,
  and the iOS store build/combined package scripts now invoke production
  preflight before queueing EAS.
  Build `6` is a signed release-path proof, not yet a submission-ready
  privacy-complete binary.

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
- [x] Replace TestFlight release labels/workflow guidance with explicit public App Store build and build-ID upload commands while preserving Android/preview behavior
- [x] Publish the public App Store runbook and superseding ADR; cancel the private Custom App proposal
- [x] Validate public-release source/config and dashboard guidance with focused checks
- [ ] Complete Apple listing, privacy/legal, review access, worldwide availability, binary upload, App Review, and public release only at separate action-time gates

## Validation Evidence
- September 15 public-release delta: 13 focused release/permission/guidance
  tests passed (75 expectations), including the dashboard public-copy guard,
  `bun run ios:release:check` passed 21/21, and scoped `git diff --check`
  reported no whitespace errors. Read-only browser QA of `/support/mobile-app`
  reached the authenticated login redirect, so the changed employee-only copy
  was guarded by source test but could not be visually inspected without GND
  login. Read-only App Store Connect inspection reached Apple Account sign-in;
  no portal save or submission occurred. The stalled old EAS prompt was
  interrupted with exit 130 before credential entry, key creation, or upload.
- September 15 privacy-link delta: 6 focused mobile release/security/UI-guard
  tests passed (47 assertions). With no policy URL, release readiness passed
  22/23 and failed only the intentional privacy URL gate. A local synthetic
  HTTPS URL passed 23/23, proving wiring only; it was not saved or approved as
  a live policy. Scoped Biome lint passed for the six touched TS/TSX files; the
  two new/changed test and link files also passed full formatting. Mobile
  typecheck still fails broadly on existing API/path-alias and mobile errors;
  the only diagnostics on touched login templates are the unchanged
  `form.handleSubmit` typing errors at their existing lines. No new component,
  config, or release-readiness file produced a diagnostic. No new IPA or Apple
  upload was started. The production-env package preflight likewise stopped at
  the privacy gate without the URL and passed 23/23 with a one-off synthetic
  URL; no EAS build command was started.
- Signed-in reachability follow-up: the shared mobile Settings screen now
  renders the same link outside its dev-only `Debug` section, before Log Out;
  the UI guard covers both sign-in designs and that production footer. Scoped
  Biome lint on the changed Settings/test files passes. No
  privacy URL was approved or saved.
- Public-account scope audit: the one-word mobile sign-up route and driver-app
  alias were removed, and `www-mobile-sign-in` resolves only an existing unrevoked,
  undeleted legacy employee/manager record. The current public binary is
  downloadable worldwide but cannot onboard arbitrary new users. Confirm
  whether public self-registration is desired before App Review; it requires
  a separately approved auth/tenant/privacy design.
- Official Apple review research confirms that public storefront availability
  does not itself require public self-registration; existing company-account
  sign-in is compatible with the cited business-login guidance. App Review
  still needs an active account with full representative access, and account
  deletion becomes required if the app adds account creation. Source links and
  qualifications are in
  `.brain/reports/2026-09-15-ios-public-login-app-review.md`. A focused iOS
  release regression now guards both removed placeholder routes; no public
  signup, portal save, credential, or Apple upload was introduced.
- Release-specific privacy hardening: `ios:release:preflight` now forces the
  production Expo variant and emits only non-secret telemetry enablement/HTTPS
  booleans. Explicit production config rejects Sentry debug/smoke-test modes
  and enabled Sentry/Logly without HTTPS configuration. The iOS-only EAS
  profile flag also guards EAS's production environment without changing
  Android production routing. The four-test focused iOS readiness suite
  passes, including three negative subprocess cases and an Android non-impact
  case. The local inventory is
  not an App Privacy answer or proof of the final remote build's vendor
  behavior. The normal local check remains 27/28 with only the unapproved
  privacy-policy URL failing; a one-off synthetic HTTPS URL passes 28/28 as
  wiring proof only. Privacy/legal approval and a fresh binary remain gated.
- Server-side privacy follow-up: the mobile employee-document upload registers
  a Vercel Blob-backed `StoredDocument`; its authenticated delete operation
  tombstones the user's document and stored-document database rows but does
  not call Blob `del`. A staged-browser-upload delete route is separate.
  The privacy report now records this distinction and a legal/data-operations
  retention/purge `TODO:`; no user document or Blob was deleted.
- Read-only EAS production inventory: authenticated `eas whoami` confirms
  `pcruz321`; the policy URL variable is absent at both project and account
  production scope. Logly/Sentry variable names exist at project scope, but
  their effective true/false values remain unverified by the safe probe.
  `.brain/reports/2026-09-15-ios-eas-production-env-inventory.md` records only
  name-presence results. The next EAS variable set is an action-time owner
  gate after exact legal URL approval; no value or credential was printed or
  saved, and no EAS/Apple setting changed.
- Combined-command safety review: the root build/auto-upload route now rejects
  missing separate build/upload acknowledgments before EAS authentication;
  the direct mobile-package command has its own fail-closed guard before
  preflight. The account runner rejects an explicit Android platform on its
  iOS-only submit/combined routes before authentication. The 10-test focused
  runner/readiness set passes, including invalid/missing-ack and platform
  subprocesses; scoped Biome check passed and synthetic
  HTTPS config introspection remains 28/28. For the first release, inspect a
  new IPA
  and upload by explicit reviewed ID instead of using auto-submit. No build
  or Apple upload was started; script acknowledgments do not supersede
  action-time owner confirmation.
- Live candidate-policy comparison: the current retail-branded page mentions
  mobile applications, analytics, and photos generally but does not prove the
  Apple seller/controller relationship or accurately explain employee auth,
  operational uploads, retention, or Blob tombstone/purge semantics. The
  source-cited `.brain/reports/2026-09-15-ios-live-policy-gap-review.md` is a
  legal/product review input, not approval to use that URL or fill App Privacy.
- Live App Store Connect follow-up: `GND Millwork` iOS 1.0 is Prepare for
  Submission. Public distribution is selected by default, but its free price
  schedule and App Availability are not set up. The Free Apps Agreement is
  active; Paid Apps Agreement is unsigned and unnecessary for the planned free
  first release. EU DSA trader compliance remains incomplete. App Privacy has
  no policy URL or questionnaire; name/bundle/SKU/Apple ID are present, while
  subtitle/category/age rating/Content Rights, screenshots, attached build,
  listing copy/support URL, and review credentials/contact/notes are incomplete.
  Automatic release after approval, Apple silicon Mac, and Vision Pro
  availability are selected by default and need owner review. No Apple field
  was edited or saved.
  The iPhone 6.5-inch and iPad 13-inch screenshot panels each show zero slots
  filled; accepted portrait sizes are documented in the public runbook. App
  Accessibility support labels have not been started, so no claim was made.
- Local listing preparation packet now captures a bounded draft for the
  current company-login-only binary, portal field owners, an authentic
  iPhone/iPad screenshot matrix, and a no-credential Review Information
  handoff template. Its copy remains provisional until the owner resolves
  public self-registration and approves each portal save; no account field
  changed.
- Release-command hardening: the legacy and public root iOS submit aliases
  now both require a reviewed build UUID; the account runner rejects missing,
  malformed, or `--latest` selections before authentication. Direct mobile
  package submit commands no longer choose the latest build automatically.
  Android routing, EAS owner/project, and production signing are unchanged;
  no EAS or Apple upload ran during this check.
- Current-state access audit found and closed an Android APK authorization
  edge: an active role assignment to a deleted `Super Admin` role could bypass
  the approved-request status check. The proxy now filters the referenced role
  for `deletedAt: null`. Its new regression failed before the fix; the focused
  route/workflow/invitation/permission suite passes 12 tests / 32 assertions.
  No external invitation, account permission, or artifact download was made.
- The same audit tightened the shared HRM Super Admin guard used by mobile
  access admin review: user deletion/revocation and referenced-role deletion
  now fail closed; any active Super Admin assignment can authorize review.
  Employee self-service requires an active referenced role too. The new
  admin guard regression failed before the fix; a runtime mock-database test
  now verifies its query shape and decisions. The focused access suite passes
  16 tests / 41 assertions. API typecheck found only current unrelated
  Assistant/Sales errors, with no changed guard/query diagnostic. Two permanent
  Brain bug records capture the authorization lessons.
- Final scoped UI review found that iOS `INVITED` was displayed as
  **Guidance sent** even for historical manual Apple invitations. The shared
  label is now **Access details sent**, which covers both old invitation
  records and new public App Store guidance without changing stored provider
  history or Android's **Invited** label. The focused dashboard UI guard failed
  before the copy correction and passed afterward.
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
- After explicit approval, Apple registered the explicit App ID `GND Millwork` /
  `com.gnd.prodesk` with optional capabilities disabled. It is now selectable in
  App Store Connect.
- After separate explicit approval, created the `GND Millwork` iOS app record with
  public Company Name `GND MILLWORK`, English (U.S.), SKU `gnd-prodesk-ios`, Full
  Access, and numeric Apple app ID `6811442922`.
- The explicitly approved production build initialized remote iOS build number
  `1` and the production update channel/branch, then stopped before build queueing
  or credential creation because Apple authentication returned
  `iTunes service key is empty`. Expo's open `eas-cli#4392` reproduces the same
  failure on newer EAS/Node combinations, so version churn is not the remedy.
- Generated a CSR named `gnd-millwork-distribution.certSigningRequest` with a
  private key retained in Keychain Access. Apple created Distribution certificate
  `ZDC9NMPYX8` and App Store profile `GND Millwork App Store` / `6VT956987X`, both
  expiring September 14, 2027. The downloaded certificate and profile validate
  for team `ZXC78SPCV4`, bundle `com.gnd.prodesk`, and profile UUID
  `be302ee0-1e9c-4df4-b39d-248ad085c5a4`. The WWDR G3 intermediate is installed,
  Keychain reports one valid signing identity, and an encrypted `0600` temporary
  `.p12` containing exactly one private key was prepared outside the repository.
- After separate action-time approval, uploaded the certificate and profile to
  EAS via its official `credentials.json` sync flow. EAS matched certificate
  serial `3E31B198C1691F7D0BBDCB5D068D6154`, active profile, team, and bundle, then
  reported all credentials ready. Removed the temporary `.p12`, password, and
  secret-bearing JSON immediately afterward.
- The build-only production command completed EAS build
  `3f3a6acf-ac06-42b8-ab72-1837480f49cc` as a signed `STORE` IPA, version
  `1.0.305`, build `5`, without uploading to Apple. Artifact inspection confirmed
  bundle `com.gnd.prodesk`, team `ZXC78SPCV4`, App Store beta entitlement,
  production `get-task-allow=false`, the verified embedded profile, and export
  compliance `false`. The artifact must not be submitted because the archived
  workspace contained unrelated uncommitted work.
- Created a detached clean worktree at commit `40a62218e`, confirmed it had no
  release-source changes and passed 19/19 readiness checks, then produced clean
  `STORE` build `f3985128-844d-432c-bbc3-e0e4c93e37ac` (version `1.0.305`, build
  `6`). Its IPA independently confirmed the expected bundle/team, App Store beta
  profile, production entitlements, and export declaration. The temporary IPA,
  inspection directory, and detached worktree were removed after verification.
- After explicit upload approval, ran `bun run eas:submit:ios`. It resolved the
  app credentials and stopped at **Generate a new App Store Connect API Key?**.
  Cancelled before accepting the default; no API key, submission job, or Apple
  upload was created.
