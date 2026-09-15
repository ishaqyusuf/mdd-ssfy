# GND Millwork public iOS provider and data-flow matrix

Date: 2026-09-15
Status: source-backed release review; vendor contracts and final production
configuration remain owner-controlled evidence

## Matrix

| System/provider | Proven or conditional role | Data implicated by source | Evidence still required before policy/App Privacy answers |
| --- | --- | --- | --- |
| GND dashboard/API on Vercel | The mobile app calls protected Better Auth and tRPC routes served by dashboard/API source. Vercel Blob stores employee documents and dispatch evidence. | Authentication/session data, profile/role/organization, operational records, uploaded images, document metadata, recipient names, notes and signatures. | Current production deployment and regions; Vercel account/controller; Blob retention, backup and physical-purge behavior; subprocessors and contract/DPA. |
| PlanetScale/MySQL-compatible production database | Existing verified production fingerprints and Prisma configuration establish a remote MySQL data store used by backend queries. | User/account, employee, job, dispatch, document metadata, audit and workflow records represented by the schema. | Current production provider/account, hosting region, backup/retention/deletion, access controls and DPA. Do not infer current PlanetScale service terms from a historical hostname alone. |
| Upstash Redis | The production login limiter requires Upstash REST configuration and fails closed if it is missing/unavailable. | HMAC-derived IP/account rate-limit subjects, counters and expiries; source intentionally avoids raw account/IP subjects in Redis keys. | Confirm variables are present in the deployed dashboard without revealing values; retention/expiry in production, provider region, operator contract and whether any logs contain network identifiers. |
| Logly collector | Mobile analytics is conditional on `EXPO_PUBLIC_LOGLY_ENABLED` and an HTTPS endpoint. Events can contain a persistent pseudonymous visitor ID, event ID, platform, app version/build, coarse allow-listed route and allow-listed properties. Backend forwards accepted events to a configured collector under the `gnd-mobile` project. | Pseudonymous device/install identifier and app-usage/diagnostic metadata. Source does not send the authenticated profile in the event schema. | Whether enabled in the exact EAS candidate; collector URL/operator/account; whether visitor IDs are joined to identity or other-company data; purposes, retention, deletion, access, regions, subprocessors and tracking determination. |
| Sentry | Mobile crash/performance diagnostics is conditional on the production flag and DSN; source sets `sendDefaultPii: false` and a 0.1 traces sample rate. | Exceptions, stack/device/app/update/runtime and performance context; exact payload may depend on SDK/runtime behavior. | Whether enabled in the exact candidate; Sentry organization/operator, enabled integrations, scrubbers, event samples, retention, regions, subprocessors, user linkage and DPA. `sendDefaultPii: false` is not proof of zero personal data. |
| Expo/EAS | Builds and updates use the retained `pcruz321` project and EAS project/update linkage. | Source/build configuration and signing workflow. Public Expo variables are embedded in the app; secrets/signing credentials remain service-side. | Final build provenance, effective public variables, privacy manifests, access controls and applicable Expo processing terms. EAS is not automatically an App Privacy “data collected” category, but belongs in the security/vendor inventory. |
| Apple | App Store Connect receives listing, compliance, review credentials and the uploaded binary; Apple distributes the app. | Seller/compliance contacts, app metadata, review account, binary and Apple-side distribution/analytics data. | Use Apple's and the controller's own notices to allocate responsibilities accurately. Never copy review credentials or verification codes into this matrix. |

## Data-flow boundary

```text
Authorized user device
  ├─ credentials/session/profile ──> GND auth/API ──> production database
  ├─ employee/dispatch uploads ────> GND API ──────> Vercel Blob + metadata DB
  ├─ rate-limited sign-in subject ─> GND auth ─────> Upstash (HMAC-derived key)
  ├─ optional usage events ────────> GND analytics proxy ─> Logly collector
  └─ optional diagnostics ─────────> Sentry

Expo/EAS builds the binary; Apple reviews and distributes it.
```

The diagram describes source paths, not verified production enablement or legal
roles.

## Release decisions this matrix resolves

- Apple must not receive a **Data Not Collected** answer: authenticated service
  and upload flows exist even if optional analytics and Sentry are disabled.
- Tracking cannot be answered from the retail policy or package names. It
  requires owner/vendor evidence about cross-company linking, advertising
  measurement and data brokers.
- Data linked to the user must be assessed per Apple data type and purpose.
  Authenticated profile, business records and user-owned uploads are linked by
  design; the pseudonymous analytics visitor requires separate linkage review.
- The privacy policy must describe processors/categories and actual retention,
  not promise immediate deletion where source only tombstones database records.

## Owner/vendor evidence request

For each production provider, record outside this repository: contracting legal
entity, service/account owner, processing purpose, data categories, hosting and
transfer regions, retention/deletion, subprocessors, security/access controls,
DPA status, and a current privacy/security source. Then reconcile the exact EAS
candidate and Xcode aggregate privacy report against this matrix.

No secret value, vendor account, production environment, Apple answer or public
policy was read or changed by this review.
