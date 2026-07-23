# API Endpoints

## Purpose
Tracks notable API surfaces and where they are implemented.

## Current Notes
- Operational route boundaries (2026-07-23):
  - reviewed `dispatch`, inventory configuration, `jobs`, `community`, and
    shared `settings` mutations are protected procedures with the scoped
    permission/ownership matrix documented in
    `.brain/plans/2026-07-23-api-public-route-hardening.md`;
  - shared `settings.getJobSettings` is authenticated, while
    `settings.updateSetting` is Super Admin-only;
  - assigned dispatch start/completion/signature and contractor self-service job
    changes recheck persisted ownership before mutation.
- Sales Customer dealership invitation routes:
  - `sales.customersIndex` is now a protected query and returns a batched
    `partnership` summary per row.
  - `customers.getCustomerOverviewV2` returns the same partnership summary for
    the selected customer.
  - `dealerProgram.sendCustomerInvitation({ customerId })` is a protected,
    Super Admin-only mutation. It uses the current active in-window campaign,
    bypasses audience targeting for the explicitly selected office customer,
    acquires the customer send lease, sends the dedicated partnership email,
    and records provider acceptance/failure/supersession.
- Primary API implementation lives in `apps/api`.
- The codebase uses route/query organization around domain-specific files and tRPC routers.
- Shared page-tab routes now include:
  - `pageTabs.list`: protected query returning current-user private tabs plus public/general tabs for the normalized page, including `visibility`, `active`, `canManage`, per-user default metadata, and registry-backed count badges where supported. `includeInactive: true` includes manageable draft tabs for the edit modal.
  - `pageTabs.create`: protected mutation for saving the current page query as a tab. It supports private tabs for all users and Super Admin-only public/general tabs.
  - `pageTabs.update`: protected mutation for renaming/query/visibility/active updates when the user can manage the tab, for tab-index updates, and for setting/unsetting the current user's default on any visible active tab.
  - `pageTabs.reorder`: protected mutation for persisting the current user's sortable tab order through `PageTabIndex.tabIndex`.
  - `pageTabs.delete`: protected mutation that soft-deletes manageable tabs and clears tab index/default rows.
- App download route:
  - `apps/www/src/app/api/download-app/route.ts` serves `/api/download-app` as an APK attachment, defaulting to the current Expo EAS artifact `GqAGsWE95IWmjJmVgUANhDvDFLaUkm-XyYQZTDNQk7U.apk` while preserving query-string overrides for `url` and `name`
- Master password login audit routes:
  - `masterPasswordLoginAudits.list`: Super Admin-only paginated audit query with text search, platform filtering, and optional cleared-record visibility.
  - `masterPasswordLoginAudits.clear`: Super Admin-only archive mutation for explicit row ids or the current active search/platform filter; stamps `clearedAt` and the acting Super Admin id.

- Employee/user/notification route boundaries (2026-07-22):
  - `hrm.resetEmployeePassword`, `deleteEmployee`, `revokeEmployee`,
    `restoreEmployeeAccess`, `setEmployeeBugReportingAccess`, `saveEmployee`,
    and `getEmployeeForm` are protected procedures; sensitive employee writes
    repeat Super Admin authorization in the query/route boundary.
  - `user.getProfile`, profile/password/document/review/notification preference
    mutations, and `user.notificationAccount` are protected procedures.
  - Notification channel administration, subscriber/role membership,
    inbound-note, and note-write mutations are protected procedures. Public
    notification/channel reads remain for compatibility with shared activity
    and login surfaces.
- Web bug reporting routes now include:
  - `/api/bug-reports/upload`: web route handler for Vercel Blob client uploads; generates short-lived upload tokens only for authenticated users with `submitBugReport`, scoped to `bug-reports/<userId>/`, and supports image/video/audio evidence uploads
  - `bugReports.create`: creates a web bug report after the browser uploads screenshot or video evidence to Vercel Blob; requires `submitBugReport`; accepts optional initial voice-note evidence; best-effort external issue creation supports configured GitHub or Jira providers
  - `bugReports.mine`: returns the authenticated employee's own reports
  - `bugReports.adminList`: Super Admin list of all reports with optional status filter
  - `bugReports.byId`: owner-or-Super Admin detail with primary evidence metadata, capture type, external issue metadata, and follow-up thread including voice-note/transcription metadata
  - `bugReports.addFollowUp`: owner-or-Super Admin follow-up message mutation; API schema supports optional voice-note evidence
  - `bugReports.transcribeFollowUp`: owner-or-Super Admin voice-note transcription retry/manual mutation using configured Groq Whisper-compatible transcription
  - `bugReports.updateStatus`: Super Admin status update mutation
  - `hrm.setEmployeeBugReportingAccess`: Super Admin employee-row action that grants or removes the employee-specific `submit bug report` permission and clears the target employee's sessions for permission refresh
- Sales email ledger routes now include:
  - `emails.salesEmailAttempts`: protected query for `/sales-book/emails`; supports search, status, sales rep, date, and pagination filters. Super Admin sees all attempts, while non-Super Admin sales users are scoped to attempts they sent or attempts attached to them as the sales rep.
  - `emails.resendSalesEmailAttempt`: protected Super Admin mutation that retries `FAILED` or `SKIPPED` sales document email attempts by creating a linked child attempt and queueing the original simple/composed sales document email payload through the notification Trigger task.
- Sales document WhatsApp/SMS delivery reuses the protected notification task
  and existing public `/sh/[slug]` redirect; it adds no tRPC or public mutation
  endpoint. Channel intent and provider outcomes are carried by the composed
  notification payload/result contract.
