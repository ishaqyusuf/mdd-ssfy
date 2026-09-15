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
  screenshots and support URL, review account/demo, age rating,
  pricing/availability, and separate binary upload/App Review/
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
- September 15 App Privacy mapping: official Apple taxonomy is now mapped to
  the source-backed GND flows. **Yes, data is collected** is the provisional
  direction; Name, Email, Phone, User ID, Photos/Videos, Other User Content and
  Other Data Types have evidence-backed provisional mappings. Logly Device ID
  and Product Interaction plus Sentry diagnostics remain conditional on the
  exact candidate; telemetry linkage and every tracking answer require
  owner/vendor evidence. Sensitive, financial and purchase classifications
  remain gated. Nothing was entered, saved or published in App Store Connect.
- September 15 provider/data-flow matrix: source-backed paths now separate
  Vercel/dashboard/API and Blob storage, the production database, Upstash login
  limiting, conditional Logly analytics, conditional Sentry diagnostics,
  Expo/EAS build handling and Apple distribution. The matrix identifies exact
  contract, region, retention, deletion, linkage, tracking and final-candidate
  evidence still required, without exposing a value or changing a vendor
  account. It also rules out an Apple **Data Not Collected** answer because
  authenticated service and upload flows exist independently of telemetry.
- September 15 controller-identity trace: first-party source consistently ties
  the operational system and Miami contacts to GND Millwork, while Apple ties
  the app seller to ZEROES AND ONE TECH HUB NIG LIMITED. Storefront terms are
  internally inconsistent (`Corp`, `Corp, Inc.`, `Inc.` and an unexplained
  `HDPA` reference), and no repository agreement proves the relationship
  between the entities. A three-option owner decision matrix now prevents that
  relationship from being guessed into the privacy policy. No legal copy,
  public page or external account changed.
- September 15 app-specific privacy draft: a local, source-backed policy draft
  now covers company-issued authentication, role access, job/dispatch data,
  employee documents, proof photos/signatures, conditional analytics and crash
  diagnostics, providers, storage, retention/deletion, rights, international
  processing and public contact. Unknown controller/seller relationships,
  vendor operations, production telemetry, retention/purge, legal bases and
  regional terms remain bracketed blockers. Nothing was published or entered
  in Apple/EAS, and no `.env*` file changed.
- September 15 completion audit: every original deliverable and updated public
  App Store acceptance criterion now maps to authoritative source, test,
  artifact, portal or deployment evidence. The visible iOS 1.0 Build section
  has no attached build; the TestFlight view failed to render after one reload,
  so absence of all Apple-side builds is deliberately not claimed. Eight exact
  remaining gate groups cover privacy/legal, deployment authority, runtime
  acceptance, Apple form decisions/saves, fresh candidate, upload, review and
  manual release. No Apple/EAS/Vercel state changed.
- September 15 EU trader follow-up: the signed-in Account Holder dashboard
  explicitly warns that trader status is required for new app/update
  submissions distributed in the EU and that affected apps may be removed from
  the EU storefront. The Business module stayed on a loading spinner after one
  reload, so its fields could not be inventoried. No declaration, portal field,
  permission or submission changed; accurate DSA trader facts remain an
  Account Holder plus legal/business-owner gate.
- September 15 official DSA requirements packet: Apple says free pricing alone
  does not establish non-trader status. For an organization trader, the
  Account Holder/Admin workflow may require the D-U-N-S-linked public address,
  verified public phone and email, current business/address evidence,
  payment-account details if absent, and an EU-law compliance certification.
  Apple does not promise a review duration; its general compliance guidance
  says to contact Apple after 14 business days pending. No sensitive evidence,
  verification code, payment detail or account value was collected, and EU
  release remains gated until Apple shows verification complete.
- September 15 DSA action-time handoff: the Business module subsequently
  rendered and the signed-in Account Holder opened **Complete Compliance
  Requirements** read-only. The first modal offers **trader** or **not a trader
  / no EU distribution**; neither option is selected and **Next** remains
  disabled. The live tab is preserved at this exact legal-declaration gate. No
  trader status, contact information, document, payment detail or verification
  code was selected, entered or submitted.
- September 15 DSA contact handoff: after the owner authorized proceeding as a
  trader, the live Apple workflow advanced to **Contact Information
  Verification**. Apple presents its D-U-N-S-linked address as read-only and
  requires a country calling code, public contact phone and public contact
  email. Phone/email remain blank and **Next** is disabled. No login autofill,
  contact value, verification code, payment detail or document was entered or
  transmitted. The Account Holder must confirm the public address and supply or
  directly enter monitored business contact details.
