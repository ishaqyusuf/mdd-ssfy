# GND Millwork public iOS privacy-owner decision packet

Date: 2026-09-15
Status: prepared for product/legal/data-operations review; no policy, Apple,
EAS, or credential change has been approved by this document.

## Why an owner decision is needed

The existing GND Millwork iOS record is signed in and reachable, but its App
Privacy questionnaire and Privacy Policy URL are blank. The production EAS
project has no `EXPO_PUBLIC_PRIVACY_POLICY_URL`, so the guarded iOS build
preflight fails. Signed build `6` predates the in-app policy link and must not
be uploaded. The [first-party candidate page](https://gndmillwork.com/privacy-policy/)
mentions mobile apps and retail analytics/photos but does not explicitly name
the Apple seller, employee operations, retention, or deletion/purge handling;
see the [live-page gap review](2026-09-15-ios-live-policy-gap-review.md).

## Decisions to record before any production URL or Apple privacy save

1. **Responsible entities.** Identify the exact legal entity or entities that
   operate GND Millwork ProDesk, control/process employee and dispatch data,
   and stand behind the policy. State how Apple seller **ZEROES AND ONE TECH
   HUB NIG LIMITED** relates to the Miami-branded GND Millwork service. Do
   not infer an affiliate relationship from a brand or Apple team name.
   The [entity evidence matrix](2026-09-15-ios-controller-identity-evidence.md)
   shows the source-backed identities, inconsistent legacy legal copy, and the
   three relationship structures that require owner evidence.
2. **First-release account model.** Confirm whether the publicly downloadable
   binary remains company-issued-login-only, which is the implemented path,
   or whether public self-registration must be built and reviewed before
   submission. No functioning public sign-up route exists today; the
   [business-login App Review report](2026-09-15-ios-public-login-app-review.md)
   explains why public download alone does not force public registration.
3. **Policy scope and contact.** Approve a live HTTPS URL whose text expressly
   covers this app's authentication, profile/access roles, jobs/dispatch,
   employee documents, delivery proof/photos/signatures, vendors, and a
   privacy-rights contact/process. Confirm the in-app link and Apple listing
   should use that same URL.
4. **Telemetry and third parties.** Confirm from the *final EAS production
   environment and artifact* whether Logly and Sentry run, which entities
   process their events/diagnostics, what they receive, retention/deletion,
   and any cross-company advertising/measurement or data-broker use. Source
   establishes conditional telemetry only; variable name presence is not an
   enabled/disabled answer. Include Vercel Blob and any relevant backend
   subprocessors for uploaded material; see the [source audit](2026-09-15-ios-public-app-privacy-readiness.md)
   and [value-suppressed EAS inventory](2026-09-15-ios-eas-production-env-inventory.md).
   The [provider/data-flow matrix](2026-09-15-ios-release-provider-data-flow-matrix.md)
   separates source-proven flows from the contract, region, retention and
   linkage evidence still required for every release provider.
5. **Retention and deletion.** Set the legally/operationally correct schedules
   for employee documents, dispatch proofs, session/profile data, and
   diagnostics. The inspected `user.deleteDocument` operation tombstones
   database rows but does not immediately delete Vercel Blob bytes; the
   policy and Apple answers must not promise immediate physical erasure
   without a separately verified purge process. The
   [retention and purge evidence matrix](2026-09-15-ios-retention-and-purge-evidence.md)
   records the exact source-enforced session/counter/analytics-queue lifetimes,
   durable audit records, storage gaps, and owner-selectable policy decisions.
6. **Apple answers.** Have the accountable owner reconcile exact data types,
   collection purposes, linkage, and tracking against the final build and
   third-party practices. Do not answer “no data collected” or infer tracking
   solely from the retail page's advertising language. Verify embedded
   privacy manifests and any aggregate Xcode report from a matching archive.
   Use the [questionnaire mapping](2026-09-15-ios-app-privacy-questionnaire-mapping.md)
   as the field-by-field worksheet: it supports a provisional **Yes** to data
   collection and core account/upload categories while keeping telemetry,
   linkage, tracking and ambiguous content categories gated.

## Evidence required to clear the local build gate

- A published, reachable owner-approved HTTPS policy URL and approved text
  covering the decisions above.
- An explicit owner instruction to set that exact URL in the existing
  `pcruz321` EAS project's **production** environment. This is a separate
  external account mutation requiring action-time confirmation; do not edit
  `.env*` files or relink the EAS project.
- A clean `ios:release:preflight` under the effective production environment,
  followed by separate confirmation to queue a new store-distribution build.
  Inspect that exact IPA before any separately confirmed Apple upload.

## Other separate App Store Connect gates

The [public release runbook](../runbooks/ios-public-app-store-distribution.md)
still requires owner-confirmed public distribution/availability, a free price
schedule, EU trader status, accurate listing/screenshots/age rating, an active
least-privilege review account via the approved secret channel, App Privacy
publication, App Review submission, and final public release. This packet
supplies questions, not authorization to save any of those fields.

The [source-backed app-specific policy draft](2026-09-15-ios-app-specific-privacy-policy-draft.md)
turns the known mobile flows into proposed public wording and isolates every
remaining legal, vendor, retention, deletion and regional fact as an explicit
placeholder. It must not be published until all placeholders are resolved and
the final text is approved.

## Current recheck limitation

The local release-readiness source check remains 27/28, with only the missing
policy URL failing. A fresh read-only EAS `whoami`/`project:info` attempt on
September 15 could not resolve `api.expo.dev` in this execution environment;
that DNS failure does not establish a changed account or project. Re-run
those read-only checks when connectivity is available before the next EAS
mutation or build.