- Task diagnostics routes now include:
  - `taskRunDiagnostics.list`: protected Super Admin query for `/task-events/diagnostics`; supports search, status, task name, entity, date, and pagination filters.
  - `taskRunDiagnostics.get`: protected Super Admin detail query for one diagnostic row.
  - `taskRunDiagnostics.register`: protected mutation for recording a started Trigger run by run id.
  - `taskRunDiagnostics.startFailure`: protected mutation for recording task start failures before a run id exists.
  - `taskRunDiagnostics.finalize`: protected mutation that retrieves Trigger.dev run status server-side and upserts terminal status, internal error, and bounded output summary.
  - `taskRunDiagnostics.markReviewed`: protected Super Admin mutation that stamps `reviewedAt` / `reviewedById`.
  - `apps/www` also uses server actions for runtime task feedback: `triggerTask` records starts/start failures, and `finalizeTaskRunDiagnosticAction` finalizes rows from the client watcher signal.
- Sales production routes now include:
  - `sales.productions`: admin-facing production queue list with due-date/status filtering
  - `sales.productionTasks`: worker-scoped production queue list using the authenticated user as `workerId`
  - `sales.productionDashboard`: production workspace summary query for alert buckets, queue counts, and compact due-date calendar data
- Sales overview routes now include:
  - `sales.getSaleOverview`: dedicated single-sale overview query used by the
    v2 sales overview system; loads one order/quote directly instead of routing
    through the broader sales list query. Order responses also join current
    invoice-PDF snapshot readiness for the manager production-preflight card;
    the read never generates a document.
  - `sales.salesRepOptions`: protected active-sales-user option list for the sales overview transfer control
  - `sales.transferSalesRep`: protected owner-only order/quote sales rep transfer mutation that accepts account- or master-password confirmation, changes `SalesOrders.salesRepId`, writes `SalesHistory`, and atomically records master-password transfer usage when applicable
- Sales print routes now include:
  - `print.salesV2`: canonical sales print data route for invoice, quote, production, packing-slip, and order-packing preview/download payloads, backed by `packages/sales/src/print/*` and `@gnd/pdf/sales-v2`
  - `/p/sales-document-v2`: canonical signed HTML sales document preview route
  - `/p/sales-invoice-v2`: PDF print viewer route for direct print flows
  - `/api/download/sales-v2`: canonical sales PDF download/export route
  - `/api/download/sales`: compatibility redirect to `/api/download/sales-v2`; legacy `print.sales` and `sales.printInvoice` tRPC procedures are retired
- Dealership/dealer-program routes now include:
  - `dealerPortal.updateCustomerOfficeVisibility`: dealer-auth mutation that
    changes only the active dealer's customer between `PRIVATE` and `SHARED`.
  - `dealerProgram.invitation` / `submitApplication`: public opaque-token
    landing and idempotent application endpoints.
  - `dealerProgram.campaigns`, `audienceOptions`, `saveCampaign`, and
    `setCampaignStatus`: Super Admin campaign workspace with serialized
    one-active-campaign enforcement.
  - `dealerProgram.applications`, `decideApplication`, and `resetSuppression`:
    Super Admin review, approve/deny, and explicit re-invitation reset.
  - `dealerProgram.setDealerSuspension`: Super Admin suspension/reactivation
    with optional reason, history, portal lockout, and lifecycle email.
  - `apps/dealership` Better Auth `/api/auth/dealer-dev-quick-sign-in`: development-only quick-login endpoint for active linked dealer accounts; disabled outside non-production environments and used only to unblock local dealership browser QA
  - `apps/dealership` local `/api/trpc` uses the scoped `dealershipAppRouter`, exposing only `dealerPortal` and `google` routers instead of the full internal `appRouter`, so dealership deployments do not trace or typecheck unrelated API surfaces.
  - `dealerPortal.dashboard`: dealer-scoped summary for open quotes, pending requests, active orders, unpaid balance, paid revenue, dealer earnings, dealer-facing taxes, customers, and recent activity
  - `dealerPortal.salesDocument`: dealer-scoped single quote/order document used
    by the dealer order overview and print/payment surfaces; payload includes
    `createdAt`, separate customer/GND balances, `deliveryOption`, and bounded
    `fulfillmentStatus` without exposing raw pickup/delivery relations.
  - `dealerPortal.salesDocuments`, `dealerPortal.orders`, and
    `dealerPortal.quotes`: dealer-scoped sales lists include request state,
    separate customer/GND balances, delivery option, and the bounded
    fulfillment projection used by dealer next-step guidance.
  - `dealerPortal.createPaymentLink`: dealer-owned approved-order checkout-link mutation for orders with outstanding balance
  - `dealerPortal.requestQuoteOrder`: creates or reuses the active dealer's pending quote-to-order request; it notifies the assigned sales rep, or all active Sales Team users when the quote/dealer has no assigned rep
  - `dealerPortal.saveQuote`: creates dealer-owned drafts and edits only quotes whose latest active `make_order` request is absent; pending, approved, and rejected requests lock the quote and return `CONFLICT` before quote-dependent writes
  - `dealerPortal.updateCustomerPaymentStatus`: dealer-owned mutation that records the dealer's customer receivable status and audit history without mutating the internal GND payable
  - `dealerPortal.printDocument`: dealer-owned print access with explicit `pricingMode = customer | internal`; the customer mode is customer-facing and the internal mode is the dealership/GND-facing office amount
  - `dealerPortal.saveSettings`: dealer settings mutation accepts external logo URLs and bounded uploaded image data URLs for dealer invoice branding
  - `sales.approveDealerSalesRequest`: internal approval mutation now accepts optional reviewed `deliveryCost` and `approverNote`, assigns first approver ownership, stamps approval metadata, and sends the dealer approval email with a checkout URL when payment is due
  - `filters.salesOrders`: now includes `Sales channel`, with `Dealership sales` and `Office sales` options; `sales.getOrders` and its summary accept `salesChannel=dealership|office`
