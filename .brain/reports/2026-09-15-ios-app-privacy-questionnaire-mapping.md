# GND Millwork iOS App Privacy questionnaire mapping

Date: 2026-09-15
Status: provisional source-backed mapping; **not approved for entry or publication**

## Scope and safety boundary

This handoff maps the current GND repository evidence to Apple's App Privacy
questions. It uses only these repository evidence records:

- [iOS public App Privacy readiness](2026-09-15-ios-public-app-privacy-readiness.md)
- [iOS release provider and data-flow matrix](2026-09-15-ios-release-provider-data-flow-matrix.md)

No App Store Connect answer, privacy-policy URL, EAS variable, build, vendor
account, or public policy was read or changed while producing this mapping. The
directions below are preparation notes, not legal approval and not authority to
save or publish answers.

Apple requires the declaration to cover the app and integrated third-party
partners, and to remain accurate across the app's platforms. Apple defines
collection as off-device transmission that lets the developer or a partner
access the data longer than necessary to service the request in real time.
Core-function data still has to be declared unless every criterion for an
optional-disclosure exception is met. The proven GND account and upload flows
do not establish those exception criteria. See Apple's
[App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
and [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).

## How to read the recommendations

- **Provisional Yes / select**: the supplied repository evidence proves the
  collection or answer direction, but an authorized owner must still approve it
  against the exact submitted build.
- **Conditional select**: select only if the named path is present and enabled
  in the exact submitted build.
- **Gate**: do not answer yet; the evidence named in the row is required.
- **No supplied evidence**: do not select solely from these reports, but verify
  the final artifact and operations before omitting it.

## Questionnaire entry question

| Apple question | Provisional direction | Why | Required final evidence |
| --- | --- | --- | --- |
| Do you or your third-party partners collect data from this app? | **Provisional Yes** | Authenticated account/profile data is retained in the service database, and employee documents, dispatch photos, notes, recipient names, and signatures are uploaded to server storage. | Authorized product/privacy owner confirms that these flows exist in the submitted version and reconciles the exact binary, server paths, and third-party processors. **Do not choose “Data Not Collected.”** |

## Data-type, purpose, linkage, and tracking mapping

Apple asks for every collected data type, its purpose or purposes, whether it is
linked to the user, and whether it is used for tracking. Apple's definitions of
the types and purposes are in [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

| Likely Apple data type | Proven GND flow | Collection direction | Purpose direction | Linked to user? | Used for tracking? | Evidence still required |
| --- | --- | --- | --- | --- | --- | --- |
| **Contact Info — Name** | Authenticated profile includes a name; dispatch completion sends a recipient name. | **Provisional select.** The profile and dispatch record are retained service data. | **App Functionality** is supported for account/dispatch workflow. Do not add Product Personalization without an owner-confirmed use. | **Provisional Yes** for the account name and the dispatch record because they are stored with account/workflow identifiers. | **Gate.** | Owner confirms the recipient-name subject and use; owner/vendor attests no advertising linkage, advertising measurement, or data-broker sharing. |
| **Contact Info — Email Address** | Account profile includes email; sign-in sends email with the credential. | **Provisional select** based on the retained account profile. Do not rely on the sign-in request alone. | **App Functionality** for authentication/account access. | **Provisional Yes** because it is a direct account identifier. | **Gate.** | Owner confirms all production uses and no marketing/advertising use; server owner confirms the submitted build uses this account path. |
| **Contact Info — Phone Number** | Account profile includes phone number. | **Provisional select** because it is part of retained account/profile data. | **Gate.** The supplied reports do not establish the operational reason for retaining it. | **Provisional Yes** because it is stored in the account profile. | **Gate.** | Product owner states the exact purpose; owner/vendor provides tracking attestation. |
| **Identifiers — User ID** | Profile contains user ID and session ID; authenticated requests use a bearer token. | **Provisional select** for the retained user/account identifier. Whether session IDs or credentials add a separate category is a gate. | **App Functionality** for authentication, authorization, and secure access. | **Provisional Yes** by design. | **Gate.** | Backend owner confirms token/session retention and logging; privacy owner decides how Apple should classify credentials that persist beyond real-time request handling. |
| **User Content — Photos or Videos** | Employee-document images and dispatch-proof photos are uploaded through the API to Vercel Blob and registered in the database. | **Provisional select.** These uploads are primary employee/dispatch functionality, so optional disclosure is not established. | **App Functionality.** | **Provisional Yes** because records are stored against authenticated user or dispatch identifiers. | **Gate.** | Owner confirms permitted content, retention, access, backup, and physical purge; owner/vendor provides tracking attestation. |
| **User Content — Other User Content** | Document title, expiry, description, dispatch note, attachment metadata, and a generated signature image/path are submitted and stored with workflow records. | **Provisional select.** | **App Functionality.** | **Provisional Yes** because the content is stored against user/dispatch records. | **Gate.** | Privacy owner confirms that the signature belongs here rather than another type and documents retention/deletion for every content class. |
| **Other Data — Other Data Types** | Retained account role/access/organization and operational workflow metadata do not have a more specific proven Apple type in the supplied evidence. | **Provisional select** for the retained profile/workflow attributes, subject to owner classification review. | **App Functionality.** | **Provisional Yes** because these attributes are stored with account and workflow records. | **Gate.** | Owner confirms the exact fields included in the submitted app and whether any map to a more specific Apple type. |
| **Identifiers — Device ID** | Conditional Logly analytics persists a random visitor ID in SecureStore and sends it with usage events. | **Conditional select if Logly is enabled** in the exact candidate. | **Analytics** is supported for the Logly path. | **Gate.** A persistent pseudonymous identifier alone does not prove Apple's de-identification and non-relinkage conditions. | **Gate.** | Effective final-build Logly boolean and endpoint operator; vendor/owner evidence on identity joins, cross-property joins, advertising, data brokers, retention, deletion, and access. |
| **Usage Data — Product Interaction** | Conditional Logly events include sessions, screen views, job/order/document opens, notification opens, coarse routes, and allow-listed interaction properties. | **Conditional select if Logly is enabled.** | **Analytics.** Do not add advertising, marketing, personalization, or Other Purposes without evidence. | **Gate.** | **Gate.** | Same release-specific Logly configuration and vendor evidence as Device ID, including whether interaction events can be joined to account/device identity. |
| **Diagnostics — Crash Data** | Conditional Sentry sends exceptions/crash context when enabled. | **Conditional select if Sentry is enabled** and the final payload confirms crash collection. | **App Functionality** is supported for minimizing crashes. Add Analytics only if the owner actually uses the data to evaluate behavior/audiences as Apple defines it. | **Gate.** `sendDefaultPii: false` is not proof of anonymization. | **Gate.** | Final-build Sentry enablement, organization/operator, SDK integrations and scrubbers, representative event fields, retention, regions, subprocessors, linkage, and tracking attestations. |
| **Diagnostics — Performance Data** | Conditional Sentry enables a 0.1 traces sample rate and can transmit performance context. | **Conditional select if Sentry is enabled** and the final payload/report confirms performance collection. | **App Functionality** for performance/scalability. | **Gate.** | **Gate.** | Same Sentry evidence as Crash Data, plus an exact production trace sample/schema. |
| **Diagnostics — Other Diagnostic Data** | Sentry may send stack, device, app, Expo update/runtime, and other exception context; Logly sends app version/build/platform with events. | **Gate.** The supplied reports do not prove which final payload fields Apple places in this type rather than Crash, Performance, Product Interaction, Device ID, or Other Data. | **Gate** between App Functionality and Analytics per the actual path/use. | **Gate.** | **Gate.** | Exact candidate payload schemas/samples with secrets and personal content redacted, plus the Xcode privacy report and owner/vendor purpose statement. |
| **Sensitive Info** | Employee/insurance documents and dispatch evidence could contain sensitive material, but their actual permitted or production content is not established. | **Gate; do not infer from a filename or feature label.** | **Gate.** | **Gate.** | **Gate.** | Owner-approved upload content policy, representative redacted field/content inventory, and confirmation whether Apple-defined health, disability, biometric, union, or other sensitive information is collected. A handwritten signature is not automatically proven biometric data. |
| **Financial Info — Other Financial Info** | The provider matrix names employee and business records, but does not prove that salary, income, assets, debts, or similar data is collected from the iOS app. | **Gate.** | **Gate.** | **Gate.** | **Gate.** | Final screen/API field inventory and owner confirmation for employee-document contents and operational records. |
| **Purchases — Purchase History** | Logly can emit `sales_order_opened`, but that proves an interaction event, not that purchase contents/history are collected from the app. | **Gate; do not select from the event name alone.** | **Gate.** | **Gate.** | **Gate.** | Final app/API inventory showing whether purchase or sales-order details are transmitted from the app and retained, plus the privacy owner's subject/classification decision. |

## Apple types with no supplied evidence

The two source reports do not prove collection of the following types from the
iOS app: Physical Address, Other User Contact Info, Health, Fitness, Payment
Info, Credit Info, Precise Location, Coarse Location, Contacts, Emails or Text
Messages, Audio Data, Gameplay Content, Customer Support, Browsing History,
Search History, Advertising Data, Other Usage Data, Environment Scanning,
Hands, or Head.

This is not a final “No” for those types. Before omitting them, reconcile the
exact IPA, embedded SDKs/privacy manifests, Xcode aggregate privacy report,
effective EAS production configuration, authenticated screens, server request
schemas, and representative production vendor payloads. Do not classify a
sales-order open event as Purchase History, a selected photo as Contacts, or a
signature as biometric Sensitive Info without evidence matching Apple's
definitions.

## Purpose answers that remain unsupported

For all mapped flows, the supplied evidence does **not** support selecting
Third-Party Advertising, Developer's Advertising or Marketing, or Other
Purposes. Product Personalization is also not established merely because roles
control access. Those purposes must not be selected unless the owner identifies
an actual use matching Apple's definitions. Conversely, absence of such a use
in source code is not sufficient to answer the tracking questions; contracts,
vendor practices, and operational sharing must also be checked.

## Linkage decision rule

Apple says a type is linked when the developer or partner links it to identity
through an account, device, or other details. Treating data as not linked
requires protections before collection that remove direct identifiers and
break/restrict re-linkage, followed by no attempt to re-identify or combine it
with linkable datasets. The GND account/profile, user-owned upload, and dispatch
records are linked by design. Logly and Sentry remain unresolved because the
supplied evidence does not establish the operator's joins or de-identification
controls. See Apple's [Data linked to the user definition](https://developer.apple.com/app-store/app-privacy-details/#data-linked-to-you).

## Tracking decision rule

Do not answer tracking “No” from the absence of an advertising SDK in the two
reports. Apple defines tracking as linking app data about a user/device with
data from other companies for targeted advertising or advertising measurement,
or sharing it with a data broker. A privacy-owner attestation and applicable
vendor attestations are required for every selected data type. If any submitted
build path performs tracking, identify the exact types and verify the app's ATT
implementation and consent flow before release. See Apple's
[tracking definition and ATT requirements](https://developer.apple.com/app-store/user-privacy-and-data-use/#permission-to-track).

## Exact release evidence required before form entry

1. **Final artifact:** submitted-build provenance; dependency/SDK inventory;
   effective value-suppressed Logly/Sentry configuration; embedded privacy
   manifests; Xcode aggregate privacy report; and any Apple validation output.
2. **GND/server owner:** exact mobile request and retained-field inventory,
   including password/session logging; data purposes; role/access handling;
   document and dispatch content rules; access, backup, retention, tombstone,
   physical purge, and request-handling behavior. Use the
   [retention and purge evidence matrix](2026-09-15-ios-retention-and-purge-evidence.md)
   to avoid treating credential expiry or database tombstoning as full
   physical deletion.
3. **Provider/vendor:** contracting entity and account owner for Vercel/Blob,
   the production database, Upstash, Logly, Sentry, and relevant Expo/EAS
   processing; payloads, regions, retention/deletion, subprocessors, access,
   security controls, DPA status, user/device linkage, cross-property joins,
   advertising measurement, and data-broker sharing.
4. **Privacy/legal owner:** controller/publisher relationship; final selection
   for ambiguous categories; per-type purposes; per-type linkage; per-type
   tracking; and approval of an accurate public privacy-policy URL and in-app
   access path.
5. **Questionnaire reconciliation:** compare every final answer with the exact
   App Store version across all included platforms, preview the product-page
   label, and have an authorized Account Holder, Admin, or App Manager approve
   accuracy before saving or publishing.

Until all five evidence groups are complete, use this file only as a review
worksheet. Do not enter, save, publish, or submit App Privacy responses.
