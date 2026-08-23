# Database Schema

## Material And Production Sales Handoff Action Epochs (2026-08-23)

- `SalesHandoffActionEpoch` is an additive independent operational ledger for
  one Sales order/action epoch. It stores scalar Sales order/order-number,
  action type, epoch number, responsible representative, policy/evidence
  revisions, uncovered quantity, qualification/open/resolution/reconciliation
  timestamps, authenticated actor ids, resolution reason, reopen predecessor,
  source, and created/updated timestamps.
- Nullable unique `openKey` permits one open epoch per order/action type while
  retaining resolved history. The order/action/epoch compound uniqueness and
  representative/admin/order/escalation/evidence indexes support idempotent
  writes, bounded queues, audit, and later escalation without sharing Packing
  schema ownership.
- Ticket 03 reuses the same model with `actionType=PRODUCTION` and
  `openKey=PRODUCTION:<salesOrderId>`. Order and production revisions remain in
  `evidenceRevision`; no Production-specific table or column was added.


## Durable Dispatch Exceptions (2026-08-18)

- `DispatchException` is the durable operational issue record for one
  `OrderDelivery`. It stores a bounded reason code, notes, open/resolved state,
  resolution note, reporter/resolver ids, timestamps, request id, and optional
  metadata without overloading trip status or cancellation.
- `requestId` is unique for retry-safe mobile reporting. Active issue reads are
  indexed by delivery/status/deleted state and by status/reported time.
- `tripAction` currently persists `keep_assigned`. Schedule and cancellation
  changes continue through their canonical guarded dispatch commands.
- `OrderDelivery.exceptions` is the one-to-many Prisma relation used by list
  risk projection, detail history, driver workload, and manager resolution.

## Dispatch-Bound Stock Allocation (2026-08-06)

- `StockAllocation.orderDeliveryId` is the nullable canonical binding from an
  exact stock allocation quantity to one physical dispatch.
- The binding is additive so existing unbound approved allocations and legacy
  dispatches remain valid during migration.
- Indexes support dispatch reconciliation and allocation selection by delivery,
  component, status, and active/deleted state.
- A dispatch requirement is derived from its `OrderItemDelivery` quantity and
  the inventory line/component BOM; split deliveries therefore own a
  proportional component quantity rather than the complete sales-line demand.


## Purpose
Tracks important schema-level entities and ownership boundaries.

## Sales Workflow Cancellation Ledger (2026-08-06)

- `SalesWorkflowCancellation` is the immutable, idempotent evidence row for a
  production- or fulfillment-layer cancellation.
- `requestId` is unique. Each row stores the sale, action, mandatory reason,
  preview revision, actor, before-state snapshot, exact result snapshot, and
  creation time.
- The ledger does not replace `SalesHistory`; both rows are written in the same
  serializable transaction as the reversible domain changes and sales-control
  rebuild.
- Physical inbound, stock, payroll payout, delivery proof, and manual
  production evidence are never copied into mutable rollback tables.

## Sales Order Adjustments (2026-08-04)

- `SalesOrderAdjustment` stores the immutable before/proposed sales snapshots,
  commitment and settlement snapshots, source version/hash, direction,
  lifecycle, actor/timestamp evidence, exact money outcomes, idempotency key,
  wallet/payment result references, and failure diagnostics.
- `SalesOrderAdjustmentLine` stores stable sale-item identity and immutable
  previous/proposed quantities and line totals for each changed persisted line.
- `SalesOrderAdjustmentApproval` stores one expiring decision attempt. Only the
  SHA-256 token hash is persisted; response evidence and timestamps are
  append-only decision evidence.
- Money snapshots use `Decimal(12,2)`. Quantity snapshots use `Decimal(12,3)`.
  Enums make adjustment, approval, and direction lifecycle values explicit.

## Sales Form Preference (2026-07-30)

- `SalesFormPreference` is a one-row-per-user choice for the default sales form.
- `SalesFormPreferenceMode` is `NEW | LEGACY`.
- The row stores `source`, optional `promptedAt`, and created/updated timestamps;
  `userId` is both the primary key and the Prisma relation key to `Users.id`.
  This schema uses `relationMode = "prisma"`, so the database migration does not
  create a physical foreign key.