- Sales orders routes now include:
  - `sales.getOrders`: canonical sales orders list query for `/sales-book/orders`, `/sales-book/orders/bin`, web reminder/search helpers, and Expo order lists; uses the former V2 flat row contract, accepts the existing pagination `bin` flag, and forwards supported filters through the legacy sales filter adapter
    - Primary sort `latestPaymentAt` is reserved for the clean-payment review queue and returns only orders with a successful latest `SalesPayments.reviewStatus = "needs_review"` payment.
  - `sales.getOrdersSummary`: canonical sales orders summary query for `/sales-book/orders`
  - `sales.getPaymentReviewSettings`: protected query returning current payment review settings plus Super Admin manage capability
  - `sales.updatePaymentReviewSettings`: Super Admin-only mutation that updates `sales-settings.meta.paymentReview.autoReviewActions`
  - `sales.getPrintSettings`: protected query returning normalized sales print defaults plus Super Admin manage capability
  - `sales.updatePrintSettings`: Super Admin-only mutation that merges the validated print configuration into `sales-settings.meta.print`
  - `sales.getPrintPreviewOrders`: Super Admin-only bounded query returning the 12 most recent active orders for the Sales Settings preview picker
  - `sales.markLatestPaymentReviewed`: protected mutation that manually marks the latest clean payment for an order as reviewed
  - `sales.markPaymentsReviewed`: protected batch mutation accepting 1-100 sales ids, reviewing the latest eligible clean payment per distinct order in one transaction, and returning reviewed order references plus explicit no-payment skips
  - `sales.createPaymentLink`: protected mutation that returns a checkout URL/token for an order with outstanding balance
  - `filters.salesOrders`: filter metadata query used by `SalesOrdersV2Header`
- New sales form routes now include:
  - `sales.getSalesHx`: returns persisted `order-hx` / `quote-hx` snapshots for a sales number with activity author/date when available, totals, profile, and item count
  - `newSalesForm.getHistorySnapshot`: protected lazy detail query that verifies a requested history copy belongs to the current order/quote before hydrating it through the new-form loader
  - `newSalesForm.searchShelfProducts`: mobile and web shelf picker search; blank query returns up to 10 visible recently used shelf products ordered by latest saved shelf line usage, skipping archived/hidden recent products without filling from unused active products; unused active shelf products are only shown through typed search or selected-product hydration
  - `newSalesForm.searchServiceSuggestions`: mobile Service line suggestion search; blank query returns unique recent service names derived from saved grouped service rows, while typed query filters by normalized service name and returns the latest observed unit price for each service
  - `newSalesForm.updateShelfProduct`: updates a shelf product title and unit price for the mobile shelf search edit action
  - `newSalesForm.deleteShelfProduct`: soft-deletes a shelf product for the mobile shelf search delete action
- Community job form routes now include:
  - `community.saveJobForm`: shared website/Expo job save mutation. It rejects saves without `unit.id` and `unit.projectId` unless the payload is a custom job and `jobs-settings.meta.allowCustomProject` is enabled, requires and trims `job.title` for projectless custom projects, stores `job.meta.submittedFrom` as `"web"` or `"mobile"` when provided by the client, and relies on `Jobs.createdAt` for the submission timestamp.
- Contractor jobs routes now include:
  - `jobs.deleteJob`: authenticated soft-delete mutation for contractor job mistakes. It allows the assigned contractor or an `editJobs` admin to delete only unlocked jobs, and rejects jobs that are approved, completed, paid, payment-cancelled, or linked to a contractor payout.
  - `jobs.getJobs` / `jobs.overview`: job rows now expose `deletionEligibility` so web and Expo hide or disable delete actions consistently with the server guard.
  - `jobs.contractorPayoutOverview`, `jobs.getContractorPayoutPrintData`, and public `print.contractorPayouts`: contractor payout job rows now include `description` and optional `isCustom` so payout overview and printed pay reports show what installers installed, including custom jobs without project/unit links.
  - `print.contractorPayouts`: contractor payout print data now includes top-level `companyAddress` for the branded cover page. The PDF render path uses the existing public `logo.png` and `logo-grayscale.png` assets passed through `baseUrl`.
- Dispatch / pickup packing routes now include:
  - `dispatch.sendSaleForPickup`: creates or reuses a pickup `OrderDelivery` in `queue` and records packing-workflow membership on the `sales-packing-list` notification channel
  - `dispatch.packingList`: tab-aware query powering `/sales/packing-list` for `current`, `completed`, and admin-only `cancelled` views
  - `dispatch.signPackingSlip`: saves signature + packed/received names, packs all items into the delivery, and completes packing through the `/p/sales-invoice-v2` flow
  - `dispatch.completeDispatchWithProof`: assigned-driver/manager mobile
    completion mutation that stages bounded signature/photo proof under one
    request id, packs pickups server-side, and idempotently finalizes the
    canonical dispatch. The previous generic `uploadDispatchDocument` mutation
    is removed.
  - `dispatch.signPackingSlip` now accepts only a PNG data URL, uploads and
    registers it server-side as a staged dispatch signature, and promotes it
    only after packing succeeds. It uses a serializable per-dispatch lease,
    preserves the five-minute completed re-sign window on the server, and
    reconciles a committed `domain_completed` canonical document on the next
    request if post-commit current-document promotion failed.
  - `dispatch.completeDispatchWithProof` returns canonical
    `signatureDocumentId` / attachment `documentId` values and rejects a
    different request while another proof upload is active.
  - Expo mobile now consumes `dispatch.packingList` for a separate `/(drivers)/warehouse-packing` workspace exposed from Settings, while item-level execution still reuses `dispatch.dispatchOverviewV2` + the shared dispatch detail packing flow
