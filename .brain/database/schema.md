# Database Schema

## Purpose
Tracks important schema-level entities and ownership boundaries.

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
- Legacy Dyke authoring is now starting to move behind the inventory domain/API boundary:
  - `@gnd/inventory` now owns the active custom-component save/update and pricing-update services
  - inventories tRPC now exposes Dyke authoring mutations (`saveDykeStepComponent`, `updateDykeComponentPricing`) instead of relying on `apps/www` server actions for the active custom-component flow
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