- September 15 DSA completion: after the Account Holder completed the
  owner-controlled contact and verification steps, App Store Connect Business
  showed **Digital Services Act — Active**, covering 27 Countries or Regions
  and last updated September 15, 2026. The prior red warning disappeared. The
  EU trader gate is cleared subject to a final pre-review status recheck; no
  public contact value or verification code is stored in Brain. GND Millwork's
  app-specific App Information also states that the developer is identified as
  a trader for this app. The Apps dashboard's generic reminder remains visible,
  but the Active compliance row and explicit app status are controlling.
- September 15 accessibility/review inventory: live App Accessibility shows
  Get Started, confirming no accessibility support answers are published, and
  App Review contains no submitted items. A narrow source inventory found
  theme plumbing and some labels/roles/hints but not app-wide proof for
  VoiceOver, Voice Control, 200% Larger Text, contrast, color independence or
  reduced motion. A release-candidate QA matrix now defines the evidence needed
  for every Apple accessibility feature without claiming support prematurely.
  No accessibility answer, review item, portal field or build changed.
- September 15 metadata preparation: a source-backed English (U.S.) App Store
  metadata draft now covers bounded description/keywords, optional promotional
  text, URL candidates, category/pricing decisions, copyright, synthetic-data
  screenshot sequence, review-account handling, review notes, contact-data
  boundary, and age-rating/content-rights evidence. It explicitly describes a
  publicly downloadable app with existing company-account sign-in and no
  public registration. Unsupported claims and final product/legal selections
  remain marked for owner review; no App Store Connect field or credential was
  saved or transmitted.
- September 15 signed-in App Store Connect reinspection: GND Millwork iOS
  1.0 remains Prepare for Submission. App Privacy URL/questionnaire, price
  schedule and app-country availability, primary category, age ratings,
  Content Rights, iPhone screenshots, description/keywords/support URL,
  copyright, and review account/contact are unset in the inspected views.
  Public distribution is selected; Mac and Vision Pro availability and the
  School Manager volume checkbox are selected, though version 1.0 is marked
  incompatible with Vision Pro. Critically, **Automatically release after
  approval** is selected. The runbook now hard-gates App Review submission
  until an explicitly confirmed manual-release setting is saved, preserving
  a separate post-review public-release gate. A Vercel Hobby team tab did not
  expose GND and then reached login; no identity was selected. No Apple field,
  form, agreement, key, binary, review, release, Vercel credential, or
  deployment changed.
- September 15 backend rollout packet: the clean committed source checkpoint
  `98fed14defdc35381ef198113dad208f03c41294` is now documented separately
  from the heavily edited shared worktree. The current Vercel production
  artifact/SHA and the full proposed delta are not yet verified; no production
  deployment should be inferred from the source test or attempted from dirty
  workspace contents. The packet names exact auth/router, limiter, redirect,
  rollback, and installed-build acceptance evidence for an action-time
  deployment review. No Vercel/Apple/EAS setting or binary changed.
- September 15 deployment-identity correction: existing Brain evidence from
  September 4–5 already identifies the dashboard target as `GND SERVER /
  gndprodesk` (`prj_BbeTM6D2N5TkqWW9SzaZvdXBPnsr`, root `apps/dashboard`). The
  repository-root `.vercel/project.json` is linked to the separate
  `gnd-storefront` project and must not be used for dashboard deployment. The
  remaining credential gate is current access to the known project so its live
  deployment SHA, aliases, variable presence and rollback target can be
  verified before any separately approved deployment.
- September 15 source-to-handler regression: a focused API route test now
  checks that protected `mobileAccess.myRequests` is registered in the app
  router and exported through the dashboard's internal API handler. This
  closes a local wiring-check gap but does **not** prove that the observed
  production deployment has the procedure; its JSON `NOT_FOUND` remains a
  deployment/installed-build acceptance gate.
