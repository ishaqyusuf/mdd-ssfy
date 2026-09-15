# iOS public App Privacy readiness — bounded code audit

Date: 2026-09-15
Scope: repository inspection only; no App Store Connect edits, legal-policy drafting, environment inspection, or production traffic review.

## Executive finding

The repository demonstrates multiple potential data-collection paths, so the App Privacy declaration cannot be safely inferred from source alone. The highest-confidence code facts are: (1) optional mobile analytics emits a persistent pseudonymous visitor ID, app/release metadata, coarse route, and session/screen-view events; (2) Sentry is conditionally initialized and explicitly disables default PII, but can receive crash/diagnostic payloads; (3) authenticated users can upload insurance-document images and dispatch proof photos/signatures to the server-side document service. Whether each path is active in the public iOS build, what vendors retain/process, and whether data is linked to identity or used for tracking remain live-environment/vendor-policy questions.

## Repository evidence

### Analytics (Logly)

- `AnalyticsRuntime` returns without creating a client unless `EXPO_PUBLIC_LOGLY_ENABLED === "true"`, requires an endpoint, requires HTTPS in production, and only runs on iOS/Android; it passes project, endpoint, platform, native app version/build, and a random UUID generator to `createNativeAnalytics` ([apps/mobile/src/runtime/analytics-runtime.tsx:20-45](../../apps/mobile/src/runtime/analytics-runtime.tsx#L20-L45)). It records a screen view after initialization, records at most one session per day on foreground, flushes on background, and records route changes ([apps/mobile/src/runtime/analytics-runtime.tsx:47-63](../../apps/mobile/src/runtime/analytics-runtime.tsx#L47-L63)).
- The native client persists `logly:<project>:native-visitor` and a bounded event queue through the supplied storage adapter; the mobile runtime supplies Expo SecureStore for both ([packages/events/src/native.ts:33-47](../../packages/events/src/native.ts#L33-L47); [apps/mobile/src/runtime/analytics-runtime.tsx:39-44](../../apps/mobile/src/runtime/analytics-runtime.tsx#L39-L44)). The visitor ID is generated once and events include event ID, project, source `mobile`, platform, app version/build, timestamp, visitor ID, visit kind, sanitized route, and sanitized properties ([packages/events/src/native.ts:87-113](../../packages/events/src/native.ts#L87-L113)).
- The native schema allows only scalar properties, at most 20 properties, and caps strings at 256 characters; route normalization keeps only an allow-listed first path segment, and server policy keeps only five property names (`section`, `has_filters`, `status`, `action`, `result`) ([packages/events/src/native-contract.ts:3-37](../../packages/events/src/native-contract.ts#L3-L37); [packages/events/src/policy.ts:20-55](../../packages/events/src/policy.ts#L20-L55)). The mobile allow-list includes `app_session`, `screen_view`, `job_opened`, `sales_order_opened`, `document_viewed`, and `notification_opened` ([packages/events/src/policy.ts:12-19](../../packages/events/src/policy.ts#L12-L19)).
- Delivery is a POST to the configured endpoint, in batches of up to 25, with a four-second timeout; the server route forwards accepted, policy-filtered events to the configured collector with a project key ([packages/events/src/native.ts:49-59](../../packages/events/src/native.ts#L49-L59); [packages/events/src/native.ts:60-85](../../packages/events/src/native.ts#L60-L85); [packages/events/src/route.ts:8-17](../../packages/events/src/route.ts#L8-L17); [packages/events/src/route.ts:43-75](../../packages/events/src/route.ts#L43-L75)). The repository does not establish the collector’s legal entity, retention, deletion, access, or whether the visitor ID is joined to account identity.

### Crash/error diagnostics (Sentry)

- Sentry initializes only when `EXPO_PUBLIC_SENTRY_ENABLED` is true and a DSN exists; it sets environment, `sendDefaultPii: false`, and a 0.1 traces sample rate ([apps/mobile/src/lib/sentry.ts:5-26](../../apps/mobile/src/lib/sentry.ts#L5-L26)). It adds Expo update/runtime tags and can deliberately send a startup smoke-test exception when the corresponding flag is enabled ([apps/mobile/src/lib/sentry.ts:28-37](../../apps/mobile/src/lib/sentry.ts#L28-L37); [apps/mobile/src/lib/sentry.ts:46-56](../../apps/mobile/src/lib/sentry.ts#L46-L56)). `sendDefaultPii: false` is a code setting, not proof that all captured exception context is non-personal or that the public build has Sentry disabled.

### Authentication and account data

- The mobile profile shape contains session ID, bearer token, user ID, name, email, phone number, role, and access sections; the profile and token are stored in Expo SecureStore ([apps/mobile/src/lib/session-store.ts:25-54](../../apps/mobile/src/lib/session-store.ts#L25-L54)). Sign-in sends email/password to the auth endpoint; session and sign-out send the bearer token ([apps/mobile/src/lib/mobile-auth.ts:14-18](../../apps/mobile/src/lib/mobile-auth.ts#L44-L51); [apps/mobile/src/lib/mobile-auth.ts:68-87](../../apps/mobile/src/lib/mobile-auth.ts#L68-L87)). Authenticated tRPC calls send the bearer token in `x-app-authorization` ([apps/mobile/src/trpc/client.tsx:45-52](../../apps/mobile/src/trpc/client.tsx#L45-L52)). These are service data flows, not evidence that credentials are sent to analytics.

### Photo/document/signature uploads

- The Documents screen asks the user to pick an image from the photo library with base64 enabled, keeps filename/MIME/URI/base64 in component state, and submits the base64 image with title, expiry, and description to `user.uploadDocumentAsset` ([apps/mobile/src/screens/documents-screen.tsx:34-45](../../apps/mobile/src/screens/documents-screen.tsx#L34-L45); [apps/mobile/src/screens/documents-screen.tsx:97-135](../../apps/mobile/src/screens/documents-screen.tsx#L97-L135); [apps/mobile/src/screens/documents-screen.tsx#L138-156](../../apps/mobile/src/screens/documents-screen.tsx#L138-L156)). The API decodes and uploads the bytes to the Vercel Blob document service, registers the upload against the authenticated user, and saves a user document ([apps/api/src/trpc/routers/user.route.ts:83-135](../../apps/api/src/trpc/routers/user.route.ts#L83-L135)).
- Dispatch proof photos are selected from the photo library without base64, copied into the app’s document directory, persisted with user/dispatch IDs and attachment metadata, limited to five files/4 MB each/10 MB total, and later read as base64 for submission ([apps/mobile/src/features/dispatch/components/dispatch-complete-form.tsx:116-143](../../apps/mobile/src/features/dispatch/components/dispatch-complete-form.tsx#L116-L143); [apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts:6-18](../../apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts#L6-L18); [apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts:40-42](../../apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts#L40-L42); [apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts:130-183](../../apps/mobile/src/features/dispatch/lib/dispatch-proof-draft-storage.ts#L130-L183)). The completion request also includes recipient name, note, signature path, and attachments ([apps/mobile/src/features/dispatch/api/use-dispatch-actions.ts:7-21](../../apps/mobile/src/features/dispatch/api/use-dispatch-actions.ts#L7-L21)). The API uploads a generated SVG signature and decoded attachment bytes to the dispatch document folder and registers them as stored documents ([apps/api/src/trpc/routers/dispatch.route.ts:2041-2056](../../apps/api/src/trpc/routers/dispatch.route.ts#L2041-L2056); [apps/api/src/trpc/routers/dispatch.route.ts:2131-2170](../../apps/api/src/trpc/routers/dispatch.route.ts#L2131-L2170)).
- The iOS config declares the photo-library purpose string: “GND uses selected photos as employee documents and delivery proof.” ([apps/mobile/app.config.ts:84-88](../../apps/mobile/app.config.ts#L84-L88)). This confirms photo-library access is part of the native configuration; it does not answer App Privacy data-type, linkage, purpose, or tracking questions.

## Apple requirements that apply

- Apple requires App Store Connect privacy-practice information for new apps and updates, including data collected by third-party code such as analytics SDKs; Apple defines tracking separately as linking app/device data with other companies’ data for targeted advertising/measurement or sharing with data brokers ([Apple — User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/)).
- Apple’s App Store Connect reference says the privacy-policy URL is required for all apps, data types include collection directly or through third-party partners, and responses must accurately cover the app across platforms ([Apple — App Privacy reference](https://developer.apple.com/help/app-store-connect/reference/app-privacy/)). Apple’s management guidance says responses must include the app’s and integrated third parties’ practices and be kept accurate as practices change ([Apple — Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)).
- App Review Guideline 5.1.1 requires an easily accessible in-app privacy-policy link and a policy that identifies collected data, collection methods, uses, third-party sharing, retention/deletion, consent revocation, and deletion requests; Guideline 5.1.2 requires permission before using/transmitting/sharing personal data and clear disclosure of third-party sharing, including third-party AI ([Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)).
- Apple’s privacy-manifest documentation says each collected data type from the app or third-party SDK belongs in `NSPrivacyCollectedDataTypes`, including whether it is linked to the user, used for tracking, and its purposes; the manifest/report is an input to App Store Connect privacy details ([Apple — Describing data use in privacy manifests](https://developer.apple.com/documentation/BundleResources/describing-data-use-in-privacy-manifests)).

## Unknowns that block a defensible declaration

The following cannot be established from this repository and must be resolved from the exact public iOS artifact, build-time configuration, vendor documentation/contracts, and operational data-handling owners before answering Apple’s form: whether Logly and Sentry are enabled in the submitted build; the actual Logly collector and Sentry organizations; vendor retention/deletion/subprocessors; whether analytics or diagnostics are linked to the authenticated user, device, or account; whether any path is used for cross-company advertising/measurement or shared with data brokers; server/storage access and retention for uploaded documents, proof photos, signatures, and profile fields; and whether the public build includes any additional SDK/native collection not represented in the inspected source. No App Privacy category, “linked to you,” purpose, tracking, or consent answer is recommended here.

## Readiness handoff

Before submission, obtain a release-specific dependency/configuration inventory and vendor data-processing/retention statements, trace server-side storage and deletion controls for the upload paths, verify the in-app privacy-policy access path, and then have the product/legal owner answer App Store Connect from those facts. This report intentionally does not publish policy text or save Apple form responses.

### September 15 local inventory guard

The iOS production preflight now emits only booleans for effective local
Sentry/Logly enablement and HTTPS configuration, without printing a DSN,
collector URL, or credential. Explicit production Expo configuration rejects
Sentry debug/smoke-test modes and enabled telemetry lacking a valid HTTPS
endpoint. The guard is activated by the iOS-only production-profile `ios.env`
flag, which [Expo documents as platform-specific build configuration](https://docs.expo.dev/build/eas-json/);
Android production keeps its existing route. The same flag guards the EAS
iOS production environment.
The local boolean snapshot is not proof that the final EAS environment matches
it, and neither check answers vendor handling, linkage, tracking, retention,
or the accurate App Store Connect questionnaire. Those owner/vendor/artifact
checks remain open.
Read-only EAS production name checks now prove that
`EXPO_PUBLIC_PRIVACY_POLICY_URL` is absent at project and account scope;
Logly/Sentry variable names are present at project scope but their effective
booleans were not safely verified. See the
[value-suppressed inventory](2026-09-15-ios-eas-production-env-inventory.md).

### Server-side employee-document deletion evidence

The authenticated mobile employee-document upload uses Vercel Blob and
registers a `StoredDocument` before saving `UserDocuments`
([user.route.ts](../../apps/api/src/trpc/routers/user.route.ts)). The
authenticated `user.deleteDocument` path calls `deleteUserDocument`, which
checks that the record belongs to the current user and transactionally sets
`deletedAt` on the user document and its owned `StoredDocument`
([user.ts](../../apps/api/src/db/queries/user.ts)). That path does **not**
call Vercel Blob `del`; the deletion proved by this code is a database
tombstone, not immediate removal of stored bytes. The direct Blob `del` path
inspected in `storage.route.ts` is restricted to staged authenticated-browser
uploads and does not prove deletion for the mobile employee-document path.
Upload-finalization cleanup does call Blob `del` for failed registration; that
is a failed-upload cleanup, not an employee-requested deletion guarantee.

`TODO:` product/legal/data-operations owner decides whether and when employee
documents and dispatch proofs must be physically purged, what retention is
required for employment/delivery records, and how requests are handled. Do
not tell Apple or users that deleting an employee document immediately erases
the Blob bytes based on the current path.