- Shared storage and employee document routes now include:
  - `storage.upload`: protected, server-mediated inbound/dispatch browser
    attachment upload with base64, size, MIME, magic-byte, owner, and canonical
    registration checks.
  - `storage.delete`: protected deletion for an active staged Vercel Blob
    browser-upload document owned and uploaded by the current user; requires
    the trusted staging source/key/status and tombstones the `StoredDocument`.
    Consumed note attachments and employee documents cannot be deleted here.
    Unregistered legacy path-only blobs are not physically deleted because they
    have no trustworthy uploader identity.
  - `user.uploadDocumentAsset`: protected atomic Expo employee gallery upload,
    canonical registration, and `UserDocuments` save. Failed feature saves
    compensate the staged blob/record.
- Inventory dispatch routes now include:
  - `inventories.assignInventoryDispatchAllocations`: moves eligible inventory allocations into `reserved` for dispatch mode, using status-guarded updates so concurrent reruns return skipped evidence instead of overwriting rows already moved by another action
  - `inventories.packInventoryDispatchAllocations`: moves reserved inventory allocations into `picked`, using the same status-guarded transition behavior as dispatch assignment
  - Dispatch queue payloads now expose `allocationIdsByStatus` for approved, reserved, and picked allocations so browser/operator controls can target one exact allocation instead of mutating every allocation on the line.
  - `inventories.fulfillInventoryDispatch`: consumes picked allocations first with status-and-quantity guards, then writes completed legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows only after consumption succeeds; accepts optional `allocationIds` to fulfill an exact picked allocation subset.
  - `inventories.releaseInventoryDispatchAllocations`: releases held inventory dispatch allocations that have not been consumed, using the same status-guarded transition behavior as dispatch assignment
  - Inventory dispatch transition inputs now reject non-positive or decimal `salesOrderId`, `lineItemIds`, and `allocationIds` values before assign, pack, fulfill, or release mutation planning runs.
  - Shipment history for these routes is canonical in `OrderDelivery` / `OrderItemDelivery`; see `brain/decisions/ADR-008-inventory-shipment-record-source.md`
- Inventory partial shipment routes now include:
  - `inventories.salesPartialShipmentQueue`: dedicated partial-shipment queue with available-now, held-until-complete, awaiting-inbound, backordered, and ready-remaining statuses
  - Partial/backorder queue payloads expose allocation id groups where needed by inventory dispatch controls, so exact allocation actions can be rendered without a separate row lookup.
  - `inventories.setSalesInventoryLineFulfillmentHold`: line-level hold-until-complete toggle stored in `LineItem.meta.fulfillment`
  - `inventories.shipAvailableSalesInventory`: now skips held lines unless the full remaining quantity can ship, returning skipped held lines with reason `hold_until_complete`; it consumes planned component allocations through guarded status/quantity writes before writing completed `OrderDelivery` / `OrderItemDelivery` compatibility rows, and rejects stale allocation consumption before delivery rows are attempted
  - Partial shipment and hold inputs now reject non-positive or decimal `salesOrderId` / `lineItemIds` / `lineItemId` values before ship-available or hold mutation planning runs.
- Inventory allocation review routes now include retry guardrails:
  - `inventories.approveStockAllocation` and `inventories.rejectStockAllocation`: require positive-integer allocation ids before review mutation planning, only mutate active `pending_review` rows whose parent sale is not fulfilled/cancelled, and retries against already transitioned, cancelled, released, or deleted rows return `skipped: true` with reason `not_pending_review`
  - `inventories.approveStockAllocation`: when an `approvedQty` override is supplied, it must be positive before allocation approval writes run
  - `inventories.approveBulkStockAllocation`: requires a non-empty positive-integer allocation id list, only approves active `pending_review` rows whose parent sale is not fulfilled/cancelled, and returns `skippedCount` for duplicate, missing, deleted, already transitioned, or concurrently claimed ids
