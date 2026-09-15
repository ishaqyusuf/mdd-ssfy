# GND Millwork iOS distribution-controls readiness

Date: 2026-09-15
Status: read-only live-state inventory and proposed action set; no App Store
Connect value was changed or saved.

## Product decision already in force

The product owner replaced the earlier employee-only TestFlight distribution
decision with a publicly discoverable App Store release for all countries or
regions. Downloading the binary does not create a GND account; company data
remains protected by existing company-issued authentication, live membership,
role, and permission checks.

Apple documents that Public and Private/Custom are distinct distribution
methods and that changing between them after approval requires a new app
record. See [Set distribution methods](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/set-distribution-methods).

## Live state and proposed values

The Account Holder inspected GND Millwork (`6811442922`) on September 15,
2026. Setup dialogs were opened only to read their choices and then cancelled.

| Control | Live state | Proposed first-release value | Why |
| --- | --- | --- | --- |
| Price schedule | Not configured; **Add Pricing** opens with United States (USD) as the base and no price selected. | **Free / USD 0** with United States as base; no scheduled change. | The owner selected a free public release. Apple permits free apps without accepting the Paid Apps Agreement; a price must still be configured before review. |
| App availability | Not configured; setup offers All Countries or Regions, Specific Countries or Regions, or Pre-Order. The dialog describes All as 175 countries/regions and currently defaults to it. | **All Countries or Regions**, no pre-order; include new storefronts automatically if the confirmation flow offers that choice and the owner reconfirms it. | This is the explicit global product decision. DSA trader status is already Active for the EU subset, but other regional legal requirements still apply. |
| Tax category | **App Store software**. | Keep unchanged. | No source evidence supports a specialized tax category, and the app is free. Legal/tax owner may override. |
| Distribution method | **Public — Discoverable by anyone on the App Store** selected. | Keep **Public**. | This implements the revised product direction. Do not select Private/Custom. The distribution method becomes effectively irreversible after approval. |
| Apple School Manager discount | Checked. | **Uncheck** for version 1.0. | Public apps remain available for volume purchase; Apple's checkbox is a 50% education discount for paid volume purchases. It adds no useful behavior to a free app and creates unnecessary listing ambiguity. |
| Apple silicon Mac | Checked, automatic minimum macOS 11.0. | **Uncheck** for version 1.0. | The Expo app is configured for iPhone/iPad, portrait use, and mobile photo/document/dispatch workflows. No Mac installation, input, layout, authentication, upload, update, or privacy QA exists. Opt in only after a dedicated candidate passes that matrix. |
| Apple Vision Pro | Checked; Apple reports version 1.0 is not compatible and not available there. | **Uncheck** for version 1.0. | There is no Vision Pro QA or product requirement. Apple makes compatible iPhone/iPad apps available by default unless the developer opts out. Explicit opt-out avoids future accidental availability when compatibility changes. |
| iPhone/iPad | `ios.supportsTablet: true`; Apple requires separate iPhone and iPad screenshot panels. | Keep both, but do not submit until authentic release-candidate QA and screenshots pass on both device classes. | iPad support is an explicit binary configuration, not merely a portal toggle. |
| Game Center | Unchecked. | Keep unchecked. | No Game Center entitlement or experience is in scope. |
| Routing App Coverage File | Blank. | Leave blank. | GND is not an Apple routing app. |
| Release control | **Automatically release this version** selected. | **Manually release this version**. | Automatic release would bypass the required post-approval smoke, rollback, and action-time release confirmation. |
| Scheduled release | Unselected. | Leave unselected. | No launch time has been approved. Manual release provides the intended control. |

Apple's current guidance confirms that availability must be configured before
review and that an Apple Account's storefront controls where it can acquire an
app. See [Manage availability](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store).
Apple also documents the default availability of compatible iOS/iPadOS apps on
[Apple silicon Macs](https://developer.apple.com/documentation/apple-silicon/running-your-ios-apps-in-macos)
and [Apple Vision Pro](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-of-iphone-and-ipad-apps-on-apple-vision-pro).

## Exact gated portal action set

After product/legal approval and immediately before making changes, obtain one
action-time confirmation for this exact batch:

1. add the free price schedule (USD 0, no scheduled change);
2. set App Availability to All Countries or Regions, not pre-order;
3. keep Tax Category as App Store software;
4. keep Public — Discoverable by anyone;
5. uncheck the Apple School Manager reduced-price option;
6. uncheck Apple silicon Mac and Apple Vision Pro availability;
7. save Pricing and Availability, then reload and verify every value;
8. on iOS version 1.0, select **Manually release this version**;
9. save only after the approved listing fields are complete; and
10. reload and verify Manual remains selected before App Review submission.

Do not combine this confirmation with privacy publication, review credentials,
binary upload, App Review submission, agreement acceptance, or final public
release. Each remains its own action-time gate.

## Rollback and revalidation

- Before approval, pricing, countries, and compatible-device availability can
  be revisited through the same page. Record the before/after state without
  copying private account data.
- Public versus Private distribution is the durable decision: do not change it
  casually because Apple says switching after approval requires a new app
  record and binary submission.
- After any new build, recheck iPhone/iPad compatibility, Mac/Vision defaults,
  screenshots, privacy metadata, age rating, price, countries, DSA state, and
  Manual release before adding the version for review.

Nothing in this packet authorizes an Apple Save, agreement, price confirmation,
build upload, review submission, or release.