- Form-open analytics reuse `PageView`; preference decisions reuse `Event`.
  Neither ledger receives customer or sales-document identifiers from this
  feature.

## Current Notes
- Dealership program expansion adds `Customers.officeVisibility` with
  `DealerCustomerOfficeVisibility.PRIVATE | SHARED`; the database default is
  `PRIVATE`, so existing and new dealer-owned customers remain outside the
  office directory unless explicitly shared.
- Recruitment data is modeled through `DealerRecruitmentCampaign`, its profile
  and customer target tables, hashed/expiring `DealerRecruitmentInvitation`
  rows, and reviewed `DealerProgramApplication` rows. Campaigns store structured
  banner content/lifecycle/dates, invitations store delivery/open evidence, and
  applications store decision and suppression-reset evidence.
- `DealerRecruitmentInvitation.source` distinguishes
  `SALES_EMAIL_BANNER | MANUAL_CUSTOMER`; `deliveryStatus` distinguishes
  `PENDING | SENT | FAILED | SKIPPED`. The row also stores the Super Admin
  sender, provider attempt/message/status, sanitized failure, revocation, and
  supersession timestamps while continuing to store only the SHA-256 token
  hash.
- `DealerRecruitmentCustomerState` is keyed by office customer and stores the
  latest invitation pointer plus a short-lived unique send lease used to
  serialize manual invitations and recover stale attempts.
- Dealer billing ZIP and `brandingVersion` use the existing dealer settings
  metadata. Every branding settings save increments the version.
- Primary schema work appears to live in `packages/db`.
- Active schema-heavy domains include sales, payment-system, resolution-system, and document-platform foundations.
- Inventory demand is now being shaped around three layers in `packages/db/src/schema/inventory.prisma`:
  - `LineItemComponents` as the gross demand row created from sales/inventory sync
  - `StockAllocation` as stock-side reservation/allocation against that demand
  - `InboundDemand` as the shortage/replenishment row that should link into `InboundShipmentItem` and later post through `StockMovement`
- `LinePricing.costPrice`, `LinePricing.salesPrice`, `LinePricing.unitCostPrice`, and `LinePricing.unitSalesPrice` are decimal-capable `Float?` fields. These snapshots can store cents from inventory variant pricing, supplier variant pricing, HPT door unit prices, and sales-form fallback pricing.
- The first shared inbound service now exists in `packages/inventory/src/application/inbound/inbound-demand.ts`:
  - `createInboundShipmentFromDemands(...)` converts `InboundDemand` shortages into `InboundShipment` + `InboundShipmentItem`
  - `receiveInboundShipment(...)` now splits `qtyGood` vs `qtyIssue`, posts only good qty into `InventoryStock`, writes `StockMovement`, and rolls progress back up into `LineItemComponents`
- Inventory receiving/issue workflow now has an explicit discrepancy model:
  - `InboundShipmentItem.qtyGood`
  - `InboundShipmentItem.qtyIssue`
  - `InboundShipmentItemIssue` for damaged/missing/wrong-item/quality-hold style discrepancies and their resolution lifecycle
- Stock allocation now distinguishes review-stage suggestions from committed reservations:
  - `StockAllocation.status = pending_review` means suggested, not yet committed
  - committed stock should be derived from approved/picked/consumed allocation states, not from pending review rows
- Receipt snaps now reuse the shared document platform instead of a bespoke inbound file table:
  - `StoredDocument.ownerType = "inventory_inbound_shipment"`
  - `StoredDocument.kind = "inbound_receipt"`
- AI receipt parsing now persists in inventory schema through:
  - `InboundShipmentExtraction`
  - `InboundShipmentExtractionLine`
  These hold extraction status, invoice metadata, parsed lines, and inventory match state before the user applies results to inbound items.
- Receiving work should extend the existing inventory schema (`InboundShipment`, `InboundShipmentItem`, `InventoryStock`, `StockMovement`) instead of creating a separate supplier-receipt system outside inventory.
- `InboundShipment.supplierId` is nullable. A shipment can begin from its
  `pending` or `in_progress` status and linked demand alone; supplier,
  `expectedAt`, and PO/reference may be assigned later. Receiving continues to
  write nullable supplier provenance into `InventoryStock`.
