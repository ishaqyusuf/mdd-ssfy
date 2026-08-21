# Database Relationships

## Dispatch Exceptions (2026-08-18)

- `OrderDelivery.exceptions` owns the operational issues reported against one
  physical trip; `DispatchException.orderDeliveryId` is the required relation.
- Exception reporter/resolver ids are actor evidence from authenticated API
  context. They are not client-selected identities and remain scalar evidence
  rather than trip ownership relations.
- Exception state overlays the dispatch lifecycle. It never replaces
  `OrderDelivery.status`, driver assignment, packing readiness, proof state, or
  dispatch-bound inventory state.

## Dispatch-Bound Inventory (2026-08-06)

- `OrderDelivery.stockAllocations` contains the exact stock rows reserved,
  picked, consumed, or released for that trip.
- `StockAllocation.orderDeliveryId` belongs to `OrderDelivery.id`; the project
  uses Prisma relation mode, so migration SQL adds indexed identity without a
  physical foreign key.
- Allocation ownership must agree across
  `StockAllocation -> LineItemComponents -> LineItem.saleId` and
  `StockAllocation -> OrderDelivery.salesOrderId`; reconciliation reports any
  cross-sale binding.
- `OrderItemDelivery.orderItemId` provides the dispatch quantity used to scope
  its inventory component requirement. Multiple active dispatches never share
  the same bound allocation row.


## Purpose
Tracks important cross-model relationships and ownership patterns.

## Sales Workflow Cancellation (2026-08-06)

- `SalesOrders.workflowCancellations` owns the immutable cancellation attempts
  for that sale; `SalesWorkflowCancellation.salesOrderId` identifies the
  affected order.
- `Users.performedSalesWorkflowCancellations` identifies the authenticated
  employee actor through `performedByUserId`.
- The schema uses `relationMode = "prisma"`, so the generated migration creates
  indexed relation columns without physical foreign keys.
- Related dispatch, packing, production, review, payroll, payment-review, and
  readiness-override ids are captured in the result JSON and Sales History
  event rather than mutable foreign-key collections.

## Sales Order Adjustments (2026-08-04)

- `SalesOrders.adjustments` owns many `SalesOrderAdjustment` revisions.
- An adjustment owns its immutable `lines` and one or more approval attempts;
  cascade behavior is represented in Prisma while the project continues to use
  `relationMode = "prisma"`.
- `SalesOrderAdjustmentLine.salesOrderItemId` optionally identifies the
  original `SalesOrderItems` row. Release-one proposal creation requires this
  identity for every changed line.
- `walletTransactionId` and `refundSalesPaymentId` point to the compatibility
  wallet/payment records created by application. They remain nullable until a
  reduction produces an actual overpayment.
- Requested/submitted/applied actor IDs preserve employee evidence without
  making the customer approval token an authenticated employee identity.

## Sales Form Preference (2026-07-30)

- `Users.salesFormPreference` is an optional one-to-one relation keyed by
  `SalesFormPreference.userId`.
- Prisma models the relation with cascading delete semantics; this repository's
  `relationMode = "prisma"` means the database does not enforce a physical
  foreign key.
- Preference analytics join the user-owned setting with existing `PageView` and
  `Event` ledgers; those ledgers remain independent append-only evidence.

## Current Notes
- `InboundShipment` optionally belongs to `Supplier`. Its shipment items and
  linked `InboundDemand` rows remain valid when `supplierId=null`; assigning a
  supplier later enriches the inbound header without changing demand ownership.
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
  - `OrderDelivery.meta.dispatchCompletion` is the resumable mobile proof
    staging record; completed proof paths are also copied into the canonical
    completion `NotePad` tags keyed by `deliveryId`.
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
- Contractor accounting relationships:
  - `ContractorLedgerEntry.reversalOfId` is a unique self-relation. One original
    entry can have at most one reversal, and the reversal remains a new
    immutable row.
  - Ledger `contractorId`, `jobId`, `paymentId`, `paymentAdjustmentId`, and
    `createdById` are indexed logical references to legacy operational records.
    Source deletion is not allowed to erase journal evidence.
  - `ContractorAccountingPeriod` owns many
    `ContractorAccountingPeriodEvent` rows and optional
    `ContractorReconciliationRun` rows.
  - `ContractorReconciliationRun` owns its typed
    `ContractorReconciliationIssue` evidence.
  - `ContractorAccountingReportSchedule` owns generated
    `ContractorAccountingReportRun` rows; unscheduled report runs retain a null
    schedule reference.
  - `ContractorTaxProfile.contractorId` is unique and logically references the
    contractor user. Optional W-9 `documentId` is a logical document-platform
    reference and is permission-checked by the application.
  - `ContractorPayoutRun.contractorId` logically references the contractor user;
    `paymentId` is populated only after the run is handed to the existing
    Payment Portal and completed.
  - `ContractorAccountingAlertRule` owns many deduplicated
    `ContractorAccountingAlertEvent` rows. Optional contractor scope is a
    logical user reference; event evidence remains durable if operational data
    later changes.

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
- Commerce Collection 1:N Storefront Shipping Quote. Each quote belongs to one
  immutable Storefront Shipping Policy version and is uniquely revisioned
  within its collection.
