# Database Relationships

## Purpose
Tracks important cross-model relationships and ownership patterns.

## Current Notes
- `Customers.dealerOwnerId` identifies a dealer-owned downstream customer.
  `officeVisibility = SHARED` permits read-only office discovery without
  transferring ownership or allowing unrelated office-origin sales.
- `DealerRecruitmentCampaign` owns profile/customer audience targets,
  invitations, and attributed applications. Each invitation belongs to one
  office customer and normalized recipient email; only its token hash is
  persisted, and it may create one idempotent application.
- `DealerRecruitmentInvitation.customerId` belongs to `Customers.id` and
  `sentById` optionally identifies the Super Admin sender. One customer may
  have many invitation attempts; superseded/revoked rows remain audit evidence.
- `DealerRecruitmentCustomerState.customerId` is one-to-one with `Customers`
  and serializes sends for that customer. `latestInvitationId` is a lookup
  pointer; token validation continues to use the invitation's hash plus
  revoked/superseded/expiry/campaign constraints.
- Approved applications link to the existing dealer account/onboarding-token
  flow. Delivery/ship submissions separately persist an order recipient
  snapshot so fulfillment does not depend on later customer visibility/edits.
- Sales shipment relationship for the inventory cutover:
  - `SalesOrders` -> `OrderDelivery` is the shipment/dispatch header relationship.
  - `OrderDelivery` -> `OrderItemDelivery` is the shipment line relationship.
  - `OrderItemDelivery.orderItemId` points to the legacy sales line.
  - `OrderItemDelivery.meta.lineItemId` should point to inventory `LineItem.id` for inventory-origin shipment writes.
  - `LineItemComponents` -> `StockAllocation` remains the inventory-side component reservation/pick/consume relationship.
  - Completed shipment reporting should read `OrderDelivery` / `OrderItemDelivery`; inventory stock consumption reporting should read `StockAllocation.status = consumed` and reconcile the two.
- Web bug reporting relationships:
  - `BugReport.createdById` points to `Users.id` for the submitting employee; the API hydrates submitter details manually instead of adding new `Users` relation fields.
  - `BugReport.statusUpdatedById` points to `Users.id` for the Super Admin who last changed status; this is also hydrated manually.
  - `BugReport.recordingDocumentId` points to `StoredDocument.id` for the primary Vercel Blob evidence metadata. The column name is legacy-compatible; the linked document may be a video recording or screenshot depending on `BugReport.captureType`.
  - `BugReportFollowUp.audioDocumentId` points manually to `StoredDocument.id` for optional voice-note evidence; no Prisma relation is modeled.
  - `StoredDocument.ownerType = "bug_report"` and `StoredDocument.ownerId = BugReport.id` are the document-platform ownership convention for primary evidence and voice notes.
  - `BugReport` -> `BugReportFollowUp` is a Prisma relation with cascade delete for report thread messages.
- Sales email delivery relationships:
  - `SalesEmailAttempt.senderId` points to `Users.id` through `Users.sentSalesEmailAttempts` for the actor who initiated the send
  - `SalesEmailAttempt.salesRepId` points to `Users.id` through `Users.salesRepEmailAttempts` for the sales rep attached to the underlying sale when known
  - `SalesEmailAttempt.originalAttemptId` is a self-relation used by Super Admin resend attempts so retry rows can be traced back to the failed/skipped source row without mutating original evidence
  - related sales ids/order numbers are stored as JSON/text snapshots (`salesIds`, `salesNos`, `salesIdsText`, `salesNosText`) rather than new sales ledger join tables in v1
- Background task diagnostics relationships:
  - `TaskRunDiagnostic.actorId` points to `Users.id` through `Users.taskRunDiagnosticsStarted` for the signed-in actor who started the task when known
  - `TaskRunDiagnostic.reviewedById` points to `Users.id` through `Users.taskRunDiagnosticsReviewed` for the Super Admin who marks a diagnostic reviewed
  - task context uses snapshots (`actorName`, `actorEmail`, `entityType`, `entityId`, `entityLabel`) so diagnostics remain readable even if related domain records change later
  - generic task diagnostics do not introduce joins to sales, inventory, notification, or email domain tables in v1; use `entityType`/`entityId` plus domain-specific ledgers such as `SalesEmailAttempt` for deeper investigation

## TODO
- Document major relationships for sales, payments, resolution, documents, customers, and dispatch flows.
## Storefront relationships (2026-07-20)

- Storefront Category 1:N Storefront Offer.
- Storefront Offer 1:N Step Policy and 1:N Offer Component Policy.
- Storefront Category/Offer/Component source UID fields reference canonical
  Dyke identities logically; Dyke remains the product, compatibility, and
  pricing source of truth.
- Commerce Collection 1:N Commerce Line; each line optionally references a
  Storefront Offer and preserves the canonical configuration snapshot.
- Commerce Collection 1:N Storefront Checkout; a completed checkout references
  exactly one canonical `SalesOrders` record.
- Storefront Page 1:N Storefront Section.
- User/customer ownership is stored through server-derived user IDs without
  exposing caller-controlled ownership mutations.

## Storefront custom millwork inquiry links (2026-07-22)

- `StorefrontInquiryActivity.inquiryId -> StorefrontInquiry.id` is a cascading
  Prisma relation.
- `StorefrontInquiry.customerId -> Customers.id` and
  `StorefrontInquiry.salesQuoteId -> SalesOrders.id` are application-enforced
  links because the legacy customer/Sales tables do not expose compatible
  relation ownership in this bounded schema.
- `StoredDocument.ownerType/ownerId` polymorphically associates private files to
  `StorefrontInquiry.id`; every read repeats both values.