- Legacy Dyke authoring is now starting to move behind the inventory domain/API boundary:
  - `@gnd/inventory` now owns the active custom-component save/update and pricing-update services
  - inventories tRPC now exposes Dyke authoring mutations (`saveDykeStepComponent`, `updateDykeComponentPricing`) instead of relying on `apps/dashboard` server actions for the active custom-component flow
  - targeted Dyke-step structural sync now has a dedicated async job path via `sync-dyke-step-to-inventory`
  - current drift tooling is structural only: it reports Dyke component UIDs missing inventory/variant rows; pricing drift remains undecided until pricing semantics are finalized
- Supplier pricing migration now starts from a split model instead of treating suppliers as inventory:
  - `Supplier` remains the vendor entity and now carries the legacy Dyke supplier UID bridge
  - `SupplierVariant` is the inventory-native join between supplier and inventory variant for supplier SKU, cost, sales price, min order qty, lead time, preferred flag, and active state
  - current door pricing still resolves from legacy dependency buckets; the safe bridge is to keep `Supplier.uid` aligned with the old Dyke supplier UID while introducing `SupplierVariant` as the new canonical inventory-side supplier pricing record
- Sales dispatch / pickup schema notes:
  - pickup packing now uses normal `OrderDelivery.status` transitions (`queue`, `completed`, `cancelled`) instead of requiring a dedicated live `packing queue` status
  - membership/history for the packing-list workflow is recorded through the `sales-packing-list` notification/activity channel
  - pickup packing signatures remain note-backed rather than adding a new `OrderDelivery` signature column; the active lookup still resolves by `deliveryId` tags from `NotePad`
  - mobile proof completion stages its request id, `uploading|completed` state,
    deterministic signature/attachment paths, and timestamps in
    `OrderDelivery.meta.dispatchCompletion`; this is a JSON metadata contract,
    not a new column or migration
- Inventory shipment source-of-truth decision:
  - `OrderDelivery` / `OrderItemDelivery` are canonical shipment records for the current inventory cutover phase; see `brain/decisions/ADR-008-inventory-shipment-record-source.md`
  - inventory-origin shipments are distinguished by metadata such as `meta.source = "inventory_partial_shipment"` or `meta.source = "inventory_dispatch_mode"`
  - `OrderItemDelivery.meta.lineItemId` links legacy shipment lines back to inventory `LineItem` when inventory mode writes the delivery
  - `StockAllocation.status` remains the inventory reservation/pick/consume/release truth and should be reconciled against completed shipment lines
  - do not add `SalesShipment` / `SalesShipmentLine` without a new ADR proving existing delivery tables plus metadata cannot meet the requirement
- Web bug reporting schema now lives in `packages/db/src/schema/bug-reports.prisma`:
  - `BugReportStatus` enum values are `NEW`, `IN_REVIEW`, `IN_PROGRESS`, `NEEDS_INFO`, `FIXED`, and `CLOSED`
  - `BugReportCaptureType` enum values are `VIDEO` and `SCREENSHOT`
  - `BugReportTranscriptionStatus` enum values are `NOT_REQUESTED`, `PENDING`, `COMPLETED`, and `FAILED`
  - `BugReport` stores submitter id, status, capture type, optional description, current page URL, user agent, source (`web` for v1), linked primary evidence document id, duration, microphone metadata, optional external issue provider/key/URL/status/error/timestamp, status updater, timestamps, and soft-delete timestamp
  - `BugReportFollowUp` stores owner/admin thread messages for a report plus optional voice-note document id, audio duration, transcription status/text/provider, timestamps, and soft-delete timestamp
  - primary evidence reuses `StoredDocument` with `kind = "bug_report_recording"` for videos or `kind = "bug_report_screenshot"` for screenshots; voice notes use `kind = "bug_report_voice_note"`. All use `ownerType = "bug_report"`, `provider = "vercel-blob"`, and `visibility = "private"`