- Inventory inbound and backorder release routes now include retry guardrails:
  - `inventories.receiveInboundShipment`: receive is delta-based from persisted `InboundShipmentItem.qtyGood` / `qtyIssue` and runs in one API transaction, so repeating the same payload does not duplicate stock, movement, demand received quantity, issue rows, or shipment-item quantity/unit-price writes; inbound and item ids are positive-integer guarded and receipt quantities/unit price are nonnegative before the transaction starts; closed/cancelled/deleted shipments are not receivable, and the final shipment status write is guarded against concurrent terminal changes; new receipt deltas are capped at planned item quantity and require a guarded shipment-item baseline update before downstream stock/demand writes; existing stock rows are incremented atomically with an active-row guard before movement evidence is written from the re-read post-increment quantity; demand receipt updates are also guarded by baseline quantity and active status so stale skipped demand rows do not consume receipt quantity; omitted `items` means receive all while an explicit item list receives only those rows and rejects duplicate or non-shipment item ids; duplicate receives preserve the original completed timestamp and keep `issue_open` while open item issues exist; result includes duplicate/skipped quantity counters
  - `inventories.reportInboundItemIssue` and `inventories.resolveInboundItemIssue`: manual inbound issue report/resolve mutations share positive-integer id guards, require positive reported issue quantity, and reject negative resolved quantities before issue rows are created or updated
  - `inventories.allocateReceivedInboundToBackorders`: auto-release result includes skipped demand and already-covered demand counts for repeated allocation jobs; optional `salesOrderId`, `lineItemComponentIds`, and `inventoryVariantId` filters are positive-integer guarded, and `limit` is integer-bounded before the retry allocation scan runs
  - `inventories.inboundStatusDemandReconciliation`: bounded reconciliation query for `/inventory/inbounds`, comparing manual `SalesOrders.inventoryStatus` prompts with open line-level `InboundDemand` rows
  - `notes.saveInboundNote`: after updating the order-level inbound status and note, applies `ORDERED` / `PENDING ORDER` to existing unassigned, unreceived open inventory demand rows for the same sale; `AVAILABLE` remains non-destructive unless scoped to selected unassigned, unreceived demand, and manual prompts do not downgrade partially received, received, or shipment-linked demand
  - `notes.saveInboundNote` accepts optional `demandIds` for line-scoped prompt application; selected mutable unreceived demand can be marked ordered/pending or cancelled when a selected line is confirmed available, while order-wide `AVAILABLE` still remains non-destructive
  - Selected `demandIds` are sanitized at the inventory boundary; a non-empty selected-demand request with no valid positive integer ids is skipped and never broadened into an order-wide demand mutation
  - Sales inventory line sync reads `SalesOrders.inventoryStatus` when projecting `InboundDemand`, so demand created after the save-time prompt still inherits `ORDERED` / `PENDING ORDER` semantics
  - Active inbound reads use the inventory-owned `ACTIVE_INBOUND_DEMAND_STATUSES` policy (`pending`, `ordered`, `partially_received`) across demand queue, reorder suggestions, reconciliation, create/assign flows, and sales sync
  - Order prompt mutation and the shared `canOrderInboundPromptMutateDemand` helper use the narrower inventory-owned `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES` policy (`pending`, `ordered`) plus `qtyReceived=0` and `inboundShipmentItemId=null`, so prompt saves do not overwrite received, partially received, or shipment-linked demand
- Inventory print routes now include:
  - `print.salesInventoryV2`: inventory-backed print data route for `/p/sales-inventory-v2`; emits the same v2 template input shape as current sales print while packet rows are composed from inventory `LineItem` / `LineItemComponents`
  - Data/golden coverage exists for production BOM, pick list, packing list, backorder summary, and customer remaining summary packets
