# GND Millwork ProDesk iOS privacy-policy draft

Date: 2026-09-15
Status: local legal-review draft only; not approved, published, or entered in
App Store Connect

## Owner facts required before publication

Replace every bracketed item from verified legal, production and operational
evidence. Do not publish this draft with placeholders.

1. **Controller and seller relationship:** legal name and contact of the entity
   controlling employee/app data; explain its relationship to Apple seller
   **ZEROES AND ONE TECH HUB NIG LIMITED** and the GND Millwork brand.
   Use the [controller identity evidence matrix](2026-09-15-ios-controller-identity-evidence.md);
   source supports the brand/operator and Apple seller identities separately,
   but does not prove their legal or data-processing relationship.
2. **Privacy contact:** monitored public email and, if applicable, postal
   channel for privacy/data-rights requests.
3. **Production telemetry:** whether Logly analytics and Sentry diagnostics are
   enabled in the exact public iOS build; identify their operators, processing
   locations, retention, deletion and subprocessors.
   Use the [provider/data-flow matrix](2026-09-15-ios-release-provider-data-flow-matrix.md)
   to collect the same evidence for Vercel, the production database, Upstash,
   Expo/EAS and Apple without exposing account secrets.
4. **Operational processors:** confirm the hosting, database and file-storage
   providers used by the release environment, including Vercel Blob for
   employee documents and dispatch evidence.
5. **Retention:** approved schedules or decision rules for account/profile and
   session records; employment documents; job/dispatch records; proof photos
   and signatures; audit/security logs; analytics; and crash diagnostics.
6. **Deletion:** the request channel and verified purge process. Current source
   proves database tombstoning for an employee-document deletion, not immediate
   removal of the corresponding Blob bytes.
7. **Legal bases and regions:** counsel-approved bases for employment/business
   operations, security, legal obligations and any consent-based processing,
   plus region-specific rights wording.
8. **Tracking:** explicitly confirm whether any mobile data is linked with
   third-party data for targeted advertising/advertising measurement or shared
   with data brokers. Do not copy the retail policy's advertising language into
   this app policy unless it is true for the submitted binary.

## Proposed public text

### Privacy notice for GND Millwork ProDesk

**Effective date:** [DATE]

This notice explains how **[CONTROLLER LEGAL NAME]** ("we", "us") handles
information when authorized personnel use the GND Millwork ProDesk mobile app.
**[RELATIONSHIP TO ZEROES AND ONE TECH HUB NIG LIMITED AND GND MILLWORK
BRAND]**. This notice supplements any employee, contractor, customer or vendor
notice that applies to your relationship with GND.

The app is publicly downloadable, but downloading it does not create an
account or grant access to company information. Access requires an existing
company-issued account and is limited by assigned roles and permissions.

### Information handled by the app

Depending on your role and the features you use, we may handle:

- account and profile details, such as user identifier, name, business email,
  business phone, role, organization and permitted app sections;
- authentication and security information, including credentials sent for
  authentication, session identifiers, access tokens, sign-in attempts and
  related security records;
- job, production, sales, dispatch and other company-workflow information that
  your account is permitted to access or update;
- employee documents and their metadata, including selected images, titles,
  descriptions and expiry dates;
- delivery and dispatch evidence, including recipient name, notes, selected
  proof photos, signatures and associated job/dispatch identifiers;
- app/device and diagnostic information, such as platform, app version, build,
  coarse app section, event identifiers and crash or performance details, when
  the corresponding production services are enabled; and
- communications or requests you submit through support or privacy channels.

The app requests access only to photos you select for employee documents or
delivery proof. It does not need unrestricted photo-library access for the
documented first-release flow.

### Why we use information

We use information to authenticate authorized users; enforce organization and
role permissions; provide job, dispatch, document and related business
workflows; maintain records requested by the company; secure and troubleshoot
the service; respond to support and privacy requests; comply with legal
obligations; and **[ONLY IF ENABLED AND VERIFIED: understand aggregate app use
and improve reliability]**.