- September 15 credential-free deployed-route observation: the selected
  production apex Base redirects to `www.gndprodesk.com`; generic auth
  `/api/auth/get-session` returns 200 there, whereas `oss.gndprodesk.com`
  returns 404. The new `mobileAccess.myRequests` tRPC path returns JSON
  `NOT_FOUND` (404) on the apex/`www` route despite being registered in
  current source. Current deployment therefore does not prove employee-access
  workflow availability; a reviewed backend deployment and installed-build
  auth/API acceptance remain gates before a fresh public IPA. No credential,
  cookie, production configuration, build, Apple/EAS setting, or write request
  was used. The indexed capture of the existing GND Millwork policy page
  mentions apps but also carries broad retail/tracking claims and a Home Depot
  example, so its URL
  remains a legal-owner decision, not an approved release value.
- September 15 live-membership consistency audit: a shared auth-package
  predicate now requires active internal/legacy type plus a live role and
  organization, and is used by legacy sign-in, Better Auth session resolution,
  HRM Super Admin checks, mobile-access request/review and admin notification
  recipients, and Android APK authorization. Session resolution denies a
  mapped account with no live role and deletes its Better Auth token.
  Twenty-five focused auth/API/APK/HRM tests pass (62 expectations). Auth
  typecheck still reports only seven existing
  `packages/errors` NodeNext extension errors; API typecheck now reports one
  unrelated `packages/sales/src/copy-sales.ts` nullable source-number error,
  with no changed-file diagnostic. The dashboard broad typecheck previously
  aborted at its default heap limit. No schema, migration, production data,
  UI, Apple, Expo, or secret state changed. ADR-103 records the boundary.
- September 15 employee-type authorization audit: the mobile-access employee
  predicate now excludes explicitly typed `CUSTOMER` rows even if they carry
  an active role, while preserving `EMPLOYEE`, `MANAGER`, and legacy null-type
  staff under the existing active-role requirement. Admin list/update apply
  that predicate before their Super Admin guard. The Android APK route now
  requires the same type and active-role predicate before Super Admin/request
  status checks. Seventeen focused mobile-access/APK/web-auth tests pass (51
  expectations), and the API package typecheck passes. The broad dashboard
  package typecheck aborted at Node's default approximately 4 GB heap limit
  before diagnostics; it is not a green check or a changed-route error report.
  No schema, migration, production data, UI, or Apple/EAS state changed.
- September 15 iOS store-build safety follow-up: the root EAS account runner
  now requires `--acknowledge-build` before authentication for an iOS
  production build; the direct mobile-package script checks
  `GND_IOS_BUILD_ACK=1` before release preflight or EAS. Thirteen focused
  account/build/upload tests pass (83 expectations), and the readiness
  checker accepts the new guarded build script while failing only the still
  unapproved privacy-policy URL. Android production and preview build scripts
  remain unchanged. No EAS build was queued or Apple setting changed.
- September 15 direct-upload safety follow-up: the reviewed-ID adapter now
  requires `GND_IOS_UPLOAD_ACK=1` for its invocation before spawning EAS;
  the root account runner requires `--acknowledge-upload` after ID validation
  and before account authentication, forwarding only a scoped local guard.
  Eleven focused account-runner/adapter tests pass (78 expectations), including
  a valid-ID/no-ack denial without EAS interaction. The iOS readiness checker
  still fails only on the missing approved privacy-policy URL. Android
  commands and EAS project/update linkage are unchanged; no Apple build,
  binary upload, credential, or portal action occurred. These local guards do
  not substitute for explicit action-time user confirmation.
- September 15 public-login abuse boundary: the custom Better Auth mobile
  and legacy password endpoints now consume an atomic Upstash attempt quota
  before legacy-user lookup on production Vercel. IP/account key subjects are
  HMAC-hashed, over-quota requests return 429/Retry-After, and missing trusted
  proxy/config or Redis failure returns 503 without a memory fallback. Six
  fake-command tests passed (32 expectations); focused Biome passed. The auth
  package typecheck still emits only seven pre-existing `packages/errors`
  NodeNext import-extension errors. Local production-profile variable
  presence is not remote deployment proof; do not deploy/submit until the
  deployed environment and installed-build login are verified. No live Redis,
  credential, Apple portal, EAS build, or upload action occurred.
- September 15 dashboard route source follow-up: the iOS checker now confirms
  that dashboard source exports `/api/trpc` and Better Auth `/api/auth` handlers
  needed by the shared production mobile origin. Nine focused tests pass (66
  expectations); actual production-profile preflight fails only its still
  unapproved policy URL gate (29/30), while a one-off synthetic HTTPS policy
  URL passes 30/30 as configuration proof. The source check does not prove
  deployed route reachability or installed-build login. A read-only `eas
  whoami` retry failed at `api.expo.dev` DNS resolution before identity could
  be observed, not with a login error. No EAS/Apple setting or build changed.