- Sales email delivery ledger schema now lives in `packages/db/src/schema/sales-email-attempts.prisma`:
  - `SalesEmailAttemptStatus` enum values are `QUEUED`, `SENDING`, `SENT`, `FAILED`, and `SKIPPED`
  - `SalesEmailAttempt` stores sales document email attempts for standard quote/order emails and custom composed sales document emails
  - each row snapshots sender, attached sales rep, recipient/customer, document type, email kind, subject/message, related sales ids/order numbers, provider name, provider message/status, Trigger task run id when known, failure details, timestamps, retry metadata, and soft-delete timestamp
  - resend attempts are stored as new rows linked to the failed/skipped source attempt through `originalAttemptId`
  - WhatsApp and SMS sales document results do not create email-attempt rows;
    their requested channels, link kinds, and immediate provider outcomes use
    the existing notification activity/tag records, while targets/clicks use
    existing `ShortLink` rows
- Sales payment review fields now live on `SalesPayments` in `packages/db/src/schema/sales.wallet.prisma`:
  - `origin` records whether the payment was received `online` or in the `office`; it has no database default and must be set by payment write paths when known.
  - `reviewStatus` records whether the successful payment still `needs_review` or has been `reviewed`; it has no database default so payments only enter review when application code explicitly stamps them.
  - `reviewedAt`, `reviewedById`, `reviewMethod`, `reviewedByAction`, and `reviewNote` store manual/auto review evidence.
  - Queue indexes are `orderId, reviewStatus, createdAt` and `reviewStatus, createdAt`.
  - Existing queued rows were cleared to `reviewStatus = NULL` on rollout so the clean-payment queue starts from newly recorded payments.
- Generic background task diagnostics schema now lives in `packages/db/src/schema/task-run-diagnostics.prisma`:
  - `TaskRunDiagnosticStatus` enum values are `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELED`, `STALE`, and `START_FAILED`
  - `TaskRunDiagnostic` stores Trigger run diagnostics for user-triggered background tasks, including optional `runId`, task name/family/title/description/source/environment, actor snapshot, entity snapshot, safe user message, internal error/error name, bounded output summary, bounded metadata, started/finished/synced/reviewed timestamps, soft-delete timestamp, and reviewer relation
  - `runId` is unique when present so terminal finalization can upsert the same run row; start failures can be stored without a run id
  - metadata is intentionally bounded and lightweight; full task payloads and public access tokens are not stored
  - `SalesEmailAttempt` remains the domain-specific email delivery ledger and should be read alongside generic task diagnostics when diagnosing sales document email tasks
- Master password login audit schema now lives in `packages/db/src/schema/master-password-login-audits.prisma`:
  - `MasterPasswordLoginPlatform` enum values are `WEBSITE`, `MOBILE`, and `UNKNOWN`
  - `MasterPasswordUsageType` enum values are `LOGIN` and `SALES_REP_TRANSFER`; existing and newly omitted values default to `LOGIN`
  - `MasterPasswordLoginAudit` stores ENV master-password login and sales-rep transfer usage without storing a password or hash
  - rows snapshot target user id/name/email, app surface, platform, IP address, optional two-letter ISO country code, browser, user agent, safe session/request id, timestamp, optional order/quote resource type and number, and clear/archive metadata
  - usage/date and resource type/id indexes support the Super Admin usage filter and sale-reference search
  - clear actions set `clearedAt` and `clearedBySuperAdminId`; records are hidden from the default admin view instead of hard-deleted
- Sales shelf order pricing now stores
  `DykeSalesShelfItem.unitPrice` and `DykeSalesShelfItem.totalPrice` as nullable
  `Decimal(12,2)` values. Application/query boundaries convert those Prisma
  Decimal values to the numeric sales domain representation before returning
  data to web/mobile clients or inventory synchronization.
