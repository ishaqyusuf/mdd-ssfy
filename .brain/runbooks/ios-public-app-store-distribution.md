# GND Millwork Public iOS App Store Release

## Scope and verified identifiers

This is the current operating procedure after the September 15, 2026 decision
to release `GND Millwork` publicly, with **All Countries or Regions** as the
target. It supersedes the historical TestFlight runbook and ADR-091 for release
distribution. Public App Store acquisition is not public account registration:
the current app signs in with existing GND company accounts and exposes no
public sign-up route. The mobile sign-in endpoint resolves an
existing legacy user with `accessRevokedAt: null`, `deletedAt: null`, and
employee/manager account type; it does not create a public customer account.
If the intended product must let anyone create
an account, stop and implement/review that separate product and security scope
before App Review submission.
Apple's public-distribution and business-login guidance does not require
public self-registration solely because the binary is publicly downloadable;
see the [official-source review report](../reports/2026-09-15-ios-public-login-app-review.md).
App Review still needs an active demo account with full representative access.

- Apple seller/team: ZEROES AND ONE TECH HUB NIG LIMITED / `ZXC78SPCV4`.
- Apple program: Organization, active; Account Holder role verified.
- App Store Connect record: `GND Millwork`, numeric app ID `6811442922`, SKU
  `gnd-prodesk-ios`, bundle `com.gnd.prodesk`. Do not create another record.
