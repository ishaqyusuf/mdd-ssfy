# GND Millwork iOS public listing preparation packet

Date: 2026-09-15
Status: local draft only; no App Store Connect field was changed or saved.

## Release identity and product fork

Use the existing `GND Millwork` iOS 1.0 record (Apple ID `6811442922`,
`com.gnd.prodesk`). The owner wants a free, publicly discoverable release in
All Countries or Regions. The current binary allows sign-in only for existing
active GND employee/manager accounts. The mobile sign-up route renders only
`SignUp`; it is not a public onboarding flow. `TODO:` obtain the owner's
explicit choice between public download with company-only login and a separate
public self-registration product before finalizing copy or Review Information.

## Source-backed draft copy for the current company-login-only behavior

This is proposed wording for owner/editor review, **not** a final portal value:

> GND Millwork ProDesk gives authorized team members a mobile workspace for
> jobs, dispatch work, documents, and field updates. Sign in with an existing
> GND account to use the tools available to your role. Downloading the app does
> not create an account or grant access to company data.

The sign-in screen names jobs, dispatch work, and field updates; protected
routes include jobs, dispatch, HRM, documents, notifications, and settings.
Role-specific screens must not be described as available to every account.
If public registration is approved, replace this draft only after that flow and
its security/privacy review exist. `TODO:` owner-approved subtitle, keywords,
primary category, copyright, and any localized text. Do not claim a public
consumer account, payments, accessibility support, or device compatibility not
verified for the release binary.

## Existing portal field inventory and preparation

| Field | September 15 read-only status | Local next step |
| --- | --- | --- |
| App name, bundle, SKU, Apple ID | Present | Preserve the existing record. |
| Description, keywords, subtitle | Blank | Review the bounded draft and owner-supply the short fields. |
| Primary category, age rating, Content Rights | Not set up | Product/legal owner answers from the release behavior; no guessed selections. |
| Privacy Policy URL and App Privacy | Blank/not started | Legal owner approves the live policy and data-practice answers from the privacy audit. |
| Support URL | Blank | Owner validates the live support channel and response ownership. |
| Free price schedule, All Countries or Regions | Not set up | Account Holder reviews regional compliance and confirms each save. |
| EU trader status | Incomplete | Account Holder/legal owner completes accurate DSA information. |
| Review Information | Sign-in required checked; fields blank | Provision a least-privilege reviewed demo account through the approved credential channel, then confirm portal entry. |
| Release option | Automatic after approval selected | Owner decides whether to save manual release for a controlled first launch. |
| Apple silicon Mac and Vision Pro | Availability selected by default | Validate on those devices or owner-confirm opt-out before worldwide publication. |

## Screenshot capture matrix

The live listing has zero iPhone 6.5-inch and iPad 13-inch screenshots. The
iPhone slot accepts `1242 × 2688` or `1284 × 2778` portrait pixels; the iPad
slot accepts `2064 × 2752` or `2048 × 2732` portrait pixels. Use real output
from the **new privacy-complete release candidate**, not a mock or old build
`6`. `TODO:` obtain safe test accounts and non-sensitive demo data for the
following role-specific shot candidates:

1. Signed-out sign-in screen with the approved in-app Privacy Policy link.
2. A representative job workspace for an account with job permission.
3. A dispatch/driver workspace for an account with that permission.
4. Documents or Settings for a permitted account, including the policy link
   in Settings if it is visible in the final release configuration.

Capture both required device classes after checking the actual orientation,
safe areas, text legibility, and role navigation. Remove customer/employee
names, phone numbers, addresses, tokens, delivery photos, and business data
from screenshots. If a candidate screen is not available to the reviewed demo
role or does not render correctly on iPad, omit it rather than fabricate it.
`TODO:` device QA for Mac/Vision Pro if those storefront toggles remain on.

## Review access handoff template

Only after the company-login versus public-registration decision and demo
account QA, prepare Review Notes that state the supported sign-in path, the
demo account's role and available sections, the exact navigation to jobs or
dispatch, and where the in-app Privacy Policy appears. Supply username and
password **only** in App Store Connect Review Information after explicit
confirmation; never put credentials in this packet, Brain, or chat. Confirm
the review account cannot reach production customer/employee records and stays
active for the entire review period. No review account has been provisioned.

## Action gates

This packet authorizes no portal save, DSA/legal response, pricing or region
change, review-account creation or credential transmission, Apple API-key
creation, binary upload, App Review submission, or public release. Each action
needs its own action-time confirmation.