- Contractor payout money is modeled as fixed precision:
  - `JobPayments.amount`, `JobPayments.charges`, and `JobPayments.subTotal` are
    `Decimal(12,2)`.
  - `JobPaymentAdjustments.amount` is `Decimal(12,2)`.
  - `Jobs.amount` remains the legacy `Float`; contractor accounting converts it
    to integer cents before arithmetic.
  - `ContractorLedgerEntry` is the immutable accounting journal. It stores
    source magnitude and signed `liabilityDelta` as `Decimal(18,2)`, effective
    and posting timestamps, unique idempotency `sourceKey`, logical source
    references, optional evidence/meta, and a unique self-linked reversal.
  - `ContractorAccountingPeriod` stores an inclusive-business-period boundary
    as `[from, toExclusive)`, timezone, open/closed state, closing balance,
    canonical JSON snapshot, SHA-256 hash, and close/reopen audit fields.
    `ContractorAccountingPeriodEvent` preserves append-only close/reopen events.
  - `ContractorReconciliationRun` stores legacy-versus-ledger totals and
    execution state. `ContractorReconciliationIssue` stores typed discrepancies,
    amounts, evidence, review state, reviewer, and resolution note.
  - `ContractorAccountingReportSchedule` stores report kind/format, validated
    cron/timezone, filter and recipient snapshots, next/last run state, and
    creator. `ContractorAccountingReportRun` stores every requested artifact,
    status, filters/totals, URL, content hash, requester, and timestamps.
  - `ContractorTaxProfile` stores one contractor's legal/tax classification,
    W-9 lifecycle, verification evidence, TIN last four, optional document
    reference, and notes. Full tax identifiers are not stored.
  - `ContractorPayoutRun` stores a contractor, eligible job IDs, active filter
    snapshot, proposed Decimal amount, canonical accounting snapshot/hash,
    reviewed/handoff/completion/cancellation audit fields, and an optional
    reference to the payment ultimately created in Payment Portal.
  - `ContractorAccountingAlertRule` stores enabled alert criteria for balance,
    liability age, reconciliation, W-9, or period close plus scope, timezone,
    recipients, and last evaluation.
  - `ContractorAccountingAlertEvent` stores one fingerprint-deduplicated alert
    occurrence, evidence, lifecycle state, acknowledgement/resolution evidence,
    and durable per-recipient email delivery/attempt/error state.
  - Decimal payout columns and all eight contractor-accounting tables are
    synchronized to local development and production; both final schema diffs
    are empty.
  - The three workspace tables and alert-delivery columns are applied locally.
    Production deployment is intentionally tracked separately from the verified
    immutable-ledger cutover.

## TODO
- Document the canonical schema modules and the most important tables/models.
- Summarize recent additions such as payment, resolution, and document-platform entities.
## Storefront commerce overlay (2026-07-20)

- `StorefrontCategory`: published presentation for a canonical Dyke Item Type
  root.
- `StorefrontOffer`: published presentation for one canonical Dyke root
  component and configuration route.
- `StorefrontComponent`, `StorefrontStepPolicy`, and
  `StorefrontOfferComponentPolicy`: public availability, presentation,
  visibility, ordering, and valid-default overlays.
- `StorefrontCommerceCollection` and `StorefrontCommerceLine`: signed-guest or
  customer-owned carts/wishlists with normalized canonical configuration and
  server pricing snapshots.
- `StorefrontCheckout`: idempotent checkout/payment/order transition ledger.
- `StorefrontShippingPolicy`: immutable versioned formula, origin, confidence
  gates, Door size profiles, Moulding pounds-per-LF profiles, Shelf category
  weights, and product overrides. Only one version is active at a time.
- `StorefrontShippingQuote`: revisioned route, product-weight, calculation,
  blocker, approval, and office-review evidence. Checkout has an optional unique
  link to its accepted quote.
- `StorefrontPage` and `StorefrontSection`: structured merchandising content.
- `StorefrontInquiry`, `StorefrontAuditEvent`, and
  `StorefrontPasswordResetToken`: durable intake, audit, and auth-recovery
  records.
- `SalesOrders.salesChannel`: nullable origin discriminator; storefront
  checkout sets `"storefront"`.

### Storefront profile pricing and promotions (2026-07-24)

- `StorefrontPromotion` stores internal/public campaign identity, badge/banner
  copy, percentage, priority, audience/scope modes, publication state,
  inclusive start, exclusive optional end, and actor/audit timestamps.
- `StorefrontPromotionCategory` and `StorefrontPromotionOffer` normalize
  product targeting.
- `StorefrontPromotionCustomer` and
  `StorefrontPromotionCustomerProfile` normalize shopper targeting.