- Storefront Checkout optionally has one unique Storefront Shipping Quote; the
  quote may exist before checkout, while checkout linkage identifies the quote
  accepted for that order snapshot.
- Storefront Page 1:N Storefront Section.
- User/customer ownership is stored through server-derived user IDs without
  exposing caller-controlled ownership mutations.

### Storefront promotion targets (2026-07-24)

- Storefront Promotion N:M Storefront Category through
  `StorefrontPromotionCategory`.
- Storefront Promotion N:M Storefront Offer through
  `StorefrontPromotionOffer`.
- Storefront Promotion N:M Customers through
  `StorefrontPromotionCustomer`.
- Storefront Promotion N:M CustomerTypes through
  `StorefrontPromotionCustomerProfile`.
- Category and offer target rows cascade with their storefront presentation
  parent; customer/profile target rows cascade with their canonical customer
  records.
- The selected storefront default profile is a validated logical reference in
  `Settings.meta`, so an unavailable profile fails safe to canonical pricing
  and produces an admin warning.

## Storefront custom millwork inquiry links (2026-07-22)

- `StorefrontInquiryActivity.inquiryId -> StorefrontInquiry.id` is a cascading
  Prisma relation.
- `StorefrontInquiry.customerId -> Customers.id` and
  `StorefrontInquiry.salesQuoteId -> SalesOrders.id` are application-enforced
  links because the legacy customer/Sales tables do not expose compatible
  relation ownership in this bounded schema.
- `StoredDocument.ownerType/ownerId` polymorphically associates private files to
  `StorefrontInquiry.id`; every read repeats both values.

## Shared document caller links (2026-07-23)

- `UserDocuments.meta.storedDocumentId` manually points to
  `StoredDocument.id`. New writes validate `ownerType = "user"` and
  `ownerId = UserDocuments.userId`, then derive `UserDocuments.url` from the
  canonical record.
- `OrderDelivery.meta.dispatchCompletion.signatureDocumentId` and each
  attachment `documentId` manually point to dispatch-owned `StoredDocument`
  rows. Compatibility signature/attachment pathnames remain in the same
  metadata and completion note payload.
- Packing signatures use polymorphic dispatch ownership.
  `OrderDelivery.meta.packingSignoff.documentId` manually points to the staged
  canonical record; `domain_completed` proves the business transaction
  committed, and current-document promotion may then be reconciled safely.
- Browser-staged user attachments move to `ownerType = "note"` and
  `ownerId = NotePad.id` in the same transaction that persists a generic or
  inbound note, preventing later generic staged-file deletion.
- Inbox activity attachments move to `ownerType = "notification_activity"`;
  `ownerId` uses the created activity id when available, with the server claim
  id as the durable fallback for activity handlers that emit no activity row.
- `SalesDocumentSnapshot.storedDocumentId` remains the generated Sales PDF
  lifecycle link.

## Production readiness override links (2026-07-27)

- `SalesOrders` has at most one `SalesProductionReadinessOverride`.
- `SalesProductionReadinessOverride.confirmedByUserId -> Users.id` uses the
  `productionReadinessOverridesConfirmed` relation.
- `SalesProductionReadinessOverride.revokedByUserId -> Users.id` uses the
  `productionReadinessOverridesRevoked` relation.
- `SalesHistory.salesId` stores append-only confirmation, successful-use, and
  revocation evidence for the same order.

## Production submission material review links (2026-07-30)

- `SalesOrders` 1:N `SalesProductionSubmissionMaterialReview`.
- `SalesProductionSubmissionMaterialReview` 1:N
  `OrderProductionSubmissions`; one review owns the submitted batch.
- `submittedById -> Users.id` records the authenticated worker and
  `reviewedById -> Users.id` records the deciding administrator.
- Approval payroll remains one-to-one through the existing unique
  `Payroll.productionSubmissionId` relation.

## Proposed multi-tenant SaaS relationships (2026-08-08)

Planning only; no schema relationship changed yet.

