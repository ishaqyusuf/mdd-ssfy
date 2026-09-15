# ADR: Public iOS App Store Distribution With Server-Side Account Access

## Status

Accepted

## Context

ADR-091 targeted an employee-only first TestFlight release. On September 15,
2026, the product owner changed the release target to a public GND Millwork app
with worldwide App Store availability and no internal TestFlight distribution.
The existing EAS production profile already produces a store-signed IPA;
preview remains an internal/ad-hoc development profile. Current GND mobile
authentication accepts existing company accounts and has no functional public
registration flow.

## Decision

- Publish the existing `GND Millwork` / `com.gnd.prodesk` app record publicly on
  the App Store, using **All Countries or Regions** when the required regional
  compliance and metadata are complete. Do not target Apple Business Custom
  App distribution or TestFlight tester groups for this release.
- Retain owner `pcruz321`, EAS project/update ID
  `8ea2eecb-4109-453c-827f-9b2de2e3a9aa`, Apple team `ZXC78SPCV4`,
  `production` channel, and explicit `distribution: "store"`. Do not relink
  Expo/EAS merely because the seller's legal organization differs.
- Keep the existing development/preview profiles and Android commands for
  compatibility, but never treat an internal/ad-hoc build as the public iOS
  release artifact.
- Public binary availability does not grant access to GND data. Until a
  separately approved public account/onboarding product is implemented, use
  the existing active-company-account authentication boundary. HRM access
  requests concern account eligibility/guidance, not permission to download a
  public App Store binary.
- Rename the user-facing release route and checks to public App Store terms.
  EAS `submit` means **binary upload to App Store Connect**, not App Review
  submission. All root iOS submit paths require a reviewed build ID instead of
  `--latest`; absent/malformed IDs are rejected before account authentication.
  Metadata, worldwide availability, review submission, API-key
  creation, and credential/payment/legal forms remain separately gated external
  actions.
- Require a legally approved, publicly reachable HTTPS privacy-policy URL in
  the EAS production build environment and expose it through an accessible
  in-app link on sign-in and signed-in Settings. A store-signed IPA without that
  link is build-path
  evidence, not a public-submission artifact; source/config checks cannot
  replace review of the actual policy and Apple data declarations.

## Alternatives

- Private Custom App/Apple Business distribution: rejected for this app because
  the owner now wants public, global acquisition. The earlier proposed HRM/MDM
  distribution plan is cancelled; server-side employee offboarding may still be
  developed separately.
- Internal or External TestFlight as the destination: rejected for this first
  public release. TestFlight remains possible for future beta testing but is not
  part of the current release path.
- Public registration inferred from public distribution: rejected. Existing
  mobile sign-up is a placeholder; opening account creation would require a
  separate identity, permissions, abuse, privacy, and tenant-boundary design.
- Transfer/relink EAS or use ad-hoc preview IPA: rejected because the current
  production signing and project linkage are already verified.

## Consequences

Anyone in an available storefront may obtain the binary once Apple approves and
releases it. Only authorized accounts may use protected GND services under the
current implementation. Global availability adds App Store privacy disclosures,
support/privacy URLs, screenshots, age rating, review credentials or demo mode,
EU trader-status review, and any region-specific compliance obligations. The
product owner must decide whether the initial public app is login-only for
company accounts or whether a later version will serve self-registering public
users; this ADR does not silently change authentication.

## Implementation Notes

The public release aliases live in root `package.json`; the production EAS
profile remains in `apps/mobile/eas.json`. Local checks live in
`apps/mobile/scripts/ios-release-readiness.ts`; the operating procedure is
`.brain/runbooks/ios-public-app-store-distribution.md`. The dashboard's mobile
support copy and manual guidance adapter no longer promise TestFlight invites.
The policy link is wired by `apps/mobile/src/components/privacy-policy-link.tsx`
and is absent until `EXPO_PUBLIC_PRIVACY_POLICY_URL` is supplied; readiness
reports that as an explicit owner-controlled gate.
The iOS store build and combined build/upload commands invoke the production
preflight before queueing an EAS job; Android and preview commands remain as-is.
The legacy root iOS submit alias and the public upload alias now share the same
build-ID guard. Direct mobile package submit scripts no longer auto-select the
latest binary.
ADR-091 and its TestFlight runbook remain historical records but are superseded
for current iOS release operations.