- Inventory reconciliation routes now include:
  - `inventories.inventoryReconciliationReport`: dry-run report over inventory-backed sales lines with `synced` / `needs_review` / `partial` status, checked counts, drift counts, total skipped-comparison count, severity, samples, skipped counts, skipped reasons, next cursor, and has-more state. Optional `salesOrderId` must be a positive integer, `cursorId` must be a non-negative integer, and `limit` / `sampleLimit` must be integers within their bounded ranges so clean-run evidence cannot be based on decimal or invalid cursors.
  - `inventories.runInventoryReconciliationReport`: queues Trigger task `run-inventory-reconciliation-report` for bounded dry-run reconciliation using the same integer-safe reconciliation schema; no repair or mutation is performed by this job, and Trigger output carries status, checked, drift, skipped-comparison, cursor, and has-more evidence for operator run summaries
  - `inventories.salesInventoryOverview`: single-order inventory overview query
    used by the sales overview Inventory tab and manager production preflight,
    returning sale metadata, inventory-backed line items, summary, invoice-item
    `groups[]`, and active variant supplier/price evidence
  - `inventories.salesInventoryTrackingChangeRepairPreview`: bounded read-only mutation-style check used after a category becomes tracked. It accepts `inventoryCategoryId` and optional `limit`, returns eligible pre-production/in-production orders with pending quantity, and reports skipped read-only orders that have already reached the production/fulfillment boundary.
  - `inventories.salesInventoryMarkAsPreflight`: batch-safe preflight query used by the shared web `SalesMenu.MarkAs` actions; it accepts only a non-empty positive-integer `salesOrderIds` array capped at 100, blocks production-complete/fulfilled task starts when configured inventory still has required components awaiting inbound or allocation, preserves normal behavior for orders without inventory-backed rows, and returns the allocation ids plus inbound component/supplier hints needed by the fulfilled auto-resolution shortcut
  - `inventories.resolveSalesInventoryMarkAsAutoForContinue`: transitional Mark As Fulfilled auto-resolution mutation for active non-terminal orders; it accepts the same positive-integer `salesOrderIds` batch contract, approves pending stock allocations, creates/links inbound demand and inbound shipments grouped by preferred/default/fallback supplier, updates affected order inbound status to `ORDERED` or `AVAILABLE`, writes order-scoped `SalesHistory` audit rows, reruns preflight for evidence, and lets the UI continue fulfillment even if the remaining preflight still reports awaiting inbound
  - `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue`: guarded Mark As continue mutation that accepts the same positive-integer `salesOrderIds` batch contract, marks only safe unlinked mutable inbound demand available, recomputes affected component demand state, updates affected resolved order inbound status to `AVAILABLE`, writes order-scoped `SalesHistory` audit rows, and only lets the UI continue the existing Mark As task when the post-mutation preflight passes
  - `inventories.salesInventoryInboundStatusBackfillPreview`: bounded read-only Phase 8 preview for inventory-owned inbound orders whose legacy `SalesOrders.inventoryStatus` is null or not `ORDERED`; returns samples, ownership summaries, global `totalMismatchCount`, `nextCursor`, and `hasMore` without mutating data
  - `inventories.repairSalesInventoryInboundStatusBackfill`: dry-run-default reviewed repair mutation for explicit `salesOrderIds`; it revalidates each candidate against active inventory-owned inbound demand, stale legacy status, and the exact reviewed legacy `inventoryStatus` baseline before setting `SalesOrders.inventoryStatus` to `ORDERED`, writes `SalesHistory` audit rows only for confirmed applied orders, and returns `status`, classified skipped-id reasons, plus post-run remaining mismatch candidates for apply evidence
  - `inventories.backfillSalesInventorySync`: queues `backfill-sales-inventory-line-items` for repair/backfill sync; explicit `salesOrderIds` are capped at 200 positive integers and processed as the full targeted set, while cursor-based backfills continue to use the bounded batch size
  - `inventories.syncSalesInventoryOverview`: single-order repair mutation used by the sales overview Inventory tab when no inventory-backed rows exist yet; it accepts only a positive-integer `salesOrderId`, runs the package sales-inventory sync directly, and returns the sync counts/warnings. Stale component cleanup is guarded by exact pre-read component identity, while stale removed-sales-item cleanup reports only confirmed stale line soft-deletes and cleans child allocation/demand/component residue only under those confirmed-cleaned lines
  - `inventories.resolveSalesInventoryLegacyStatusSetup`: explicit reset/override mutation for Sales Overview Inventory tab records in `legacy_status_locked`; it accepts only a positive-integer `salesOrderId`, revalidates the exact reviewed manual `SalesOrders.inventoryStatus` inside the transaction, and writes audit history plus single-sale sync evidence only after that baseline is confirmed
  - `inventories.createInboundShipmentFromDemands`: creates an inbound shipment from selected open demand ids and/or monitored stock component selections with requested qty; supplier, demand, and component ids are positive-integer guarded, and selected component quantities must be positive before demand preparation runs; when component selections are provided, it prepares only the requested pending `InboundDemand` quantity, can split an existing unlinked pending demand for partial inbound creation, ignores non-stock rows, commits shipment item quantity only from demand rows confirmed linked by guarded writes matching the pre-read `qtyReceived` baseline and a final parent-inbound active-state guard, guards empty item/shipment cleanup after zero confirmed links, and commits affected order `inventoryStatus=ORDERED` updates for confirmed linked demand in the same transaction
  - `inventories.assignInboundDemands`: assigns demand rows to an existing non-deleted, non-terminal inbound shipment in one API transaction, with positive-integer `inboundId` and non-empty positive-integer `demandIds` enforced before assignment planning; it uses only active unassigned demand confirmed linked by guarded writes matching the pre-read `qtyReceived` baseline for shipment item quantity and timeline order references; existing inbound item quantity is incremented atomically by confirmed linked quantity and the item quantity commit is guarded by parent inbound status, so retries, already-linked rows, concurrent receipts, concurrent claims, or concurrent terminal inbound changes do not inflate or mislabel inbound quantities; zero confirmed links fail without writing assignment activity, and cleanup of a newly-created empty item is parent-state guarded
  - `inventories.orderInboundShipments`: sales-overview inbound list for one order, scoped through linked `InboundDemand` rows
  - `inventories.orderInboundShipmentCount`: lightweight count of active inbound shipments linked to one sale, used to keep the Inventory/Inbounds tab badge accurate before the detail list is opened
  - `inventories.salesInventoryOrderRepairPreview`: protected, read-only order-update repair preview. It returns exact demand/allocation baselines, safe-to-repair rows, and linked/received/picked review rows for one live sales order.
 - `inventories.resolveSalesInventoryOrderRepair`: protected guarded repair mutation. It accepts only the reviewed baselines, revalidates sale ownership and current row identity/status/quantities, cancels safe unlinked demand, releases safe allocations, recomputes affected components, and writes one order-scoped SalesHistory audit record.
  - `inventories.inventoryImports`: read-only scope breakdown for the settings-driven Dyke import control center, reporting active/dependency/excluded steps, imported standard/custom counts, and stale imported categories.
  - `inventories.runFullImport`: Super Admin inventory-import task dispatcher. It queues the compare/update/full-refresh Trigger task, records the authenticated operator plus scope/strategy/reset metadata in `TaskRunDiagnostic`, and preserves the queued run even if diagnostic persistence fails.
  - `inventories.inventoryImportRunHistory`: protected bounded history query for the latest inventory import update/system-check diagnostics, including Trigger run identity, operator, scope/strategy metadata, lifecycle status, timestamps, and operator-facing failure status; internal diagnostic errors remain on the Super Admin task-diagnostics surface.
  - `inventories.inventoryImportSourceReview`: protected, read-only source safety query for imported inventory rows outside the active sales-settings scope or with incomplete/orphaned source labels. It classifies standard archive candidates, custom exceptions, and operationally protected rows using positive stock, active sales references, allocations, inbound demand, and storefront publication guards.
  - `inventories.archiveInventoryImportSourceCandidates`: Super Admin, dry-run-by-default mutation for the bounded source-review sample. Apply revalidates candidate status in a transaction, soft-archives only unused standard rows, returns skipped safety evidence, and queues the existing inventory-to-Dyke projection sync for confirmed rows.
  - `inventories.applyInventoryImportSourceDisposition`: Super Admin retained-row mutation. It requires the exact reviewed category/source-label baseline, moves one candidate only to an active same-kind category, detaches unproven legacy source ownership, applies the operator-selected standard/custom visibility, and transactionally records actor-attributed `Event` evidence before queuing inventory-to-Dyke projection.
  - `inventories.applyInventoryImportSourceDispositionBatch`: Super Admin bounded batch retained-row mutation. It accepts 1-25 unique single-row disposition inputs, runs each as its own exact-baseline guarded transaction, and returns per-row applied/skipped plus projection diagnostic evidence instead of making one stale row roll back the whole reviewed batch.
  - `inventories.inventoryImportProjectionHistory`: Super Admin bounded query for retained-item inventory-to-Dyke projection attempts. It exposes only diagnostics tagged as inventory-import projections, including actor, inventory/disposition identity, queue/run status, retry lineage, whether the failed attempt remains claimable, and bounded queued/failed/retryable health counts.
  - `inventories.retryInventoryImportProjection`: Super Admin retry mutation for one retryable projection diagnostic. It verifies the diagnostic metadata and live inventory row, atomically claims the prior failure through `reviewedAt`/`reviewedById`, queues one new projection, and persists a linked success or start-failure diagnostic.
  - `inventories.inventoryImportCategoryCleanupReview`: protected bounded query for active inventory categories whose Dyke step is outside the current sales-settings route graph. Categories are ready only when they have zero live inventory children; otherwise the response reports blocking standard/custom row counts.
  - `inventories.cleanupInventoryImportCategories`: Super Admin, dry-run-by-default category cleanup mutation. Apply re-resolves scope and rechecks the no-live-child relation inside the transaction, soft-archives only confirmed empty stale categories, returns changed/blocked evidence, and queues category-level inventory-to-Dyke projection.
  - `inventories.inboundShipments`: general Sales Book inbound list with linked order/customer summary data for search, filters, analytics, and collapsed row headers
  - `inventories.updateInboundShipmentStatus`: positive-integer guards `inboundId`, updates the inbound lifecycle status with a non-deleted and previous-status guard, then writes a notification-backed activity event; cancelling an inbound releases unreceived active demand only through rows still linked to that cancelled parent shipment, recomputes affected components only after confirmed release evidence, and returns release/recompute counts
  - `inventories.inboundActivity`: inbound lifecycle timeline query, ordered from created/oldest to newest so the creation event is the first lifecycle row
  - `inventories.approveBulkStockAllocation`: existing allocation approval mutation is used by the sales overview Inventory tab row action to allocate available stock only for rows exposing pending stock allocation ids
  - `inventories.updateInventoryProductKind` and `inventories.updateCategoryProductKind`: compact config mutations used by the sales overview Inventory tab `Edit` dropdown to mark actual inventory items or step/categories as `inventory` or `component`; component-kind writes also make the affected row unmonitored
  - `inventories.updateCategoryStockMode`: existing category stock-mode mutation is also used by the sales overview Inventory tab `Edit` dropdown to toggle category stock tracking
  - `inventories.salesInventorySyncMonitor`: bounded sync coverage and review-risk query for inventory-backed sales cutover, including missing sales, componentless synced sales, stale inventory sale-line counts, stale stock-allocation and inbound-demand residue counts, bounded samples, and optional `includeReconciliation` / integer-bounded `reconciliationLimit` input to fold the dry-run inventory reconciliation summary into the same review-risk gate; when reconciliation is requested, the summary includes per-domain checked, drift, skipped, skipped-reason, severity, and sample counts plus a total `skippedComparisonCount` for operator cutover evidence, and clean-but-partial or skipped-comparison coverage keeps the monitor in `needs_review` until reconciliation proof is complete
  - `inventories.cleanupStaleSalesInventoryLineItems`: dry-run-default cleanup mutation for stale inventory sale lines whose parent sale is missing or deleted; explicit `lineItemIds` must be a non-empty positive-integer list and `limit` is integer-bounded before the cleanup scan runs; when applied, it first soft-deletes only line items still matching the stale predicate, then releases allocation rows, cancels inbound demand rows, and removes stale components only under line items confirmed by that cleanup write
  - `inventories.dykeInventoryDriftReport`: existing Dyke/inventory definition and pricing drift report used beside the sales inventory reconciliation report