- `Tenant 1:N Organization`: offices are operational partitions inside the
  independent customer company.
- `Users N:M Tenant` through `TenantMembership`; membership owns tenant role,
  status, and default office.
- `Tenant 1:N TenantDomain`, `TenantBrandRevision`, `TenantSubscription`,
  `TenantEntitlement`, `TenantProviderConnection`, and `TenantSupportAccess`.
- `PlanVersion N:M FeatureDefinition` through `PlanFeature`; the tenant's local
  entitlement projection is derived from subscription plus audited overrides.
- `SalesConfigurationTemplate 1:N TemplateRevision`; a
  `TenantSalesConfiguration` pins one revision and owns tenant overlay revisions.
- `Tenant 1:N TenantPriceBook`; price entries reference stable shared template
  UIDs or tenant custom-component IDs. GND price rows are not template parents.
- `Tenant 1:N` each tenant-owned business root: people/memberships, customers,
  sales, inventory, production/dispatch, finance/payment, documents/email,
  dealership/storefront, jobs/events/exports/usage.
- Children normally inherit tenant through their canonical parent. Direct
  `tenantId` is added when independent lookup, global provider callbacks,
  polymorphic ownership, partitioning, RLS, or safe lifecycle requires it.
- Platform subscription/payment entities and operational Sales/Square payment
  entities have no cross-ledger ownership relationship.

## Special Order acknowledgment links (2026-08-13)

- `SalesOrders 1:N SpecialOrderApprovalRequest`; every request binds one
  Approval Revision and one `SpecialOrderPolicyVersion`.
- `SalesOrders 1:N SpecialOrderApprovalEvidence`; every evidence row belongs to
  one request and retains its policy/order/acknowledgment snapshots.
- `SalesOrders.currentSpecialOrderRequestId` and
  `currentSpecialOrderApprovalId` are nullable current-state pointers. Current
  approval still requires a matching, non-superseded approved evidence row for
  the order's current revision.
- `SpecialOrderApprovalEvidence.signatureDocumentId -> StoredDocument.id`
  references the encrypted private signature image. Operational documents do
  not follow or expose this relationship.
- `SalesOrders 1:N SpecialOrderNotificationDelivery` preserves retryable
  customer, staff-email, and in-app notification outcomes for each lifecycle
  event.
- `SalesOrders 1:N SpecialOrderOperationEvent` preserves warning/block rollout
  telemetry independently of the bounded Sales Activity presentation.

## Canonical Sales Form graph (2026-08-18)

- `SalesOrders 1:N SalesOrderItems`; each active item owns its active
  `DykeStepForm` and `DykeSalesShelfItem` rows.
- A door-producing `SalesOrderItems` row owns at most one active
  `HousePackageTools` record; that HPT owns active `DykeSalesDoors` rows.
- Within one HPT, component plus normalized dimension identifies one active door
  row. `DykeSalesDoors.activeIdentity` physically enforces that relationship for
  active rows. Historical soft-deleted siblings clear the key, remain audit
  history, and are never merged into active quantity.
- `SalesOrders.meta.newSalesForm` has no authority relationship to commercial
  rows; it carries only revision/editor metadata.

## Square Sales Refund links (2026-08-21)

- `SquareTenderPayment 1:N SalesSquareRefund`; each refund targets exactly one
  verified Square tender.
- `SalesSquareRefund 1:N SalesSquareRefundAllocation`; each allocation names an
  eligible `SalesOrders.id` and may link its source and applied compatibility
  `SalesPayments` rows by stored ids.
- `SalesSquareRefund 1:N SalesSquareRefundTransition`; transitions retain the
  originating actor/event and an immutable state snapshot.
- `SquareTenderPayment.legacySquarePaymentId` provides the bounded compatibility
  bridge to existing `SquarePayments` and `SquarePaymentOrders` rows without
  changing the overloaded legacy identifier's meaning.
- `SquareRefundWebhookEvent.providerRefundId` is an indexed provider reference,
  not a cascading ownership link; processing resolves/upserts the canonical
  refund independently so duplicate and out-of-order delivery is safe.

## Sales Order list projection link (2026-08-21)

- `SalesOrders 1:0..1 SalesOrderListProjection`; the projection uses
  `salesOrderId` as a unique foreign key and cascades only when the authoritative
  order is physically deleted.
- Customer, payment, note, inventory/inbound, production, dispatch, and Special
  Order entities do not point to the projection. Trigger reloads those canonical
  relationships when rebuilding the list row.
- Reads verify the projection revision against `SalesOrders.updatedAt` (falling
  back to `createdAt` for legacy rows) before returning projected data.
