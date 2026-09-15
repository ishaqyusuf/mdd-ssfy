# Apple EU Digital Services Act trader requirements

**Reviewed:** 2026-09-15
**Scope:** An organization distributing a free, public iOS app; official Apple sources only. This is an operational checklist, not legal advice.

## Bottom line

Free pricing does **not** by itself make the organization a non-trader. Apple treats app revenue as only one factor and says that developing an app in a professional/business capacity, or having legal status associated with business activity, suggests trader status. Apple cannot decide the status for the developer. For an organization publishing its business app in EU App Store territories, the practical Apple-facing path is therefore normally to declare the account/app as a trader unless counsel concludes otherwise. [Apple: Manage European Union Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

## Exact organization checklist

| Item | What Apple currently requires |
| --- | --- |
| Status declaration | Select either **“This is a trader account”** or **“This is not a trader account.”** Trader status can later be changed for individual apps under **Apps → App Information → App Store Regulations and Permits → Digital Services Act**. |
| Public address | For an organization, Apple automatically displays the address associated with its D-U-N-S Number. Changing that physical address requires contacting Apple. |
| Public phone | Enter a phone number and validate it using two-factor authentication. If the number cannot receive a verification code, request manual verification. |
| Public email | Enter an email address and validate it using two-factor authentication. |
| Business evidence | Upload a **current document** verifying the business name and address. Apple identifies business or legal records as acceptable categories, but does not publish a closed list of document names on the DSA page. |
| Alternate-address evidence | If displaying an alternate address such as a P.O. Box, also upload a document linking the organization to that address; Apple gives a receipt or bill as examples. |
| Payment details | All traders must provide payment-account details if those details are not already in App Store Connect. Apple states this requirement without an exception for free apps. |
| Certification | Certify that the organization offers only products or services complying with applicable EU law. |
| Optional URL | A **Labels and Markings URL** is optional. Use it only when the app has labels or markings required by EU law; Apple displays it on EU product pages for apps identified as trader apps. |

All checklist items above come from Apple’s current DSA workflow. [Apple: Manage European Union Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

Apple’s separate agreements guidance confirms that free apps may be distributed under the Apple Developer Program License Agreement. The DSA page nevertheless independently requires payment-account details from all declared traders; it does not say that the Paid Apps Agreement or tax forms are DSA prerequisites. Do not infer those additional documents from DSA alone. [Apple: Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements); [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

## Who can complete it

Apple identifies **Account Holder or Admin** as the required role for the account-level DSA workflow. Apple’s announcement likewise says Account Holders or Admins enter trader status. The app-specific trader-status and Labels and Markings controls are also documented for those roles. An App Manager or Developer role is not listed as sufficient. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements); [Apple: New requirement for apps in the EU](https://developer.apple.com/news/?id=6agg0lja)

## What users will see and what happens if verification is incomplete

- Once verified, Apple displays the organization’s D-U-N-S-linked address, verified phone number, and verified email address on the app’s App Store product page when the app is distributed in any of the EU’s 27 territories. Apple says these display details do not change the corresponding Developer Program membership information. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- If the developer declares that it is not a trader, EU consumers are told that consumer rights arising from applicable consumer-protection laws do not apply to contracts between them and the developer. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- Since February 17, 2025, Apple removes apps without trader status from the EU App Store until status is supplied and verified. Trader status has also been required since October 16, 2024 to submit updates for apps distributed in the EU; a trader must provide trader information before submitting the app for review. [Apple: Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/); [Apple: New requirement for app updates in the EU](https://developer.apple.com/news/?id=yfacfeal)

## Verification and timing

Email and phone validation occur in the submission flow through two-factor authentication; a phone that cannot receive codes moves to manual verification. The organization then uploads its evidence and confirms the submission. Apple’s DSA article does **not** publish a guaranteed or typical DSA-document review duration. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

Apple’s general compliance-review reference says status can be tracked in App Store Connect’s **Business** module and instructs developers to contact Apple if a compliance case remains pending after **14 business days**. That page does not expressly label this as a DSA-specific service-level target, so treat 14 business days as Apple’s escalation threshold for a pending compliance case, not a promised DSA turnaround. Apple also notes that compliance reviews may be repeated when Developer Account information changes. [Apple: Compliance review](https://developer.apple.com/help/app-store-connect/reference/account-management/compliance-review)

Operationally, EU availability should be planned as blocked until Apple shows the trader information as verified; submitting the declaration is not equivalent to completed verification. [Apple: DSA trader status required for apps in the EU](https://developer.apple.com/news/upcoming-requirements/?id=02172025a)

## If the app will not be distributed in the EU

- Apple still requires a trader-status declaration, including when an app is distributed on the App Store only outside the EU. For a developer that has not yet confirmed status, Apple says the declaration is requested the next time a new app is submitted in App Store Connect. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- Apple says a developer distributing only through TestFlight, only through alternative distribution, or on the App Store only outside the EU is **not acting as a trader on the App Store**. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- The DSA contact-information display described by Apple applies to product pages when the app is distributed in an EU territory. Apple does not say that the DSA contact block is displayed solely because the app is available outside the EU. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
- For an account/app validly declared **not a trader**, Apple says no DSA contact information is required. A Labels and Markings URL is optional, not a general submission requirement. [Apple: DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

## Recommended evidence packet before an authorized person opens the workflow

1. Confirm the D-U-N-S-linked legal address is suitable for public display.
2. Prepare a monitored public business email and phone number capable of receiving verification codes.
3. Prepare a current business/legal record showing the exact business name and address; prepare a receipt or bill as well if using an alternate address or P.O. Box.
4. Ensure payment-account details are available for entry if App Store Connect does not already have them.
5. Have the Account Holder or an Admin complete the declaration and certification, then track verification in **Business**. Escalate to Apple if the compliance case is still pending after 14 business days.

No App Store Connect account, app availability, agreement, payment, or compliance state was changed during this research.

## Live handoff state

The signed-in Account Holder opened **Business → Complete Compliance
Requirements** on September 15. The modal presents the two documented choices:
**I'm a trader under the DSA** or **I'm not a trader under the DSA or I don't
plan to distribute in the EU**. Neither radio option is selected and **Next**
is disabled. The tab is intentionally left at this screen. Selecting a status
is a legal/business-owner decision; proceeding will ultimately disclose or
withhold trader contact information and affect EU availability. No selection,
form submission, verification or account change occurred.
