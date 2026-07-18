# Database Schema

## Purpose
Tracks important schema-level entities and ownership boundaries.

## Current Notes
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
  - `MasterPasswordLoginAudit` stores each ENV master-password login event for the web/mobile auth flow
  - rows snapshot target user id/name/email, app surface, platform, IP address, optional two-letter ISO country code, browser, user agent, safe session id, login timestamp, and clear/archive metadata
  - clear actions set `clearedAt` and `clearedBySuperAdminId`; records are hidden from the default admin view instead of hard-deleted

## TODO
- Document the canonical schema modules and the most important tables/models.
- Summarize recent additions such as payment, resolution, and document-platform entities.