- The storefront default `CustomerTypes` profile ID is stored in the existing
  `Settings.meta.defaultCustomerProfileId`; no parallel profile table or
  pricing column is introduced.
- `StorefrontCommerceLine.pricingSnapshot` now records private resolved
  profile/campaign/list/final evidence without changing the column shape.
- `SalesOrders.meta.storefront.pricing` carries order-level pricing evidence;
  campaign discounts are also persisted as canonical fixed `Discount` extra
  costs.

### Storefront custom millwork inquiries (2026-07-22)

- `StorefrontInquiry.reference` is the unique customer-facing `CMW-*` or
  `MSG-*` reference.
- `projectBrief` stores the validated structured intake alongside the existing
  display/search fields. `submittedAt` and `lastActivityAt` separate abandoned
  drafts from live office work.
- `authorizedUploadCount` is atomically incremented when the private upload
  endpoint issues each file authorization. Only an open `DRAFT` below five
  authorizations can receive another upload capability.
- `customerId` and unique `salesQuoteId` link an approved brief into the
  canonical customer/Sales records. `quoteConversionStartedAt` and
  `quoteConversionById` provide a short conversion lease; Sales origin metadata
  is the recovery key if a process stops after quote persistence but before the
  inquiry link commits.
- `StorefrontInquiryActivity` is an append-only timeline for notes and workflow
  outcomes; security-sensitive mutations are also written to
  `StorefrontAuditEvent`.
- Private reference files are registered in `StoredDocument` with
  `ownerType = storefront_inquiry`, `visibility = private`, and the inquiry ID
  as `ownerId`.

### Shared document caller conventions (2026-07-23)

- No Prisma schema or migration changed for this caller cutover.
- Employee gallery assets use `StoredDocument.ownerType = "user"`,
  `ownerId = Users.id`, and `kind = "attachment"`.
- Dispatch completion photos use `ownerType = "dispatch"` and
  `kind = "dispatch_image"`; completion and packing signatures use
  `kind = "signature"`.
- Browser-staged inbound/dispatch attachments are non-current, user-owned
  `attachment` records until their consuming note persists compatibility path
  metadata. That note transaction changes ownership to `ownerType = "note"`,
  `ownerId = NotePad.id`, `sourceType = "note_attachment"`.
- Inbox activities claim staged rows as
  `sourceType = "notification_attachment_pending"` / `status = "processing"`
  before activity creation, then finalize them under
  `ownerType = "notification_activity"` and
  `sourceType = "notification_attachment"`. `sourceId` holds the unique pending
  claim id for fencing; `updatedAt` supplies a 15-minute stale-claim lease.
- Failed staged/finalization attempts use `status = "failed"` and never become
  current. User-cancelled staged uploads use `status = "deleted"` plus
  `deletedAt`.
- Browser staged deletion temporarily uses
  `ownerType = "user_delete_claim"` / `status = "deleting"` with the claim id
  in `ownerId`; success restores user ownership while tombstoning, provider
  failure restores ready staging, and one-hour-old claims are recoverable.
- `OrderDelivery.meta.packingSignoff` is the compatibility recovery checkpoint
  for packing signatures. It retains request ownership, lease timestamps,
  canonical `documentId`, and `processing` / `uploaded` /
  `domain_completed` / `completed` / `failed` status without a schema change.

## Production readiness override (2026-07-27)

- `SalesProductionReadinessOverride` stores one order-level readiness
  confirmation for each `SalesOrders` row.
- `status` is `ACTIVE` or `REVOKED`; `revision` is the SHA-256 fingerprint of
  the confirmed full-order inventory evidence and `snapshot` preserves the
  reviewed summary and blockers.
- Confirm/revoke actor and timestamp fields retain durable audit context. The
  record never changes inbound demand, allocation, receipt, or stock truth.

## Production submission material review (2026-07-30)

- `SalesProductionSubmissionMaterialReview` stores one idempotent production
  submission batch with order, submitting worker, optional reviewer, status,
  nullable unresolved-material reason, assignment scope, material snapshot and
  revision, decision note, resolution evidence, and decision timestamps.
- `OrderProductionSubmissions.materialReviewId` links every new produceable
  submission to its automatically approved or pending batch. Legacy null links
  remain finalized for backward compatibility.