- EAS owner/project/update URL: `pcruz321` /
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`. Do not transfer or relink.
- EAS release: `production`, `distribution: "store"`, production update
  channel, remote version source with build auto-increment. Preview remains
  ad-hoc/internal for development only and is never uploaded for public release.
- Verified signing: Distribution certificate `ZDC9NMPYX8`, App Store profile
  `6VT956987X` (UUID `be302ee0-1e9c-4df4-b39d-248ad085c5a4`) stored in EAS;
  both expire September 14, 2027. Do not rotate shared signing material merely
  to troubleshoot release metadata.
- Clean store build `6`: EAS ID `f3985128-844d-432c-bbc3-e0e4c93e37ac`, app
  version `1.0.305`, reviewed source commit `40a62218e`, team/bundle/profile/
  entitlements/export flag independently inspected. It predates the required
  in-app privacy link and is **not** a submission candidate; dirty build `5`
  is not one either. Build a new clean candidate after the policy URL is
  approved/configured and repeat artifact inspection.
- Current local public-release source baseline: commit `56d1d91d7` contains
  the in-app policy-link wiring, guarded iOS submit path, public guidance, and
  permission hardening. It has **no new EAS/Apple binary**. After policy
  approval and EAS production URL configuration, build a fresh candidate from
  this revision or a later separately reviewed clean revision; do not upload
  old build `6`.

### Live App Store Connect inventory, September 15

The Account Holder signed in and the existing GND Millwork record was inspected
read-only. The version is **1.0 Prepare for Submission**. The current page shows:

The [source-backed metadata draft](../reports/2026-09-15-ios-app-store-metadata-draft.md)
provides bounded English (U.S.) description/keywords, review notes, screenshot
plan, URL candidates and owner-decision fields. It is a review packet, not
authorization to save listing data or transmit review credentials.

- Pricing > App Distribution Methods: **Public — Discoverable by anyone** is
  selected as the default. No price schedule or App Availability has been set
  up; do not mistake the organization's 175 agreement countries/regions for
  this app's availability.
- Free Apps Agreement: **Active** for All Countries or Regions through
  September 12, 2027. Paid Apps Agreement: **New/unsigned**; do not sign it
  merely for the planned free release.
- EU Digital Services Act trader compliance: **incomplete**, with a live
  Business banner requesting completion.
- App Information: name, bundle, SKU, Apple ID, and English (U.S.) are present;
  subtitle, primary category, age-rating answers, and Content Rights setup are
  missing.
- App Privacy: no Privacy Policy URL; data-practices questionnaire has not
  begun and Publish is disabled.
- iOS 1.0 listing: zero iPhone screenshots, no attached build, blank
  description/keywords/support URL/copyright, and blank Review Information
  account/contact/notes. `Sign-in required` is checked. An iPad screenshot tab
  is available and must be covered for the configured tablet-support build.
- Screenshot slots inspected: iPhone **6.5-inch** panel accepts
  `1242 × 2688` or `1284 × 2778` portrait pixels (landscape equivalents),
  and the iPad **13-inch** panel accepts `2064 × 2752` or `2048 × 2732`
  portrait pixels (landscape equivalents). Both panels show zero screenshots;
  use authentic release UI without customer/employee data.
- App Accessibility shows **Get Started**, and App Review lists no submitted
  items. Do not claim VoiceOver, larger-text, contrast, or other support
  without exact-candidate QA evidence. Use the
  [accessibility readiness matrix](../reports/2026-09-15-ios-app-accessibility-readiness.md);
  scattered accessibility props and dark-theme plumbing do not prove an
  app-wide nutrition-label claim. This optional listing is separate from the
  app's actual accessibility and App Review usability obligations.
- Version release currently selects **Automatically release after approval**.
  This would publish without a later action-time release confirmation. **GATE:**
  do not submit the version for App Review while this remains selected. With
  separate confirmation, change/save it to **Manually release this version**
  before submission, then confirm public release separately after approval.
- Pricing also shows Apple silicon Mac and Apple Vision Pro availability
  checked by default; Apple Vision Pro shows version 1.0 as incompatible. The
  Apple School Manager reduced-price checkbox is also selected. Review these
  extra surfaces/volume option and validate or explicitly opt out at a saved
  account-action gate before global publication; do not assume an
  iPhone/iPad-only launch from the iOS bundle alone.

Every portal save, key/credential action, build queue, Apple binary upload,
agreement/legal form, App Review submission, or final public release marked
**GATE** requires explicit action-time confirmation. Prior approval to pursue
public release is the product-direction decision, not blanket authorization for
these separate account actions. Never paste Apple passwords, OTPs, private-key
material, issuer/key IDs, or API credentials into GND, Brain, or chat.

## 1. Local candidate preflight

1. Run `bun run ios:release:check` and focused release/security tests. Verify
   the public config still resolves `com.gnd.prodesk`, Team `ZXC78SPCV4`, App
   Store app `6811442922`, `pcruz321`, the EAS project/update URL, production
   channel, and `distribution: "store"`.
   Then run the package's production `ios:release:preflight`: it forces the
   production variant, checks a public HTTPS API/auth origin, and reports only
   whether Sentry/Logly are enabled and configured for HTTPS. Do not copy
   DSNs or collector URLs into review notes. The preflight launches Bun from
   a neutral directory through a Node wrapper because local Bun 1.3.0
   reloads `.env*` credentials after `env -u`; no dotenv file is changed.
   Confirm those booleans again against the exact EAS production build
   environment/artifact before answering App Privacy; a local pass is not
   proof of remote vendor/data handling.
   The [read-only EAS production inventory](../reports/2026-09-15-ios-eas-production-env-inventory.md)
   confirms the policy URL is absent at both project and account scope;
   telemetry variable names exist at project scope but do not prove enablement.
   **GATE:** after legal approval of the exact policy URL, ask the owner for
   action-time confirmation before setting it in the EAS project production
   environment. Do not pull credentials into `.env` files.
   The privacy audit also proves that mobile employee-document deletion
   tombstones database records but does not itself call Blob `del`; legal/data
   operations must approve the retention/purge explanation before the policy
   or App Privacy answers claim physical deletion.
   Expo's iOS production-profile `ios.env` flag activates the same telemetry
   config guard on the EAS builder; do not use the job-only
   `EAS_BUILD_PLATFORM` variable as proof that the local app-config evaluation
   was guarded. Android production does not carry the iOS flag.
   Installed preview/production builds resolve the embedded variant and use
   `EXPO_PUBLIC_BASE_URL` for both `/api/trpc` and `/api/auth`. Verify those
   routes on the approved production origin and complete a real installed
   release-build login with a least-privilege review account before App Review;
   the origin and dashboard-route source checks prove neither backend
   reachability nor login.
   The public login path also requires the deployed dashboard's existing
   Upstash REST variables and trusted Vercel client-IP headers. Confirm their
   **presence only** and exercise a least-privilege installed-build sign-in,
   an over-quota 429, and Redis-unavailable 503 before App Review. The
   locally selected production profile has Upstash variables, but that does
   not prove the deployed environment; do not print secret values or call
   live Redis during local preparation. See the
   [auth abuse contract](../api/mobile-auth-abuse-protection.md).
   The [production-origin consistency audit](../reports/2026-09-15-ios-production-origin-consistency.md)
   found distinct local public HTTPS Base and dashboard-web origins. **GATE:**
   do not queue a new public binary until the actual Base host's auth/tRPC
   routing or an explicitly configured, approved separate auth origin is
   proven. Never embed the current local-HTTP mobile web URL or derive a host
   name by assumption.
   A September 15 [credential-free route observation](../reports/2026-09-15-ios-production-origin-consistency.md)
   found that the configured apex Base redirects to `www.gndprodesk.com`,
   where generic `/api/auth/get-session` answers 200, but the newly registered
   `mobileAccess.myRequests` tRPC procedure answers JSON `NOT_FOUND` (404).
   Treat the current deployed workflow as absent. A generic auth 200 and a
   bare tRPC 404 do not prove custom mobile sign-in, redirect safety, or
   installed-build login. Deploy/revalidate the reviewed backend at the
   approved origin before queueing the fresh privacy-complete public build;
   changing production aliases or deploying remains a separate action gate.
   Use the [backend rollout review packet](../reports/2026-09-15-ios-backend-rollout-review.md)
   before that gate: identify the currently deployed Vercel artifact/SHA and
   review the **full** proposed delta from an immutable Git ref. The shared
   worktree contains unrelated edits, so a direct dirty-worktree production
   deploy is not a reviewed mobile-only rollout. Preserve a verified rollback
   target and obtain confirmation for the exact deployment source/alias.
2. Run the SDK dependency check and Expo Doctor after any dependency change.
   The last known Doctor result was 17/18 due to Bun isolated-peer duplicates;
   `autolinkingModuleResolution` was enabled and verified. Any new failure is a
   blocker.
3. Export the production iOS Metro bundle locally with release credentials
   removed; any unresolved native/server-only dependency is a blocker. Do not
   queue a new build merely to test a local config label.
4. Check runtime endpoints, login/session denial for revoked/deleted staff,
   accounts without a live role, deleted-organization assignments, and explicit
   customer rows, plus crash reporting and update channel. A mapped Better
   Auth user with no live organization role must lose its session on the next
   protected resolution. Public distribution does **not** grant
   access to protected GND services. The current release is company-login-only
   unless the owner separately approves a public sign-up implementation.
5. Confirm the exact reviewed EAS build ID and fingerprint. The public upload
   alias and older `eas:submit:ios` alias both require `--id`; their runner
   rejects absent/malformed IDs and `--latest` before account authentication.
   Both root aliases also require `--acknowledge-upload`, while direct
   app-package submit scripts require `GND_IOS_UPLOAD_ACK=1` for that invocation.
   The direct scripts likewise no longer auto-select the latest binary.
   Do not infer approval to upload from selecting an ID or acknowledgment.

## 2. App Store Connect listing and legal readiness

Inspect the existing app record read-only first. Prepare field values and
screenshots locally; do not save them without confirmation.
The [local listing preparation packet](../reports/2026-09-15-ios-public-listing-packet.md)
records source-backed provisional copy, portal field gaps, screenshot candidates,
and the unresolved company-login versus public-registration choice. It is not
approved metadata and must not be pasted into App Store Connect unchanged.
The [privacy-owner decision packet](../reports/2026-09-15-ios-privacy-owner-decision-packet.md)
collects the exact entity, data-practice, retention, and account-model choices
needed before the production policy URL or App Privacy fields are saved.

1. **GATE distribution method:** In Apps > GND Millwork > Pricing and
   Availability > App Distribution Methods, verify/save **Public**, not Private
   Custom App. Public-vs-private is a per-app choice and cannot be switched
   after approval without a new record and binary. Do not select Unlisted;
   it is link-discoverable rather than global/public storefront discovery.
2. **GATE price and regions:** Keep the first app free unless the owner directs
   otherwise; the Free Apps Agreement is active. Add the free price schedule
   and set App Availability to
   **All Countries or Regions**, including future new storefronts, only after
   regional obligations are complete. Apple storefront coverage is global where
   the App Store is supported, not a promise of availability in every country.
   Review the default-on Apple silicon Mac and Vision Pro compatibility toggles
   as part of this gate; validate them or opt out for the first release.
3. **GATE legal:** Re-check EU Digital Services Act trader status; the last live
   audit found it incomplete. All Countries or Regions includes EU storefronts,
   so the Account Holder/legal owner must complete accurate trader information
   before global publication. Re-check any country-specific age/content,
   encryption, business, or tax obligations shown in App Store Connect. Do not
   answer legal questions by inference from the code.
4. **GATE listing:** Provide final app name/subtitle, description, keywords,
   primary category, Content Rights, support URL, marketing URL if used,
   copyright, age-rating answers,
   screenshots for every required active device class (the Expo app currently
   supports iPad), and any required accessibility declaration. Use real product
   behavior: a public download currently requires an existing GND account for
   business features. Remove placeholders and unsupported claims. Confirm
   screenshots are from the actual release UI and do not expose customer or
   employee data.
5. **GATE privacy:** Provide a live public privacy-policy URL and accurately
   answer App Privacy questions for GND and embedded SDKs/services, including
   authentication, employee/customer/business data, photos/documents, Sentry,
   and Expo Updates as applicable. The repository audit does not establish a
   publishable privacy policy or complete Apple data-type declarations; a
   privacy/legal owner must review them. Do not answer “no data collected” or
   select tracking/data categories without verified evidence.
   A live [GND Millwork privacy page](https://gndmillwork.com/privacy-policy/)
   is a candidate: it expressly mentions mobile apps, and the repository's
   storefront configuration points to `gndmillwork.com`. It is not yet an
   approved App Store policy for this binary. Have the business/legal owner
   confirm that its entity/affiliate wording covers the Apple seller ZEROES
   AND ONE TECH HUB NIG LIMITED, and that its broad retail advertising,
   tracking, payment, and data-sharing statements accurately describe the
   mobile app. The storefront signup currently links to `/privacy-policy`,
   but no corresponding route exists in the repository; do not use that
   unverified route as the App Store URL. The live
   [contact page](https://gndmillwork.com/contact-us/) is likewise a candidate
   support URL only after owner/support-channel review.
   Both mobile sign-in designs and the production signed-in Settings footer now
   include an accessible in-app Privacy Policy link, but it appears only when
   `EXPO_PUBLIC_PRIVACY_POLICY_URL` is configured
   to a public HTTPS URL. `bun run ios:release:check` fails closed while that
   value is absent. After legal approval, set the same approved URL in the EAS
   **production** environment and verify the effective build configuration;
   a local one-off value is only a wiring test, not evidence that a remote EAS
   build embeds it. Keep the URL out of `.env*` edits in this task. Build `6`
   predates this link and is release-path proof, not the final submission IPA.
   `eas-build:ios:prod` and `eas-build-submit:ios:prod` now run
   `ios:release:preflight` under the production environment before queueing a
   build. With the URL absent, that preflight fails before EAS is invoked.
   Use the [source-backed public App Privacy audit](../reports/2026-09-15-ios-public-app-privacy-readiness.md)
   to collect release-specific deployment and vendor facts before completing
   Apple's questionnaire; source-only inference cannot settle the answers.
   The [live candidate-policy comparison](../reports/2026-09-15-ios-live-policy-gap-review.md)
   found broad mobile-app/analytics/photo language but no verified Apple
   seller/controller relationship, employee operational data coverage,
   retention schedule, or document-deletion/purge explanation. Do not treat
   the current retail policy as legally approved for this binary based solely
   on its URL or generic language.
6. **GATE review access:** Apple requires an active demo account or approved
   fully featured demo mode for account-based features. Arrange a least-
   privilege, non-production-data review account and clear Review Notes that
   cover app role navigation, login, any required setup, and how to reach
   representative features. Create/transmit credentials only through the
   approved App Store Connect Review Information field after confirmation.
   Never put review credentials in the repository or task transcript.
7. Confirm export compliance from the current source: `ITSAppUsesNonExemptEncryption
   = false` was supported by HTTPS, platform cryptography, SecureStore/Keychain,
   and no app-owned custom encryption imports. Re-audit if code/native SDKs
   change. Do not guess when Apple asks an additional encryption question.

## 3. Store build and Apple upload

1. Authenticate EAS as authorized `pcruz321` via the existing account runner
   only after the credential gate, and read-only verify `eas project:info`.
2. If a new clean binary is required: **GATE build**
   `bun run eas:appstore:build:ios --acknowledge-build`, only after separate
   action-time build confirmation. The root runner blocks an iOS production
   build before EAS authentication without this flag; the direct
   `apps/mobile` package path requires
   `GND_IOS_BUILD_ACK=1 bun run eas-build:ios:prod` for that invocation.
   Never persist the acknowledgment in `.env*` or a shell profile. Inspect
   bundle/team/version/build/profile,
   production entitlements, release endpoint, and export declaration. The
   combined alias `bun run eas:appstore:build-upload:ios` both queues and uploads;
   it requires `--acknowledge-build --acknowledge-auto-upload` before EAS
   authentication, and the direct package script has a second guard. Those
   acknowledgments are not substitutes for explicit action-time permission.
   Do not use automatic upload for this first release: build, inspect the
   privacy-complete IPA, and upload by its reviewed UUID at a separate gate.
   The root submit/combined routes fail before login if an Android platform
   is requested; use the separate Android build/update workflows for Android.
3. **Do not upload old build `6`** (`f3985128-844d-432c-bbc3-e0e4c93e37ac`):
   it predates the in-app Privacy Policy link. After the approved URL is
   configured locally and in the EAS production environment, obtain separate
   build confirmation, run the guarded store build, and inspect the resulting
   IPA/embedded Expo configuration before selecting an upload ID.
   Inspect that IPA for bundled `PrivacyInfo.xcprivacy` resources from the app
   and native dependencies. If a matching Xcode archive is available, use
   Organizer > Generate Privacy Report and reconcile the aggregate report
   with the code-flow audit and exact production telemetry settings before
   finalizing App Privacy. Installed-package manifests alone do not prove the
   final IPA contents or the app's data practices; see the
   [bounded manifest inventory](../reports/2026-09-15-ios-public-app-privacy-readiness.md).
   Expo warns that static CocoaPods manifests may not all be parsed by Apple;
   add an app-level required reason only when exact API use and an allowed
   reason are evidenced, or address Apple's specific validation feedback.
   **GATE API-key/credential if EAS asks:** EAS previously reached **Generate a
   new App Store Connect API Key?** and was cancelled before key creation or
   upload. API permission/key creation and server-side storage require their
   own action-time confirmation. If manual Transporter/Xcode upload is chosen
   instead, inspect the exact IPA and obtain separate upload confirmation; do
   not downgrade signing or relink the project.
4. **GATE Apple binary upload:**
   `bun run eas:appstore:upload:ios --id REVIEWED_BUILD_UUID --acknowledge-upload`
   (replace the placeholder with the inspected new EAS build ID, and add the
   acknowledgment only after explicit action-time upload confirmation).
   Both root and direct mobile-package upload aliases require exactly one
   reviewed UUID; the direct package command is
   `GND_IOS_UPLOAD_ACK=1 bun run eas-submit:ios:by-id --id REVIEWED_BUILD_UUID`
   from `apps/mobile`, again only for the confirmed invocation. Never persist
   either acknowledgment in `.env*` or a shell profile.
   They reject missing/alternate selectors and the retired build `5`/`6`
   IDs, and block a valid ID without acknowledgment, before invoking EAS.
   These guards protect against accidental upload but do not replace
   action-time upload confirmation.
   This EAS operation uploads the selected IPA to App Store Connect. It does
   **not** send the app to App Review or make it publicly available. Record the
   EAS job, Apple build number, processing result, and exact uploaded build ID.
5. Wait for processing. Resolve Invalid Binary, native entitlement, version,
   icon, privacy-manifest, or export-compliance errors before continuing. Any
   corrected binary needs its own reviewed build/upload gate.

## 4. App Review and release

1. Verify all required metadata, URLs, review account/demo, age rating, App
   Privacy, distribution method, price, regions, agreements, and regional legal
   declarations. Select only the exact processed **new privacy-complete** build
   for version `1.0.305` (or a newly reviewed version); do not select builds
   `5` or `6`.
2. Choose a controlled manual release option so approval does not
   automatically publish worldwide before the owner checks review outcome,
   backend availability, and support readiness. **GATE:** save the release
   option and add the version for review only after confirmation.
3. **GATE App Review submission:** use App Store Connect's separate **Submit for
   Review** action. `eas submit` is only binary upload. Capture Apple's
   submission ID/status, answer reviewer questions through the authorized
   account, and never transmit secrets through Brain or chat.
4. On approval, verify pricing/availability still says Public + All Countries
   or Regions, agreements/legal fields are complete, API/backend and privacy/
   support pages are live, and screenshots/listing are accurate. **GATE public
   release:** Account Holder releases the approved version. Verify public
   product-page availability across sampled storefronts and company-login
   denial for unauthorized users; rollout may not appear in every storefront
   immediately.

## 5. Rollback and troubleshooting

- Metadata/privacy/legal gap: hold App Review submission; complete the exact
  missing field with the responsible owner. Do not invent a declaration.
- `iTunes service key is empty`: this prior EAS/Apple password-auth defect is
  not proof the Apple ID is wrong. Signing is already stored in EAS. Use the
  separately approved ASC API-key path or an authorized manual uploader;
  avoid repeated password/OTP retries.
- Wrong EAS project, team, app record, or build ID: stop before upload. Do not
  transfer the project or create a duplicate app to bypass the mismatch.
- Processing/review rejection: retain Apple's exact finding, fix source or
  metadata, validate, and submit a new clean binary/version after confirmation.
- Harmful OTA: republish a known-good update on the matching production
  channel/runtime after authorization. Native changes require a new binary.
- Harmful public binary: pause further release; use Apple's approved version/
  availability controls only after explicit confirmation. Removing an app from
  sale does not erase copies already installed; backend authorization and
  incident response remain necessary.

## Primary Apple references

- [Distribution methods](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/set-distribution-methods)
- [All countries or regions](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store)
- [App privacy and policy URL](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [App Review completeness and demo account](https://developer.apple.com/app-store/review/guidelines/)
- [Submit an app for review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)