- Inventory item dashboard routes now include:
  - `inventories.inventoryItemDashboard`: bounded item overview query for `/inventory/[id]`, returning item summary, variants, current stock, stock movements, inbound demand, active allocations, and related sales/quotes from inventory `LineItem` references
- Inventory variants workspace routes now include:
  - `inventories.inventoryVariantsWorkspace`: bounded variants query for `/inventory/variants`, with search plus item, category, supplier, status, stock-mode, and low-stock filters; rows expose stock, price, supplier, status, item, category, and attribute context
- Inventory top-sales analytics routes now include:
  - `inventories.inventoryTopSalesAnalytics`: 90-day default inventory-backed analytics for `/inventory` and `/inventory/[id]`, ranking items and variants by ordered quantity from `LineItem` rows and shipped quantity from consumed `StockAllocation` rows; sale counts are de-duplicated across ordered lines and consumed allocations, and revenue/cost metrics include reliability counts because legacy-only/unmapped sales are excluded
- Inventory stock audit routes now include:
  - `inventories.stockAuditVerificationReport`: 90-day default audit matrix for `/inventory/stocks`, verifying stock in, stock out, return, correction, consume, and release against expected `StockMovement` types and `InventoryLog` actions
- Inventory operations dashboard routes now include:
  - `inventories.inventoryOperationsSummary`: bounded stock-health query for `/inventory`, returning tracked/untracked variant and item counts, low/out-of-stock alert rows, open inbound demand qty, pending allocation qty, backordered line count, production blocker count, and the current tracking policy metadata
- Inventory browser validation readiness routes now include:
  - `inventories.inventoryBrowserValidationFixtureReport`: read-only fixture readiness query for the Pending 15 browser workflow matrix, reporting whether local data has pending allocation review, dispatch assign/pack/fulfill allocations, inbound receiving, received-inbound backorder release, partial shipment, held partial shipment, low-stock, and safe stock-adjustment fixture categories; SQL-filterable categories return real database counts while samples remain bounded for the dashboard, and each fixture row carries its package-owned workspace link, recommended operator action, seed-plan identifiers, and `countDiagnostic` metadata so bounded application scans are visible in API/CLI evidence