- `idempotencyKey` is unique, and each
  `(materialReviewId, assignmentId)` submission membership is unique to fence
  concurrent retries. Status, order/time, submitter/time, and review-material
  linkage are indexed for bounded queue and projection reads.

## Inventory fulfillment queue indexes (2026-08-04)

- `SalesOrders` has compound queue indexes over
  `(deletedAt, status, prodStatus, id)` and `(deletedAt, deliveryOption, id)`.
- `LineItem` has a fulfillment scan index over
  `(saleId, deletedAt, lineItemType, id)`.
- `LineItemComponents` has a fulfillment-state index over
  `(status, lineItemId, inventoryVariantId)`.
- `StockAllocation` and `InboundDemand` have component/status/deletion compound
  indexes for fulfillment reconciliation scans.
- No relationship or canonical ownership changed; these are additive read-path
  indexes supporting cursor queues and serializable command lookups.

## Proposed multi-tenant SaaS schema direction (2026-08-08)

This is a planning contract only; none of these models/columns are implemented.
The canonical plan is
`.brain/plans/2026-08-08-feature-multi-tenant-saas-commercialization.md`.

- `Tenant`: independent customer company, lifecycle, legal/billing identity,
  locale/currency/time zone, retention, quota, and support state.
- `Organization.tenantId`: requires every office/location to belong to one
  tenant; Organization remains an office, not the tenant itself.
- `TenantMembership` and `TenantInvitation`: global user-to-tenant access,
  tenant role/status, default office, invitation, revocation, and timestamps.
- `TenantSupportAccess`: time-bounded platform support access with actor,
  tenant, reason, approval, expiry, and revocation audit.
- `TenantBrand` and `TenantDomain`: versioned brand/legal/document identity and
  verified subdomain/custom-hostname lifecycle.
- `FeatureDefinition` remains code-owned; `Plan`, `PlanVersion`, `PlanFeature`,
  `TenantSubscription`, `TenantEntitlement`, and `TenantFeatureOverride` persist
  commercial access, provider projection, quota, and audited grants.
- `BillingWebhookEvent`: signature-verified idempotent platform-subscription
  inbox. It must not share the operational Sales/Square payment ledger.
- `TenantProviderConnection`: encrypted/reference-only tenant merchant or other
  provider connection metadata; OAuth is preferred over raw secrets.
- `SalesConfigurationTemplate` and immutable template revisions own safe shared
  structure/compatibility identities.
- `TenantSalesConfiguration`, revisions, component overrides, custom components,
  price books, price entries, and customer profile/tax links own tenant draft,
  publication, customization, and pricing.
- Every tenant-owned root model gains required `tenantId` after additive write
  stamping and historical backfill. Child rows inherit through a canonical root
  when duplication is unnecessary, but query paths must still prove ownership.
- Business identifiers currently globally unique (for example selected emails,
  phones, slugs, order numbers, UIDs, and provider references) require an audit
  before changing to tenant-inclusive compound uniqueness.
- `StoredDocument`, Sales PDF snapshots, email attempts, public links, jobs,
  events, exports, usage, and audit require explicit tenant ownership or a
  deterministic tenant-owned parent.
- If Neon/Postgres is approved, selected high-risk tables gain row-level
  security after typed application scoping is implemented and verified.

## Special Order acknowledgment (2026-08-13)

- `SalesOrders` adds nullable declaration, lifecycle status, deterministic
  approval revision, and current request/evidence pointers. Declaration actor,
  time, and reason remain audit entries in `SalesHistory`; null declaration
  intentionally means legacy/not evaluated.
- `SpecialOrderPolicyVersion` stores immutable published policy snapshots plus
  draft/version metadata.
- `SpecialOrderApprovalRequest` stores a SHA-256 capability hash, bound order
  revision/policy version, expiry, delivery, revocation, and single-use
  consumption state. Raw public tokens are never persisted.
- `SpecialOrderApprovalEvidence` stores immutable approve/decline outcome,
  customer identity, acknowledgment and policy snapshots, order snapshot,
  request/network metadata, optional private signature document, and
  supersession audit.