**[LEGAL OWNER: INSERT THE APPLICABLE LEGAL BASES FOR EACH PURPOSE AND REGION.]**

### Service providers and disclosures

We disclose information only as needed to operate the service, follow the
company's instructions, protect users and systems, complete authorized business
work, or comply with law. Relevant recipients may include:

- **[HOSTING/API/DATABASE PROVIDERS AND ROLES]**;
- Vercel or **[CONFIRMED STORAGE OPERATOR]** for uploaded documents, dispatch
  evidence and related service hosting;
- **[LOGLY OPERATOR, OR STATE THAT MOBILE ANALYTICS IS DISABLED]**;
- Sentry/**[SENTRY LEGAL ENTITY, OR STATE THAT MOBILE DIAGNOSTICS IS DISABLED]**;
- authorized company administrators and personnel whose roles require access;
  and
- professional advisers, regulators, courts, law enforcement or transaction
  counterparties where permitted or required by law.

We do not state that mobile information is sold, shared for cross-company
behavioral advertising, or provided to data brokers until the legal/data owner
has verified the release environment and can make that statement accurately.

### Storage, security and retention

The app stores its authenticated profile and token using the operating system's
secure storage. Dispatch evidence may be kept temporarily on the device while
a completion draft is pending. Information submitted to the service is stored
in **[CONFIRMED SYSTEMS/REGIONS]** and protected using administrative,
technical and organizational safeguards appropriate to the information.

We retain each category only for **[APPROVED SCHEDULE OR DECISION RULE]**, taking
account of operational, employment, contractual, security and legal-record
requirements. Removing a record from the app may initially restrict access or
mark the database record deleted; it does not necessarily mean every backup or
stored file byte is erased immediately. **[DESCRIBE THE VERIFIED BLOB PURGE,
BACKUP EXPIRY AND LEGAL-HOLD PROCESS.]**

### Choices and rights

Authorized users can update certain profile information or request assistance
through **[SUPPORT CHANNEL]**. To request access, correction, deletion,
restriction, objection, portability or another applicable privacy right,
contact **[PRIVACY CONTACT]**. We may need to verify identity and authority and
may retain information where required for legal, employment, security or
business-record obligations. Account access and offboarding are administered by
the company; the current app does not offer public self-registration.

Where processing relies on consent, explain how to withdraw that consent here:
**[CONSENT WITHDRAWAL PROCESS OR NOT APPLICABLE]**.

### International processing and children

Information may be processed in **[COUNTRIES/REGIONS]** by the controller and
verified service providers, subject to **[APPLICABLE TRANSFER SAFEGUARDS]**.
GND Millwork ProDesk is a company business application and is not directed to
children. **[LEGAL OWNER: INSERT ANY REQUIRED AGE/EMPLOYMENT QUALIFICATION.]**

### Changes and contact

We may update this notice when the app, providers or legal requirements change.
The effective date above identifies the current version. Material changes will
be communicated through **[APPROVED NOTICE METHOD]**.

Questions or privacy requests: **[CONTROLLER LEGAL NAME, PRIVACY EMAIL, PUBLIC
POSTAL ADDRESS, AND OPTIONAL PHONE]**.

## Publication and Apple handoff

Before this text can clear the iOS release gate:

1. Legal/data owners resolve every bracketed item and reconcile the result with
   the exact production EAS configuration, final IPA privacy manifests and
   vendor agreements.
2. Publish the approved text at one stable public HTTPS URL controlled by the
   responsible entity; remove unrelated template/cross-brand claims from the
   existing page if it is reused.
3. Confirm the published page exactly matches the approved version and is
   reachable without login.
4. With separate action-time confirmation, set the same URL in the existing
   `pcruz321` EAS project's production environment and App Store Connect App
   Privacy metadata. Do not edit `.env*` files or relink the EAS project.
5. Complete Apple's data-practices questionnaire from the final build and
   operational facts; do not infer a “no data collected” response from this
   draft.

This draft is not legal advice and authorizes no publication, vendor statement,
EAS mutation, Apple metadata save, questionnaire answer or submission.