- September 15 production-origin audit: the selected local production profile
  has distinct public HTTPS mobile Base (`gndprodesk.com`) and dashboard-web
  (`oss.gndprodesk.com`) hosts; its separate mobile web URL is local HTTP.
  The custom mobile auth route is hosted by dashboard source, not the
  inspected standalone API app source. This does **not** prove Base-host
  auth failure or a deployment alias; no unauthenticated route probe has
  been approved/performed. The public runbook now gates a new candidate on
  deployed route evidence or an explicitly approved auth origin, in addition
  to the privacy-policy gate. No URL was guessed into code/EAS.
  A subsequent scoped deployment-source audit found no dashboard
  `vercel.json` or `next.config.mjs` rewrite tying the Base host to Better
  Auth, while the standalone API app's own rewrite supplies no inspected
  auth handler. A general dashboard helper also hard-codes a `www` host for
  non-development use, distinct from the two selected local origins. These
  facts strengthen the need for deployed-route verification but do not prove
  which Vercel custom domain currently serves either app.
- September 15 read-only policy recheck: the indexed candidate page still
  includes a cross-brand Home Depot advertising example; the crawler marked
  the capture as from the prior week, so exact current HTML is not yet proven.
  The policy gap report now requires direct published-text verification and
  legal/editorial cleanup before this URL can be approved. Signed-in Apple
  record reinspection was unavailable because the Mac was locked; no portal
  field, credential, EAS variable, build, or upload changed.
- September 15 production-origin and dotenv follow-up: installed release
  routing now selects the embedded Expo variant and a public HTTPS
  `EXPO_PUBLIC_BASE_URL` for both tRPC and Better Auth; the iOS production
  config/preflight reject absent or non-public origins without changing
  Android production. Bun 1.3.0 was observed reloading local dotenv values
  after `env -u`; a Node preflight wrapper strips development login keys and
  starts the checker from a neutral temp-directory cwd. Thirteen focused tests
  passed (100 expectations). Actual `with-env:prod` preflight now passes 28/29
  with only the unapproved privacy-policy URL failing, and a one-off synthetic
  HTTPS policy URL passed 29/29 as wiring proof only. No `.env` file, EAS
  setting, Apple field, build, or upload was changed.
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
- Installed-dependency manifest audit: a symlink-aware scan found
  `PrivacyInfo.xcprivacy` files in the installed Expo, React Native, Async
  Storage, and Lottie packages, with required-reason declarations for file
  timestamps, UserDefaults, disk space, and system boot time. No app-owned
  privacy manifest was found. This proves only local package inventory, not
  final IPA embedding, server/telemetry collection, or Apple acceptance; the
  public runbook now requires exact-artifact manifest review and an aggregate
  Xcode privacy report when a matching archive is available. No reason or App
  Privacy answer was guessed or saved.
- Privacy owner handoff: a concise local decision packet now asks for the
  responsible seller/controller relationship, first-release account model,
  app-specific policy coverage, final telemetry/vendor facts, retention and
  Blob purge semantics, and exact approved HTTPS URL. A current read-only EAS
  account/project recheck failed at `api.expo.dev` DNS resolution, not login;
  normal iOS readiness remains 27/28 with only the policy URL absent. No EAS
  setting, Apple field, new build, or upload changed.
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
  malformed, or `--latest` selections before authentication. Both direct mobile
  package submit commands now use a reviewed-ID-only adapter; missing,
  duplicate, invalid, alternate, or retired build `5`/`6` IDs fail before EAS.
  The 13-test focused runner/readiness/adapter set passes (97 assertions),
  with scoped Biome clean. ADR-100 records the fail-closed boundary.
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
- Shared session permission follow-up: the Better Auth web/mobile resolver
  previously loaded soft-deleted role assignments, referenced roles/offices,
  and role-permission links before selecting the first role. It now filters
  all those rows and deleted permission definitions. The focused auth tests
  pass 18/18; scoped Biome is clean. Auth-package typecheck remains red only
  on existing `packages/errors` NodeNext import-extension diagnostics after
  fixing the new test's matcher typing. No account, role, or external
  permission was changed. Bug memory records the source-level risk; no live
  exploit was observed.
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