- `SpecialOrderNotificationDelivery` stores one event/channel delivery result,
  retry count, last error, and payload snapshot without duplicating the domain
  outcome.
- `SpecialOrderOperationEvent` stores deduplicated warning/block telemetry by
  order revision, operation, mode, result, actor, source, and time bucket.
- Special Order signature `StoredDocument` rows use provider
  `vercel-blob-encrypted`, keep `url = null`, and record the AES-256-GCM envelope
  and Blob access mode in metadata. The logical MIME type remains `image/png`.
- New enums constrain declaration, lifecycle, request, and evidence states.

## Sales Form relational authority (2026-08-18)

- `SalesOrders`, `SalesOrderItems`, `DykeStepForm`, `HousePackageTools`,
  `DykeSalesDoors`, `DykeSalesShelfItem`, `SalesExtraCosts`, and `SalesTaxes`
  are the only commercial persistence authority.
- Historical `SalesOrders.meta.newSalesForm.lineItems`, `extraCosts`, and
  `summary` are deprecated compatibility snapshots and are ignored by canonical
  hydration. New saves do not write them.
- The active door logical key is `housePackageToolId + stepProductId + normalized
  dimension`. `DykeSalesDoors.activeIdentity` stores that key for active rows as
  a nullable unique `VarChar(191)`; soft deletion clears the key so historical
  rows remain available. Transactional validation still provides early errors.

## Square Sales Refund lifecycle (2026-08-21)

- `SquareTenderPayment` stores the verified Square `Payment.id` separately from
  legacy Square rows, link ids, provider order ids, and Terminal checkout ids.
- `SalesSquareRefund` stores one immutable refund intent with provider and local
  application states, cents-based principal/C.C.C./tip totals, reservation,
  commercial evidence, actor, persisted idempotency key, provider id, failure
  evidence, and lifecycle timestamps.
- `SalesSquareRefundAllocation` freezes the exact per-order component split and
  links original and compatibility Sales Payment projections.
- `SalesSquareRefundTransition` is append-only lifecycle evidence.
- `SquareRefundWebhookEvent` is the raw-payload, provider-event-id-deduplicated
  inbox for Square refund events.
- Unique provider payment, provider refund, and idempotency identities plus
  provider/application queue indexes enforce retry and reconciliation safety.

## Sales Order list read model (2026-08-21)

- `SalesOrderListProjection` is a non-authoritative, versioned one-row-per-order
  projection for `sales.getOrders`.
- It stores the canonical sales order id/revision, tenant and common filter/sort
  scalars, projection health timestamps/state, and a compact JSON list-row
  payload. It does not own commercial totals, payments, inventory, fulfillment,
  or customer data.
- `sourceUpdatedAt` rejects out-of-order Trigger work; `projectedAt` supports a
  bounded freshness window for related-table changes.
- Scope, sales-rep, and health indexes support list selection and operational
  reconciliation. `SalesOrders` remains the source of truth.

## Guarded packing reports (2026-08-23)

- `SalesPackingReport` binds Sales order, dispatch, Sales item, production
  submission, and the exact canonical `OrderItemDelivery` allocation row through
  required `dispatchAllocationItemId`; it also snapshots authenticated actors,
  exact quantity, evidence revision, a stable dispatch-allocation key,
  idempotency/open keys, decision, and lifecycle timestamps.
- Status/time and scope indexes support pending holds and audit reads. Nullable
  unique `openKey` permits one open report per exact dispatch allocation and is cleared
  only by a terminal decision.
- All canonical identity and actor relations use `onDelete: Restrict`, preserving
  the immutable review record; operational cancellation remains a soft state
  change rather than source deletion.

## Sales Handoff escalation (2026-08-23)

- `SalesHandoffActionEpoch` now persists nullable legacy-safe organization
  scope, immutable Material/Production deep-link targets, `escalationDueAt`, and
  `escalatedAt`. A required Restrict relation binds each epoch to `SalesOrders`.
- `SalesHandoffActionEscalationRecipient` is the durable per-epoch/per-admin
  delivery and acknowledgement ledger with a unique `(actionEpochId,
  recipientUserId)` identity plus notification-activity and recipient/ack
  indexes.
- The open organization queue and due/unresolved scan have dedicated indexes.