- Inventory Dyke authoring routes now include:
  - `inventories.upsertDykeCustomStepComponent`: step-scoped custom-component create/update mutation used by both legacy and new sales forms; it matches existing custom components by id, uid, or normalized title, writes the component through `@gnd/inventory`, optionally creates/updates the Dyke pricing row, invalidates sales workflow caches, and queues targeted `sync-dyke-step-to-inventory`
  - `inventories.archiveDykeCustomStepComponent`: hides a step-scoped custom Dyke component from future sales-form selection by writing `meta.deletedAt`, then invalidates sales workflow caches and queues targeted `sync-dyke-step-to-inventory`; the physical `deletedAt` column is intentionally left unchanged so older sales, invoice editing, and print lookups can still resolve the component row
  - `inventories.saveDykeStepComponent` and `inventories.updateDykeComponentPricing`: lower-level component and pricing mutations still exist for legacy/admin paths that manage those concerns separately
- Community production routes now include:
  - `community.getUnitProductions`: community unit-production task list with builder/project/task/status/due-date filtering and `ids` deep-link filtering
  - `community.getUnitProductionSummary`: lightweight summary query powering unit-production widgets for total tasks, units covered, queued, started, completed, and past-due counts
  - `filters.unitProduction`: filter metadata for the rebuilt `/community/unit-productions` table surface
- Community notification channels now include:
  - `community_unit_production_started`
  - `community_unit_production_stopped`
  - `community_unit_production_completed`
  - `community_unit_production_batch_updated`
- Customer routes now include:
  - `customer.getCustomerDirectoryV2Summary`: lightweight stats for the `sales-book/customers/v2` directory header cards
  - `customer.getCustomerOverviewV2`: shared customer overview payload used by both the v2 full page and the 3xl side-sheet surface

## TODO
- Summarize the highest-value API surfaces by domain.
- Link important sales, checkout, dispatch, jobs, and customer flows to their implementation areas.

## Workflow component catalog mutations (2026-07-21)

- `sales.saveWorkflowComponentDetails`: protected component name, product-code,
  and image update.
- `sales.saveWorkflowComponentVisibility`: protected multi-component OR/AND
  visibility-rule update with canonical rule-target validation.
- `sales.saveWorkflowComponentSectionOverride`: protected metadata-merged
  section behavior update.
- `sales.saveWorkflowComponentRedirect`: protected validated redirect set/clear.
- `sales.saveWorkflowComponentPricing`: protected Super Admin component base
  pricing update with pricing-row ownership validation.
- `sales.archiveWorkflowComponents`: protected confirmed UI path backed by a
  physical `deletedAt` soft archive.
- Each mutation invalidates component caches; routing-sensitive changes also
  invalidate route data. Affected steps queue targeted Dyke-to-inventory sync.
## Storefront e-commerce replacement (2026-07-20)

- Public customer traffic uses `/api/storefront/trpc` and the allowlisted
  `storefrontCommerce` router only.
- Public groups: `catalog`, `content`, `configuration`, `cart`, `wishlist`,
  `checkout`, `account`, `orders`, `auth`, and `inquiry`.
- Employee operations use `storefrontAdmin` through the authenticated internal
  router for workspace, catalog policy, carts, orders, inquiries, settings,
  pages, and sections.
- Public checkout shipping routes are
  `storefrontCommerce.checkout.addressAutocomplete`,
  `storefrontCommerce.checkout.placeDetails`, and
  `storefrontCommerce.checkout.shippingPreview`. They search/resolve Google
  Places server-side and produce an owner-scoped, versioned cart quote.
- Employee shipping routes are `storefrontAdmin.settings.shipping`,
  `settings.saveShipping`, `settings.addressAutocomplete`,
  `settings.placeDetails`, and `operations.reviewShipping`.
- `storefrontAdmin.settings.shipping` returns the active policy plus projected
  canonical `doorSizes` and active parent `shelfCategories`; the save input
  accepts typed size/category rows and the general Moulding lb/LF value, not
  free-form product/profile JSON.
- `storefrontAdmin.catalog.saveMetadata` accepts the family-specific catalog
  shipping override (`shippingWeightPerUnitLb` or
  `shippingLbPerLinearFoot`) plus an optional canonical Shelf category ID, and
  persists it in the existing storefront component metadata.

### Custom millwork inquiry workflow (2026-07-22)

- Public `storefrontCommerce.inquiry.attachmentsEnabled` reports private-upload
  capability and enforced file limits without exposing credentials.
- Public `storefrontCommerce.inquiry.startCustom` validates and creates the
  identity-bound draft/upload session; `finalizeCustom` verifies registered
  blobs and submits the inquiry idempotently.
- Employee `storefrontAdmin.operations` exposes `inquiries`, `inquirySummary`,
  `inquiryDetail`, `inquiryDocuments`, `inquiryActivity`,
  `inquiryAssignees`, `updateInquiryStatus`, `assignInquiry`,
  `addInquiryNote`, `linkInquiryCustomer`, and `createInquiryQuote`.
- `POST /api/storefront/inquiries/upload` issues scoped Vercel Blob client-upload
  tokens for private files below the inquiry-specific pathname.
- `GET /api/storefront/inquiries/:id/attachments/:documentId` authenticates an
  employee, repeats `viewStorefrontOrders`, verifies document ownership, and
  streams the private blob without exposing the storage token or blob URL.
- Public reads are publication/soft-delete scoped and bounded. Ownership,
  configuration validity, price, payment, and order transitions are enforced
  on the server.
