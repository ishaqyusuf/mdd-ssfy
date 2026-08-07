# API Contracts

## Driver Work Queue and Manifest Contract (2026-08-06)

- `dispatch.driverWorkQueue` returns paginated, authenticated driver work with
  server-owned date/status/search filters and normalized overdue/today/tomorrow/
  upcoming/unscheduled presentation.
- `dispatch.driverWorkQueueSummary` returns global counts independently of the
  loaded page. Driver routes always replace a requested driver scope with the
  authenticated user id.
- `dispatch.manifest` returns the canonical dispatch detail projection with a
  stable revision, structured legacy configuration facts, per-line execution
  mode, and inventory component readiness. Inventory component demand is
  proportional to the quantity listed on the current dispatch.
- `dispatch.prepareInventoryForDispatch` chooses exact approved allocation
  quantities, splits oversized rows, binds them to the dispatch, and picks them
  before returning the refreshed manifest revision.
- `dispatch.inventoryReconciliation` is a read-only drift report.
  `dispatch.backfillInventoryBindings` defaults to `dryRun=true`, skips
  ambiguous multi-dispatch sales, and applies only exact, shortage-free plans.
- Cancellation accepts `confirmPickedInventoryReturned=true` only as an
  explicit manager assertion permitting picked allocations to be released.


## Sales Workflow Cancellation Contract (2026-08-06)

- `sales.workflowCancellationPreview({ salesOrderId, action })` lazily returns
  `allowed`, a deterministic revision, current/resulting lifecycle, typed
  blockers with resource ids, exact reversible effects, and preserved
  inbound/stock/manual-production evidence.
- `sales.cancelWorkflowLayer({ salesOrderId, action, expectedRevision,
  requestId, reason })` requires a non-empty reason, treats UUID `requestId` as
  idempotent, rejects stale revisions, and rechecks the preview inside a
  serializable transaction.
- Production cancellation requires `editProduction`. Fulfillment cancellation
  uses the existing dispatch-management permission set: `editPickup`,
  `editOrders`, or `viewPacking`. Actor id/name come only from the authenticated
  user.
- In-transit, completed, delivered, proof-bearing, locked-payroll, manual-only,
  and ambiguous legacy ownership return typed precondition blockers. Those
  states require a return, delivery correction, payroll correction, or manual
  production correction workflow instead of evidence deletion.

## New Sales Form Shelf Product Search Contract (2026-08-06)

- `newSalesForm.getShelfProductIndex` returns visible shelf products with
  `id`, `title`, `unitPrice`, category ids, and a compact active parent/child
  `categoryPath`. Full image/detail hydration remains on
  `newSalesForm.getShelfProductDetails` after selection.
- Shelf visibility resolves each category's effective ancestry. A child-linked
  product is hidden when an ancestor is archived even if the product's
  denormalized `parentCategoryId` is null; dealer allowlists evaluate the
  derived breadcrumb as well as raw category ids.
- Dashboard and dealership clients compile this cached projection once and use
  the package-owned matcher locally. The dealer route filters products through
  its category allowlist before returning any searchable title/category data.
- `newSalesForm.searchShelfProducts` uses the same matcher for typed fallback
  search. It applies active product/category visibility, builds per-term title
  or category predicates, and merges exact-title (1), contiguous-phrase (100),
  structured measurement-anchor (250), and general coarse (up to 250) stages
  before structural matching and deterministic in-memory ranking. The merged
  pool is capped at 601 unique candidates; selected visible ids are hydrated
  and appended even when the typed query itself produces no candidates.
- Search is case/diacritic insensitive, ordinary word order is irrelevant, and
  dimensions/fractions are structured groups. `x`, `X`, and `×` are connectors
  only inside a dimension. A standalone hyphenated partial such as `5-0`
  matches either exact side of a compiled dimension or a mixed-fraction prefix,
  so it can find `5-0X6-8` and `4-9/16` without accepting unrelated independent
  digits. Price and edit-distance fuzzy matching are not part of this contract.

## New Sales Form Adjustment Contract (2026-08-04)

- Adjustment preview/proposal inputs reuse the complete typed new-sales-form
  snapshot plus `reason`, manual approval channel/recipient metadata, and the
  current persisted `version`.
- The server reloads the baseline and commitment projection; client-supplied
  before values, payment totals, wallet results, and operational floors are
  never authoritative.
- A commitment-protected direct save that changes quantity fails with
  `PRECONDITION_FAILED` and message code `SALES_CHANGE_REVIEW_REQUIRED` unless
  `approvedAdjustmentId` matches the exact approved source/proposal.
- Settlement returns `amountDue`, `walletCredit`, and effective payment after
  credit. Increases never include an automatic charge.
- Existing sale items have stable fallback UIDs of `sales-item-<id>`; new
  unsaved lines retain session-generated UIDs.
- Approval tokens are returned only when the proposal is first created and are
  accepted only by the token-scoped public approval procedures.

## New Sales Form Edit Identifier Compatibility (2026-08-03)

- `newSalesForm.get({ type, slug })` treats the `slug` input as an edit-route
  identifier. It first resolves an active document by canonical `slug`, then
  falls back to the visible `orderId` for legacy bookmarks and form-surface
  redirects that preserve an order or quote number.
- Canonical slug resolution retains priority if a slug could collide with a
  different document's visible number. The requested document type and
  non-deleted guard apply to both lookup paths.

## New Sales Form Autosave Identity (2026-07-31)

- The bootstrap `new-*` version is the stable identity of an unsaved office
  order/quote draft until the first persistence response assigns a sales id and
  slug.
- `newSalesForm.saveDraft` persists that value as
  `meta.newSalesForm.draftKey`. A later payload with no sales id/slug and the
  same draft key reuses the existing non-dealer record and its current version
  instead of creating another order.
- The response shape is unchanged. Clients still replace the draft identity
  with the returned `salesId`, `slug`, and `version` immediately.

## New Sales Form Adoption (2026-07-30)

- `newSalesForm.adoptionPing` is an authenticated mutation accepting only
  `surface: new|legacy`, `type: order|quote`, and `mode: create|edit`.
- The mutation records a bounded `PageView.group` and does not accept a slug,
  order id, quote id, customer id, URL, or arbitrary metadata.
- `newSalesForm.adoption` accepts `days: 7..90` and returns preference totals,
  new/legacy view totals and unique-user totals, observed unconfigured users,
  per-user activity, and recent preference decisions.
- `updateMySalesFormPreference` is a dashboard server action for the current
  authenticated user. It persists `NEW|LEGACY`, appends an event, and refreshes
  the versioned user-bound cookie.
- `recordLegacySalesFormOnceAction` appends one-time legacy-use evidence without
  creating a preference row or cookie.

## Sales dashboard and performance reports

- `salesDashboard.report` is an additive protected query that accepts the
  shared inclusive sales dashboard period, optional representative/channel
  filters, and one governed report type:
  `performance-summary | orders-ledger | sales-reps | products |
  quote-activity | customers`.
- The response is a typed workbook contract with title, slug, relevant row
  count, columns, typed cells, and ordered sheets. Every report includes
  `Report Context` and `Summary`.
- Grouped representative/customer workbooks include source orders; performance
  summary includes trend, channel, representative, and source-order sheets;
  product performance includes source line items.
- Money, count, percentage, and date cell types remain explicit so the browser
  can create numeric and date-aware Excel cells.
- Quote activity does not expose an inferred conversion metric.
- More than 10,000 relevant source records returns `BAD_REQUEST`; the API never
  labels a truncated workbook as complete.
- Payment, refund, application, collection, and receivables workbooks remain
  owned by the separate Sales Finance contracts.

## Sales Finance

- `salesFinance.transactions`, `salesFinance.summary`,
  `salesFinance.analytics`, `salesFinance.report`, and
  `salesFinance.transactionDetail` are protected, additive contracts for the
  parallel `/sales-book/finance` workspace.
- The list defaults to the last 30 calendar days and accepts search, inclusive
  `YYYY-MM-DD` bounds, canonical payment methods, raw statuses, exception codes,
  application statuses, sales-rep/customer ids, `all | review` tab, bounded
  20-100 page size, offset cursor, and typed sort tuple.
- List and detail rows use the shared `@gnd/sales/payment-system` projection.
  They expose received, principal, fee, refunded, net, applied, unapplied, and
  overapplied amounts plus application status, review exceptions, customer,
  invoices, sales reps, payment reference, and recorder.
- Customer names prefer wallet `businessName`, then wallet personal `name`, then
  deduplicated associated order customer/billing names.
- The summary uses the same projected rows and money helpers as the ledger; it
  returns canonical totals, counts, period bounds, and method totals.
- `salesFinance.analytics` accepts the shared filters plus the active
  `all | review` tab and returns continuous daily/weekly/monthly collections
  buckets, gross-receipt method mix, and review age/reason distributions.
  Analytics periods are bounded to ten years.
- `salesFinance.report` accepts the shared filters plus
  `payments | payment-methods | applications | exceptions | customers`. It
  returns typed workbook metadata and sheets for client-side `.xlsx`
  generation. Every workbook includes Report Context and Summary; grouped
  method/customer reports include Source Payments. More than 10,000 matching
  payments fails with `BAD_REQUEST` rather than returning a partial report.
- Detail reads are restricted to non-deleted transactions linked to sales
  payments, Square payments, or refunds.
- `salesFinance.receivables` and `salesFinance.receivablesSummary` are
  additive, read-only contracts over open Sales Orders. They accept search,
  optional inclusive `YYYY-MM-DD` due-date bounds, and
  `current | 1_30 | 31_60 | 61_90 | 90_plus` aging filters. The list adds
  bounded 20-100 page size, offset cursor, and typed sort.
- Receivable rows expose invoice/customer/sales-rep identity, invoice and due
  dates, payment term, canonical invoice/paid/outstanding money, stored balance,
  reconciliation difference, aging, status, and payment applications.
- Receivable payment applications treat legacy `success`, `completed`, and
  `paid` statuses as successful. A positive-total legacy order with no payment
  rows and an explicit stored zero balance is treated as paid and excluded from
  receivables; partial or positive stored balances do not override the payment
  projection.
- `salesFinance.receivableDetail` returns the same canonical row for one visible
  order. `salesFinance.receivablesReport` accepts the shared receivables filters
  plus `receivables-aging | receivables-customers`, returns typed workbook
  sheets, and rejects more than 10,000 matching invoices.
- `salesFinance.transactionDetail` includes raw/effective review state,
  reconciliation status, and append-only history. `reconciliationStart` records
  the current exception fingerprint and evidence; `reconciliationResolve`
  requires an open matching session, a typed resolution, and a 10-character
  evidence note. A matching resolution suppresses Review, while changed source
  evidence makes it stale and reviewable again.
- `salesFinance.resolutions` and `salesFinance.resolutionsSummary` expose the
  existing Sales Resolution candidate projection behind the Finance read
  boundary. The list accepts the existing resolution filters, pagination, and
  direct-field sort contract.
- `salesFinance.resolutionSyncBalance` accepts a positive sale id plus a
  minimum 10-character audit note, invokes the canonical balance repair, and
  records authenticated before/after evidence.
- `salesFinance.resolutionPayment` accepts the canonical payment-resolution
  input plus a minimum 10-character audit note. It supports guarded cancel and
  refund actions through the existing wallet resolution domain operation.
- `salesFinance.adoptionPing` records authenticated surface-level `PageView`
  evidence for Payments, Review, Receivables, Resolution, or legacy Accounting
  without storing filters or customer/payment identifiers.
  `adoptionReadiness` returns rolling 30-day activity and explicit readiness
  gates. It never authorizes an automatic legacy redirect or deletion.
- No database schema or legacy `sales.getSalesAccountings` response was changed
  for this contract. See `.brain/features/sales-finance.md`.

## Sales Customer Dealership Partnership Summary

- `DealerPartnershipState` is `ELIGIBLE | INELIGIBLE | INVITE_PENDING |
  INVITE_SENT | INVITE_OPENED | INVITE_FAILED | INVITE_EXPIRED |
  CAMPAIGN_INACTIVE | APPLICATION_PENDING | APPLICATION_DENIED |
  APPLICATION_APPROVED | DEALER_ACTIVE | DEALER_SUSPENDED |
  DEALER_RESTRICTED`.
- `DealerPartnershipSummary` includes the state/label/blocking reason, active or
  attributed campaign, latest invitation source/provider-attempt dates/sender,
  application details, dealer status, `canSend`, `canResend`, and `retryAt`.
  It never returns a raw invitation token or token hash.
- Precedence is dealer account, application, latest invitation, eligibility.
  Sent/opened rows expose a 24-hour retry boundary; pending rows become stale
  after ten minutes; failed/skipped/expired/inactive-campaign rows have no
  additional resend delay when a current active campaign exists.
- `dealerProgram.sendCustomerInvitation` accepts `{ customerId: positive int }`
  and returns `{ invitationId, campaignId, deliveryStatus }`. `SENT` means the
  provider accepted the message, not that inbox delivery was confirmed.
- Direct invitations require an active in-window campaign, office-owned
  non-deleted customer, syntactically valid customer email, no linked dealer or
  dealer-email conflict, and no non-reset application. Manual selection bypasses
  only campaign audience targeting.

## Purpose
Tracks important request/response contracts and shared schema boundaries.

## Current Notes

- Shared document caller contracts:
  - Browser attachment writes use `storage.upload` with a declared
    `inbound-documents` or `dispatch-documents` context, filename, allowed MIME,
    and canonical base64. The response includes URL, pathname, size/type, and
    `storedDocumentId`.
  - `storage.delete` accepts one pathname and returns `{ deleted }`; it never
    accepts a client-selected owner or storage token. Deletion repeats
    authenticated canonical owner/uploader checks plus the browser-staging
    source/key/status. Consumed or non-browser documents cannot be removed.
    The server compare-and-set claims the exact staged row before provider
    deletion and fences restore/tombstone by the delete claim id.
    Note/inbound/activity persistence validates explicit current-user canonical
    paths after adoption/claim and rejects deleting/deleted/failed states.
    Unknown legacy path-only blobs return `deleted = false`; physical cleanup
    requires trusted ownership established by a separate backfill/migration.
  - `user.uploadDocumentAsset` accepts employee document title/description/
    expiry plus validated file data and atomically returns the saved feature
    row with its canonical document id.
  - `saveDocument` derives its compatibility URL from an owned, ready
    `StoredDocument` when `storedDocumentId` is present. Update identity is
    `{ id, userId, deletedAt: null }`.
  - `dispatch.signPackingSlip.signature` is a bounded PNG data URL for new
    writes. Legacy URL values remain readable but cannot be submitted as a new
    signature. A per-dispatch request id owns the upload lease; the registered
    document id is checkpointed before packing, and the packing transaction
    records `packingSignoff.status = "domain_completed"` atomically. The
    five-minute completed re-sign window is enforced server-side. A later call
    can reconcile post-commit document promotion without replaying packing.
    Future/invalid completion timestamps never open the re-sign window, and an
    expired uploaded lease retires its exact non-current document.
  - Dispatch proof response/meta includes canonical signature and attachment
    document ids beside legacy-compatible pathnames. A different request is
    blocked during the active 15-minute proof lease and may take over after the
    lease expires. The request id is bound to a SHA-256 proof-content
    fingerprint; same-id retries with different bytes conflict. Registration
    and the document-id checkpoint share one transaction callback, with Blob/
    canonical compensation on failure and completed-state fencing for late
    retries. Attachment client ids are unique per request; legacy partial
    checkpoints without a fingerprint require a new request id.

- Dealership recruitment and fulfillment contracts:
  - Dealer-owned customers default to `PRIVATE`; `SHARED` enables read-only
    office discovery but never unrelated office-origin sales.
  - Delivery/ship submission requires and persists an immutable customer name,
    email, phone, address, and ZIP recipient snapshot.
  - Sales email producers accept a structured `dealerProgramBanner` with
    content, placement, campaign/invitation attribution, and opaque URL.
  - The shared send-time resolver treats profile and individual targets as a
    union and excludes dealer-owned customers, dealers, mismatched recipients,
    deleted/ineligible customers, and every non-reset application.
  - Random invitation tokens are stored only as SHA-256 hashes, expire after 30
    days, and submit one application idempotently. Any application suppresses
    later banners until explicit Super Admin reset.
  - Standard/composed quote/invoice emails and payment reminders are eligible;
    receipts, dispatch/failure/security, and dealer-lifecycle messages are not.
- Dealership quote-to-order contracts:
  - `dealerPortal.saveQuote` rechecks dealer ownership, quote type, soft-delete
    state, and the latest active `make_order` request in its transaction. A
    `pending`, `approved`, or `rejected` request returns `CONFLICT` with an
    actionable lock reason before customer resolution, pricing, item, or order
    writes.
  - `dealerPortal.requestQuoteOrder` is dealer-authenticated, dealer-owned, and
    idempotent for an existing pending request. Its notification payload includes
    request id, sale id, quote number, dealer/customer labels, and request time.
  - `dealer_sales_request` produces an in-app activity and an employee email.
    The email action opens `/sales-rep?tab=requests&requestId=<id>`.
  - `sales.approveDealerSalesRequest` requires delivery-cost review for delivery
    and ship requests, preserves the structured sales-form snapshot, returns an
    already-approved result on repeat work, and separates internal/GND payment
    context from the dealer's customer receivable.
  - `dealerPortal.updateCustomerPaymentStatus` changes only the active dealer's
    customer ledger and writes history. It never clears `DealerSales.dueAmount`.
  - Dealer sales list/detail payloads expose `officeAmountDue` for the
    dealer-to-GND payable, `amountDue` for the dealer's customer receivable,
    `deliveryOption`, and
    `fulfillmentStatus: "preparing" | "ready" | "completed"`. Pickup/delivery
    relations remain private. The projection uses only order-grain status,
    `SalesOrders.deliveredAt`, or a non-deleted completed pickup; one partial
    dispatch and legacy production completion cannot promote the whole order.
  - Dealer next-step guidance gates `Pay GND` only on `officeAmountDue`.
    A null/invalid GND payable produces review guidance rather than paid
    guidance. Customer balance does not block fulfillment guidance, and only
    the typed order-level projection can produce “ready” or “complete” wording.
  - Dealer print access accepts `pricingMode: "customer" | "internal"`.
    Explicit modes are part of the print snapshot document identity, so cached
    customer and internal documents cannot collide.
  - Sales order filtering accepts optional
    `salesChannel: "dealership" | "office"`; dealership means
    `dealerAuthId > 0`, while office includes null and legacy zero ownership.
- WWW client query invalidation contract:
  - Successful browser tRPC mutations pass through the global TanStack `MutationCache.onSuccess`, which resolves a typed mutation route from the tRPC mutation key and emits the route's registered query events.
  - Mutation results/variables may resolve affected sale references, and mutation options may add `meta.queryEventScope`; mutation options may also add typed `meta.queryEvents: QueryEventName[]`, while `meta.queryEvents: false` opts out of automatic route events.
  - Query events own typed tRPC path/exact/infinite targets in `apps/dashboard/src/lib/query-events/registry.ts`; Sales Overview detail reads use exact `{ orderNo, salesType }` keys when scope is available, while lists/summaries/dashboards/filters/page tabs remain broad. Missing scope falls back to broad detail invalidation.
  - Events reach the initiating tab and other open GND tabs in the same browser via `BroadcastChannel`. This is not a multi-device or server-originated realtime contract.
  - Query invalidation errors are logged independently and never change a successfully committed mutation into a mutation failure.
  - `salesPaymentProcessor.applyPayment` returns `appliedSales: Array<{ salesId, orderId, amountApplied, remainingDue }>` for successful office/customer-portal payments. Pending terminal setup returns an empty array and emits no sales event.
  - `checkout.verifyPayment` returns `appliedSales: Array<{ salesId, orderId, salesType }>` after completed settlement so online customer payments can invalidate the affected Sales Overview queries; pending verification returns no affected sales event.
  - Inventory dispatch/fulfillment mutation results attach `sale: { id, orderId, type } | null` when a sales order is known so the client can invalidate that exact Sales Overview.
  - `sales.markLatestPaymentReviewed` returns its related order `{ id, orderId, type }` with the reviewed payment result.
  - `sales.markPaymentsReviewed({ salesIds, note? })` accepts 1-100 positive sales ids, deduplicates them, and returns `{ reviewed, skipped }`. Each reviewed row contains `{ paymentId, salesId, orderId, type }`; each skipped row contains `{ salesId, reason: "no_payment_needs_review" }`. The Sales Orders batch caller suppresses per-mutation automatic events and awaits one coalesced `sales.payment.changed` event before clearing selection and closing the menu.
- Shared schemas and DTOs live across `apps/api/src/schemas`, `apps/api/src/dto`, and shared packages.
- Inventory import source review contract:
  - `inventories.inventoryImportSourceReview({ limit?, inventoryIds? })` is protected and
    bounded to 200 rows. It returns source-labeled imported inventory
    candidates outside the active sales-settings scope or with incomplete/
    orphaned source labels.
  - Each candidate includes source step/component labels, standard-vs-custom
    classification, category/item identity, operational usage counts, and a
    status of `archive_candidate`, `custom_review`, or `protected`.
    Positive stock, active sales line references, active allocations, open
    inbound demand, or storefront publication always protect a row from
    archive recommendations. Custom rows remain explicit review exceptions
    even when otherwise unused; the endpoint is read-only and performs no
    archive or repair mutation. `inventories.archiveInventoryImportSourceCandidates`
    is the corresponding protected mutation: it accepts 1-200 positive
    inventory ids, defaults to `apply: false`, re-runs the same source-safety
    classification inside a transaction, soft-archives only unused standard
    `archive_candidate` rows, and queues the existing inventory-to-Dyke sync
    for confirmed writes. Custom, protected, missing, or stale rows are
    returned as skipped evidence. Source archive apply requires Super Admin.
  - `inventories.applyInventoryImportSourceDisposition(...)` is the Super
    Admin-only explicit retain path for a reviewed row that should not be
    archived. Input includes
    the reviewed category/source-label baseline, an active target category, and
    `retain_as_inventory` or `retain_as_custom`. Apply requires the target to
    remain in the active route graph with the same `productKind`, moves the row,
    clears both legacy source UIDs, sets custom visibility from the disposition,
    and records the authenticated actor plus before/after state in `Event`
    inside the same transaction. Changed baselines and invalid targets return
    skipped evidence; projection queue failure does not roll back the audited
    retained ownership change.
  - Applied results include `syncQueued`, nullable `syncRunId`, nullable
    `projectionDiagnosticId`, and `projectionDiagnosticRecorded`. The API
    persists either the queued Trigger identity or a retryable `START_FAILED`
    diagnostic after the package-level ownership transaction completes.
  - `inventories.applyInventoryImportSourceDispositionBatch({ items })` accepts
    1-25 unique single-row inputs. Rows execute sequentially as independent
    guarded transactions and return ordered per-row results plus
    `appliedCount` / `skippedCount`; applied rows receive the same projection
    diagnostic enrichment as the single-row route.
- Inventory import retained-item projection contract:
  - `inventories.inventoryImportProjectionHistory({ limit? })` is Super
    Admin-only, defaults to 8, is capped at 20, and returns only bounded
    `sync-inventory-to-dyke` diagnostics tagged with
    `type=inventory-import-projection`.
  - Each row includes normalized `inventoryId`, nullable disposition audit and
    retry-parent ids, actor/run lifecycle fields, and `canRetry`. Queue/runtime
    failure, cancellation, and stale statuses are retryable only while the
    diagnostic remains unreviewed. Response `meta` reports bounded returned,
    queued, succeeded, failed, and retryable counts for control-center health
    checks; these counts describe the returned window, not all-time totals.
  - `inventories.retryInventoryImportProjection({ diagnosticId })` verifies a
    retryable tagged diagnostic and active inventory row, claims the exact
    diagnostic once through `reviewedAt`/`reviewedById`, and returns `queued`,
    `queue_failed`, or a stable skipped reason. Every attempted retry creates a
    new linked diagnostic when diagnostic persistence is available.
- Inventory import category cleanup contract:
  - `inventories.inventoryImportCategoryCleanupReview({ limit?, categoryIds? })`
    is protected, defaults to 50 rows, and is bounded to 100. It returns only
    active inventory categories still mapped to Dyke steps outside the active
    sales-settings route graph.
  - A category is `ready` only when it has zero non-deleted inventory children.
    Otherwise it is `blocked` with active standard/custom child counts, keeping
    item-level source review and retained/archive disposition ahead of category
    cleanup. The review also returns at most 100 active target categories for
    the retained-row control.
  - `inventories.cleanupInventoryImportCategories({ categoryIds, apply? })` is
    Super Admin-only and dry-run by default. Apply re-resolves the route graph
    and rechecks the no-live-child invariant inside the transaction,
    soft-archives only confirmed empty stale categories, and queues the
    category-level Dyke projection. Archived categories are excluded from
    subsequent stale-scope counts.
- Inventory import run history contract:
  - `inventories.runFullImport(...)` requires Super Admin and returns the
    Trigger run handle plus `diagnosticRecorded`. A successful Trigger dispatch
    remains successful when diagnostic persistence fails, so an observability
    write cannot conceal a queued import.
  - Dispatch records `TaskRunDiagnostic` identity with the authenticated actor,
    task, scope, strategy, compare/reset intent, category selection, and Trigger
    run id. Trigger start failures are recorded separately when possible while
    preserving the original dispatch error.
  - `inventories.inventoryImportRunHistory({ limit? })` is protected, defaults
    to eight rows, is bounded to 20, and returns only full inventory import and
    inventory import test tasks. While the control center monitors a live
    Trigger run, it finalizes the diagnostic from the terminal run status.
- Sales production query contracts live in `packages/sales/src/schema.ts`.
  - `updateSalesControl.cancelDispatch` accepts the legacy `dispatchId` or a batch `dispatchIds` list. Batch cancellation constrains every ID to `meta.salesId`, requires the complete requested set to match, updates all selected dispatches, and resets the parent sale in one transaction. Lifecycle notifications are emitted only after that transition completes; notification failures are logged and do not reject the committed mutation.
  - Automatic status-column production completion writes `submitProduction.submissionSource="sales_mark_as_completed"`. Its rollback uses `deleteSubmissions.automaticCompletionSalesId`, requires that ID to equal `meta.salesId`, and rejects when no tagged automatic completion exists, preserving legacy/manual production submissions.
- Shared page-tab contracts:
  - `pageTabs.list({ page, includeInactive? })` returns tabs visible to the current user: their private tabs plus public/general tabs for the normalized page path. By default it returns only active tabs; `includeInactive: true` also returns manageable draft tabs for the edit modal.
  - `pageTabs.create({ page, title, query, setDefault?, visibility? })` stores normalized query strings, preserving reusable page state such as `sort` while stripping pagination/internal keys including `_page`, `cursor`, and `size`.
  - `visibility` defaults to `"private"`; `"public"` creates a general tab visible to all users on that page.
  - `pageTabs.update({ id, title?, query?, setDefault?, visibility?, active?, tabIndex? })` lets any visible tab be set/unset as the current user's default through `PageTabIndex`, while title/query/visibility/active edits require management access. Draft state is stored as `PageTabs.meta.active === false`, so no migration is required.
  - `pageTabs.reorder({ page, ids })` persists the current user's drag order through `PageTabIndex.tabIndex`, including public tabs the user can see.
  - `pageTabs.delete({ id })` soft-deletes a manageable tab and clears tab-index/default rows for that tab.
  - Returned tab rows include `visibility`, `canManage`, `active`, optional `count`, per-user `default`, `index`, and `indexId`.
  - Count badges are registry-backed per page. `/sales-book/orders` uses the Sales Orders filter contract, defaults saved-tab counts to `showing="all sales"` like the page, and uses the same distinct clean-payment grouping for `paymentReview=needs_review`; `/community/unit-invoices` uses `whereUnitInvoices`. Additional count adapters currently cover `/sales-book/quotes`, `/sales-book/customers`, `/sales-book/dealers`, `/hrm/employees`, `/hrm/contractors/jobs`, `/community/projects`, `/community/project-units`, `/community/templates`, `/community/customer-services`, and `/community/unit-productions` by parsing saved tab queries through each page's existing query schema and count/where helper. Pages without a count adapter still render tabs without a count.
  - WWW only renders the inline page-tab strip when there is something visible to show: at least one saved tab or a current saveable tab query with an action node. Empty URL state and pagination/internal-only keys serialize to an empty saved-tab query, and the rendered strip self-hides when its action resolves to no DOM content, so pages with no saved tabs and no active filter/search/sort do not leave an empty bordered tab shell before the search input.
  - WWW invalidates page-tab counts through the typed `PAGE_TAB_PATHS` registry and normalizes every invalidation target with `normalizePagePath`, so callers may refresh the current page, a mapped key such as `orders`, or a raw path while updating both visible tabs and `includeInactive` edit-modal tabs. `usePageTabs()` / `usePageTabsInvalidation()` default no-arg invalidation to the current `usePathname()` value through the shared `createPageTabsInvalidation` factory, while `invalidate(...keys)` supports typed page keys and `invalidatePath(...paths)` supports raw/custom paths. Empty raw paths are ignored, and raw paths with query strings, hash fragments, extra whitespace, missing leading slashes, full app URLs, or trailing slashes are normalized to path-only values before deduped invalidation. The page-tabs API router mirrors the same path-only normalization before list/create/update/reorder/default/count work so saved tabs cannot split by URL variant. The registry currently includes Sales Orders/Quotes/Customers/Dealers, Employees, Contractor Jobs, Community Projects/Units/Invoices/Templates/Customer Services/Productions.
  - Saved-tab navigation appends the metadata-only `tabName` query value. It is excluded from normalization, equality checks, count inputs, and persistence. A named tab remains selected only while its complete saved baseline is present in the URL; stale, renamed, deleted, or deactivated selections clear `tabName` through a shallow replace.
  - Search fields are never a valid saved baseline. WWW excludes `q`, `search`, `_q*`, and the page-configured search key, hides the save action as soon as search is non-empty, and the create/update API rejects requests that still contain an active search field. Existing stored tabs containing search remain readable for compatibility.
- Sales Orders filter contract:
  - `sales.getOrders`, `sales.getOrdersSummary`, and `filters.salesOrders` accept `paymentReview=needs_review` as an explicit filter for the clean-payment review queue.
  - `sales.getOrders`, `sales.getOrdersSummary`, and the shared sales query accept `inbound=none | AVAILABLE | ORDERED | PENDING ORDER | pending | in_progress | completed | issue_open | closed`. Manual statuses match only when no active inventory shipment owns the order; inventory statuses match through active, non-cancelled demand/shipment links. `filters.salesOrders` exposes the same values and labels.
  - `sales.getOrders.data[].inventoryApplicability` prefers the durable `SalesInventoryProjectionState` marker, but a missing marker no longer means `not_synced` when active inventory sale lines already contain required positive-quantity components. In that legacy/backfill shape, the current component count supplies conservative applicability evidence; rows with neither a marker nor required component evidence remain `not_synced`.
  - The `Invoice` column sort is invoice amount (`grandTotal`) again; payment review filtering is not inferred from `sort=latestPaymentAt.*`.
  - Payment Review defaults to latest clean-payment ordering when no explicit sort is supplied; explicit sorts remain part of the filtered query and are saveable in page tabs.
- Sales Resolution Center contract:
  - `sales.getSalesResolutions` accepts the existing resolution filters plus pagination and `sort`.
  - `status` supports the existing resolution filter metadata values, including `Resolved`, `Resolved Today`, and `Unresolved`.
  - `customer.name` is part of the WWW URL filter schema so the existing `filters.salesResolutions` customer filter can round-trip through saved/search filter state.
  - Server sorting is intentionally limited to direct `SalesOrders` fields: `orderId`, `createdAt`, `grandTotal`, and `amountDue`; unknown sort fields fall back to `createdAt.desc`.
  - Computed resolution fields such as conflict type, projected due, and payment count are derived after candidate order/payment projection and are not server-sortable under the current query model.
- Short Links list contract:
  - `shortLinks.list` accepts `q`, `includeInactive`, `page`, `size`, `cursor`, and `sort[]`.
  - Cursor pagination uses an offset-style cursor so `/settings/short-links` can consume the same infinite-scroll table contract as other restarted table pages.
  - Sort values are mapped to safe Prisma fields for `slug`, `targetUrl`, `clickCount`, `lastClickedAt`, `expiresAt`, `active`, and `createdAt`; unknown sort fields fall back to `createdAt.desc`.
- Master password login audit contract:
  - `masterPasswordLoginAudits.list` accepts optional `q`, `platform`, `includeCleared`, `page`, and `size`; rows include target-user snapshots, platform/app surface, IP address, optional two-letter ISO country code, browser/user agent, safe session id, login time, and archive metadata.
  - Country search matches the stored normalized `countryCode`; the auth writer accepts only valid Vercel `x-vercel-ip-country` or Cloudflare `cf-ipcountry` two-letter values and rejects unknown/malformed codes.
  - `masterPasswordLoginAudits.clear` accepts optional explicit `ids` or active `q`/`platform` filters and archives matching uncleared rows rather than deleting them.
- Web bug reporting contracts live in `apps/api/src/schemas/bug-reports.ts`:
  - `BUG_REPORT_STATUSES = NEW | IN_REVIEW | IN_PROGRESS | NEEDS_INFO | FIXED | CLOSED`
  - `BUG_REPORT_CAPTURE_TYPES = VIDEO | SCREENSHOT`
  - `BUG_REPORT_TRANSCRIPTION_STATUSES = NOT_REQUESTED | PENDING | COMPLETED | FAILED`
  - `BUG_REPORT_MAX_DURATION_MS = 90_000`
  - `BUG_REPORT_MAX_UPLOAD_SIZE_BYTES = 250MB`
  - `BUG_REPORT_MAX_AUDIO_DURATION_MS = 600_000`
  - `BUG_REPORT_MAX_AUDIO_SIZE_BYTES = 25MB`
  - `/api/bug-reports/upload` implements Vercel Blob `handleUpload()` for browser uploads using server-only `BLOB_READ_WRITE_TOKEN`; token generation requires `can.submitBugReport`, accepts only paths under `bug-reports/<currentUserId>/`, allows `image/*`, `video/*`, `audio/*`, and `application/octet-stream`, caps upload size at 250MB, rejects overwrites, and issues 10-minute tokens
  - `bugReports.create` accepts optional `captureType` (`VIDEO` default), optional `description`, optional `currentUrl`, optional `userAgent`, optional video `durationMs`, `microphoneEnabled`, an uploaded primary Vercel Blob descriptor `{ url, pathname, contentType?, size, filename? }`, and optional `audio` evidence `{ upload, durationMs?, transcriptionStatus?, transcriptionText?, transcriptionProvider? }`
  - primary upload validation requires object keys under `bug-reports/`, size at or below 250MB, screenshot content type for `SCREENSHOT`, and video-like content type plus duration at or below 90 seconds for `VIDEO`
  - voice-note upload validation requires object keys under `bug-reports/`, size at or below 25MB, duration at or below 10 minutes, and audio-like content type
  - list rows include status, capture type, description, page metadata, duration, microphone metadata, primary evidence metadata, submitter/status-updater summaries, created/updated timestamps, and follow-up count
  - detail rows additionally include follow-ups ordered oldest to newest with author summaries, optional audio document metadata, audio duration, transcription status, transcription text, and transcription provider
  - `bugReports.adminList` accepts optional `{ status }`
  - `bugReports.addFollowUp` accepts `{ bugReportId, body, audio? }` with a non-empty body capped at 5000 characters and the same optional voice-note evidence shape used by create
  - `bugReports.transcribeFollowUp` accepts `{ followUpId }`, requires the owner or Super Admin, requires Groq transcription env config, downloads the follow-up voice note, calls Groq's OpenAI-compatible transcription endpoint, stores completed transcription on the follow-up and audio document, and fills the report/primary evidence description when the submitter did not already provide a description
  - configured GitHub or Jira issue creation runs after bug-report create/transcription; GitHub uses `BUG_REPORT_GITHUB_TOKEN`/`GITHUB_TOKEN` plus `BUG_REPORT_GITHUB_REPOSITORY` or `BUG_REPORT_GITHUB_REPO`, while Jira uses `BUG_REPORT_JIRA_API_TOKEN`/`BUG_REPORT_JIRA_TOKEN`, `BUG_REPORT_JIRA_BASE_URL`/`BUG_REPORT_JIRA_API_BASE_URL`, `BUG_REPORT_JIRA_PROJECT_KEY`, and optional `BUG_REPORT_JIRA_EMAIL`; `BUG_REPORT_ISSUE_PROVIDER=jira` selects Jira when both providers are configured; issue creation stores `externalIssueProvider`, `externalIssueKey`, `externalIssueUrl`, `externalIssueStatus`, `externalIssueError`, and `externalIssueCreatedAt` on the report
  - `bugReports.updateStatus` accepts `{ bugReportId, status }`
- Sales email ledger contracts live in `apps/api/src/schemas/emails.ts` and `apps/api/src/db/queries/sales-email-attempts.ts`:
  - `SALES_EMAIL_ATTEMPT_STATUSES = QUEUED | SENDING | SENT | FAILED | SKIPPED`
  - `emails.salesEmailAttempts` accepts optional `status`, `q`, `salesRepId`, `from`, `to`, `page`, and `size`; responses include rows, pagination metadata, `canViewAll`, and `canResend`
  - row status semantics are immediate provider-result semantics: `SENT` means Resend accepted the send response, `FAILED` means provider send/queueing failed, and `SKIPPED` means the app could not send because required recipient/customer/sales rep email context was missing or email preferences suppressed delivery
  - rows snapshot recipient, customer, sender, sales rep, document/email kind, subject/message, sales ids/order numbers, provider id/status, task run id when known, error text, timestamps, and `originalAttemptId`
  - `emails.resendSalesEmailAttempt({ attemptId })` accepts only a failed/skipped attempt, creates a new linked child attempt, queues the stored retry payload, and leaves the original failed/skipped evidence unchanged
- Task-run diagnostics contracts live in `apps/api/src/schemas/task-run-diagnostics.ts` and `apps/api/src/db/queries/task-run-diagnostics.ts`:
  - `TASK_RUN_DIAGNOSTIC_STATUSES = RUNNING | SUCCEEDED | FAILED | CANCELED | STALE | START_FAILED`
  - `taskRunDiagnostics.list` accepts optional `page`, `size`, `status`, `taskName`, `q`, `entityType`, `entityId`, `from`, and `to`; responses include rows plus pagination metadata
  - `taskRunDiagnostics.register` accepts `runId`, `taskName`, optional title/description/source/environment, optional lightweight metadata, and optional started timestamp
- Operational mutation contract:
  - dispatch, inventory configuration, contractor job, community, and shared
    settings mutations reject unauthenticated calls before business writes;
  - domain mutations additionally enforce the permission/ownership matrix in
    `.brain/plans/2026-07-23-api-public-route-hardening.md`;
  - assigned dispatch lifecycle mutations use the persisted driver id, and job
    self-service uses the persisted contractor id rather than client actor data.
  - `taskRunDiagnostics.startFailure` accepts `taskName`, optional context fields, error message/name, and lightweight metadata; rows are stored as `START_FAILED` without requiring a run id
  - `taskRunDiagnostics.finalize` accepts `runId`, optional observed status (`COMPLETED`, `FAILED`, `CANCELED`), optional error message, optional metadata, and optional finished timestamp; the server retrieves Trigger.dev status before upserting terminal diagnostics
  - `taskRunDiagnostics.markReviewed` accepts a diagnostic `id` and records the reviewing Super Admin
  - task diagnostic metadata is bounded to task/entity context; full task payloads and Trigger public access tokens are out of contract
  - production client toasts use safe status copy; internal error text is stored only in the diagnostics ledger for admin/developer review
- Public quote acceptance contract:
  - `checkout.acceptQuote({ orderId, token })` is the tokenized public customer quote-acceptance mutation used by `/sales/accept-quote/[orderId]`
  - a valid, unexpired quote token copies the quote into a new order inside one checkout transaction, writes `meta.quoteAcceptance` acceptance evidence on both the source quote and created order, then returns the existing payment-context response shape
  - repeat acceptance returns the already accepted order with `alreadyAccepted=true` and does not create another order copy
  - post-commit inventory sync queueing, `quote_accepted` notifications, and accepted-order sales email queueing are best-effort; failures are logged and must not reject a committed acceptance response
- The production workspace now depends on:
  - `show: "due-today" | "due-tomorrow" | "past-due"` for alert-focused list slices
  - `productionDueDate: string | null` for exact due-date queue filtering from the compact calendar strip
  - `sales.productionDashboard` response buckets: `summary`, `alerts`, `calendar`, and `spotlight`
- Customer v2 contracts now include:
  - `getCustomerDirectoryV2SummarySchema = {}` for directory stat cards
  - `getCustomerOverviewV2Schema = { accountNo: string }` for the shared page/sheet customer workspace payload
  - `customer.getCustomerOverviewV2` returns normalized `customer`, `addresses`, `walletBalance`, `general`, and `salesWorkspace` sections so the web UI no longer stitches this from server actions
- Pickup packing contracts now include:
  - `sendSaleForPickupSchema = { salesId: number }`
  - `packingListQuerySchema = { tab?: "current" | "completed" | "cancelled" }`
  - `signPackingSlipSchema = { dispatchId: number, receivedBy?: string | null, signature: string, note?: string | null }`
  - `completeDispatchWithProofSchema = { dispatchId: positive integer,
    requestId: 12-100 safe characters, receivedBy?, receivedDate?, note?,
    noteType?: "dispatch" | "pickup", signaturePath: validated drawing path,
    attachments?: Array<{ clientId, fileName, contentType: image/*, base64 }>
    }`; attachments are capped at five and 8,000,000 base64 characters each.
  - Successful completion returns `status: "completed"`, `idempotent`, the
    stored signature/attachment paths, and notification queue status. Repeating
    the same completed request returns idempotent success; a different request
    for a completed dispatch returns `CONFLICT`.
  - packing-list history is scoped by `sales-packing-list` notification membership, while live warehouse work uses normal `queue` delivery status
  - Expo mobile packing uses the same `packingListQuerySchema` tabs and opens the shared dispatch detail screen in a packing-aware mode via route params instead of introducing a second item-detail contract
- Community job form contracts now include:
  - `community.saveJobForm` requires `unit.id` and `unit.projectId` before saving a job unless the payload is a custom job and `jobs-settings.meta.allowCustomProject` is enabled.
  - Website and Expo clients must submit normal jobs against an existing project/unit. `jobs-settings.meta.allowCustomJobs` controls project-linked custom tasks; `jobs-settings.meta.allowCustomProject` controls the separate projectless `Custom Project` path.
  - Projectless `Custom Project` saves must include a non-blank `job.title`; the server trims it, persists it as `Jobs.title`, and job overview responses use it as the project display label.
  - `job.meta.submittedFrom` accepts `"web" | "mobile" | null` for source tracking. No separate submitted timestamp is part of the contract because `Jobs.createdAt` remains the submission time source.
- Contractor payout print contracts now include:
  - `jobs.contractorPayoutOverview` and `print.contractorPayouts` return `description: string | null` and optional `isCustom: boolean | null` on each payout job row, preserving status, amount, payment totals, and structured project/unit fields.
  - `print.contractorPayouts` also returns top-level `companyAddress` for the branded contractor payout cover page.
  - `createPaymentPortal` stores each selected job's description and custom-job flag inside `JobPayments.meta.jobSnapshots[]` so cancelled/reversed payout history can still show what was installed; older snapshots without these fields hydrate them as `null`.
  - The web payout overview and `@gnd/pdf` contractor payout report promote generic custom-job descriptions into the visible job label and use a custom-job fallback instead of misleading `No project / No unit` labels when a custom job has no linked project/home.
  - Contractor payout PDFs keep a branded GND cover page, GND watermark, and cancelled watermark for cancelled payout pages.
- New sales form grouped line contract:
  - grouped service UI lines store row projection in `line.meta.serviceRows`
  - grouped moulding UI lines store row projection in `line.meta.mouldingRows`
  - grouped row projections carry legacy persistence identity where known: `salesItemId`, `hptId` for moulding, `groupUid`, `uid`, `primaryGroupItem`, row qty/price/total fields, and row-level tax/production flags for services
  - API hydration treats DB grouping identity as authoritative and only uses persisted `order.meta.newSalesForm` for current editable row values
  - API save expands grouped projections back into legacy sibling `SalesOrderItems` rows sharing `multiDykeUid`; rows with `salesItemId` update/revive that legacy sibling, while newly added grouped rows without row-level legacy identity create new siblings instead of reusing the grouped parent line id
  - grouped moulding rows also write per-row `HousePackageTools`; rows with `hptId` update/revive that legacy HPT row, while newly added moulding rows without row-level HPT identity create new HPT rows instead of reusing the grouped parent HPT id
  - `newSalesForm.searchServiceSuggestions({ query, limit })` returns unique uppercase service names from saved grouped service rows with `unitPrice`, `usageCount`, and `lastUsedAt`; blank query is recent-first, typed query filters by normalized service name, and the latest observed price wins per service
  - legacy-strategy display summaries include derived credit-card convenience charges in returned/hydrated `summary.grandTotal` and `summary.ccc`; order persistence stores the base sales total and `amountDue` without the derived charge, while `payment_option`, `ccc_percentage`, and display/backfill `ccc` remain available to evaluate printable/payable totals
  - order save payload composition defaults missing `form.paymentMethod` to `Credit Card` before summary calculation, so create/bootstrap mobile records persist payment metadata and C.C.C display values consistently with the visible default
- New sales form history contract:
  - `sales.getSalesHx({ salesNo })` returns only non-deleted `order-hx` / `quote-hx` copies whose `orderId` starts with `${salesNo}-hx`, newest first
  - `newSalesForm.getHistorySnapshot({ type, salesId, historyId })` accepts `type: "order" | "quote"`, verifies the current document and history copy share the same base order number, and hydrates the history copy without exposing its `*-hx` type to the editor
  - history preview is read-only and cannot save, print, export, or add items
  - restoring a snapshot is client-local until the operator explicitly saves; current sales identity, status, inventory status, settings, payment totals/count, and version are preserved while copied line/step/shelf/HPT/door/extra-cost persistence IDs are removed
- New sales form Activity contract:
  - a successful save of an existing order or quote creates exactly one canonical `NotePad` Activity entry in the sale-update transaction, tagged with both `salesId` and visible `salesNo`; initial creation does not create an update entry
  - manual saves use `activity=sales_form_updated`, autosaves use `activity=sales_form_autosaved`, and the entry records the authenticated employee plus quantity/total changes when present
  - creating a new quantity adjustment writes its review Activity in the same transaction as `SalesOrderAdjustment`; reductions use `activity=sales_quantity_reduction_review` and include affected line quantities plus before/after total
  - adjustment idempotency is also Activity idempotency: an existing adjustment response does not append another review entry
- Sales orders list C.C.C display contract:
  - `sales.getOrders` keeps `amountDue` and stored `grandTotal` principal/base-only
  - order rows expose `baseInvoiceTotal`, `displayCcc`, C.C.C-inclusive `invoiceTotal`, principal `amountPaid`, and display-only `displayAmountPaid` / `displayAmountDue` for mobile card adapters
  - order rows expose `inventoryInboundOwnership` with `hasInventoryInbound`, `linkedInboundIds`, compact `linkedInbounds[]` shipment summaries, `linkedInboundCount`, `linkedDemandCount`, `primaryInboundStatus`, and `canUseManualInboundStatus`. Only non-deleted demand linked to non-deleted, non-cancelled inbound shipments counts as active inventory ownership. Canonical orders table inbound cells use this to route inventory-owned rows to the Inventory/Inbounds workspace while preserving the manual inbound status modal for non-inventory-owned rows; inventory-owned rows display the linked inbound shipment status label when exactly one shipment owns the row.
  - when the selected payment option applies C.C.C, the API repairs display C.C.C from `baseInvoiceTotal` and `ccc_percentage`; root `meta.ccc` is treated as a display cache and is ignored when stale or when a non-card method is selected
  - Expo order list cards adapt the flat `sales.getOrders` row into their stable nested mobile view model; quote lists still consume `sales.quotes`
  - legacy `sales.index` / `sales.quotes` DTO rows keep `invoice.total`, `invoice.paid`, and `invoice.pending` principal/base-only while also exposing display-only `invoice.baseTotal`, `invoice.displayCcc`, `invoice.displayTotal`, `invoice.displayPending`, and `invoice.displayPaid` for legacy/mobile quote card and overview surfaces
- Sales print C.C.C footer contract:
  - `print.salesV2` and `/api/download/sales-v2` accept optional `pageBreakMode = "section" | "header" | "fullHeader"` for sales-v2 PDF pagination policy. The default is `header`. Non-default modes are render-time presentation options and bypass stored snapshot streaming so a request for `section` or `fullHeader` does not accidentally receive a cached/default PDF.
  - Sales print presentation defaults are stored at `sales-settings.meta.print` as `{ templateId: "template-1" | "template-2", pageBreakMode: "header" | "section" | "fullHeader", showImages: boolean, headlineFirstPage: boolean }`; missing or invalid settings normalize to V2, compact header pagination, images on, and first-page-only headline.
  - `print.salesV2`, `/p/sales-invoice-v2`, `/p/sales-document-v2`, and `/api/download/sales-v2` carry `templateId`, `pageBreakMode`, `showImages`, and `headlineFirstPage`. Non-default content/template query overrides bypass default stored-PDF streaming, and single-order snapshot reuse requires an exact normalized renderer-config match.
  - `print.salesV2` footer/meta payloads keep stored `SalesOrders.grandTotal` and `amountDue` as principal-only values
  - unpaid card-selected records split principal due from the payable card total using customer-facing labels: `Order Due Amount`, `Estimated Card Fee`, and `Total if Paying by Card`
  - paid and partially paid records use one compact customer summary: `Order Total`, optional aggregated `Card Fees`, `Total Paid`, and principal-only `Balance Due`
  - `Total Paid` equals principal applied to the order plus safely matched recorded card fees; print omits `Card Fees` and does not infer historical fees when exact payment metadata is unavailable
  - transaction-level `Card Payment`, `C.C.C on Card Payment`, `Charged to Card`, and `Paid Toward Order` rows remain available on internal finance/transaction surfaces but are not emitted in customer PDF/preview footers
  - print loads `SalesPayments.meta`, linked `CustomerTransaction.meta`, and linked `SquarePayments.meta` for recorded C.C.C extraction, but shared transaction metadata is ignored when its base amount does not match the printed order's payment row
- Sales overview invoice breakdown contract:
  - overview DTO `costLines` use the same C.C.C/payment state helper as print so the old overview sheet, new overview Finance tab, and overview summary tab render the same labels and amounts without client-side C.C.C calculation
  - unpaid card-selected estimate lines repair C.C.C from the current principal `amountDue` before rendering `Order Due Amount`, `C.C.C`, and `Total Due With C.C.C`; partial/mixed records continue to show only safely matched recorded card-charge metadata
  - `sales.getSaleOverview` includes non-deleted payment rows plus linked transaction/Square metadata for recorded C.C.C extraction
  - `sales.getSaleOverview` is a single-document contract and resolves by exact `orderId` plus sales `type`; list/search-style partial order matching belongs to list endpoints, not the overview fetch
  - order overview rows include `inventoryInboundOwnership` with `hasInventoryInbound`, `linkedInboundIds`, compact `linkedInbounds[]` shipment summaries, `linkedInboundCount`, `linkedDemandCount`, `primaryInboundStatus`, and `canUseManualInboundStatus`. The flag is true when non-cancelled inventory `InboundDemand` rows are linked to active inbound shipment items for the sale, matching the manual inbound-status server guard; deleted or cancelled shipment links no longer keep the order in inventory-owned inbound mode. Overview status badges display the inventory inbound shipment state when inventory owns the status.
  - `sales.getSaleOverview` also returns `overviewItems[]` for mobile/document
    overview surfaces. Each bounded non-deleted sales line now includes `id`,
    display `title`, `subtitle`, `qty`, `total`, `swing`, compact configuration
    steps, and door dimension/handing/no-handle evidence. The overview also
    exposes `customerProfile`, `taxSummary`, `shippingAddressConfigured`, and,
    for orders, `documentReadiness` with `ready`, `on_demand`, `stale`,
    `generating`, or `failed` status. Shipping readiness requires a saved
    shipping-address street field; billing/customer fallback display data does
    not satisfy it. Reading an on-demand document state does not generate a
    PDF. Order views may still prefer dispatch-enriched item rows when dispatch
    data is available. Overview tax/configuration evidence filters soft-deleted
    taxes and form steps before projection.
  - overview payment progress remains principal/order-based; when cost lines expose card-inclusive actuals, both old and new overview surfaces may add `Card Paid` or `Card Pending` alongside the principal paid/pending values
  - mobile overview consumers may use `invoice.displayTotal`, `invoice.displayPending`, and `invoice.displayPaid` for visible card-adjusted amounts, while `invoice.total`, `invoice.pending`, and `invoice.paid` remain the principal/order progress source
  - `sales.updatePaymentMethod({ salesId, paymentMethod })` updates order metadata for unpaid orders only, mirrors the value into `meta.newSalesForm.form.paymentMethod` when present, and rejects fully paid orders whose principal `amountDue` is zero or below
  - changing an unpaid order to a C.C.C-applicable payment method recalculates display/backfill `meta.ccc` from the current principal `amountDue`, not the original order total, so prior payments do not inflate the remaining card-payable estimate
  - overview DTOs expose `salesRepId` alongside the display `salesRep`/initials so client surfaces can distinguish the current owner from eligible transfer targets
  - `sales.salesRepOptions({ salesId })` returns active internal sales/order-capable users with `{ id, name, email, initials, roles }` only when the referenced order or quote is assigned to the signed-in user
  - `sales.transferSalesRep({ salesId, salesRepId, reason?, password })` accepts positive integer ids, an optional note up to 500 characters, and confirmation with either the signed-in owner's account password or the configured, case-sensitive master password; it supports orders and quotes and rejects deleted sales, ineligible targets, invalid credentials, and any actor whose user id does not match the sale's `salesRepId`
  - successful account-password transfer updates only `SalesOrders.salesRepId` and writes a structured `SalesHistory` row with previous rep, next rep, actor id/name, order id, and reason
  - successful master-password transfer writes the sale update, `SalesHistory`, and `MasterPasswordLoginAudit.usageType=SALES_REP_TRANSFER` row atomically; the usage row snapshots request/device/location evidence and the order/quote type and number, and an audit failure rejects and rolls back the transaction
  - selecting the order's current rep is a no-op response with `changed=false` and creates neither duplicate history nor transfer-usage audit
- Sales payment processor C.C.C contract:
  - payment previews and payment writes calculate C.C.C from the external principal being applied to the current outstanding balance after wallet credit and prior payments
  - overpayment wallet credit may be included in the external customer charge, but it must not expand the C.C.C fee base beyond the remaining principal due
- Sales payment processor customer receipt contract:
  - `salesPaymentProcessor.applyPayment` queues `sales_customer_payment_received` only when `notifyCustomer === true`; omitted, null, or false values return `customerReceiptQueueStatus: "not_requested"`
  - successful receipt queueing returns `customerReceiptQueueStatus: "queued"`; recipient, payload, or notification queue failures return `"failed"` without rejecting or rolling back the completed payment
  - recipient resolution prefers a trimmed billing email and falls back to the trimmed customer email, permits customer-name differences when all sales normalize to one email, and rejects missing or genuinely mixed recipients
  - invoice PDF rendering failure is logged and the receipt is queued with `invoicePdfAttachment: null`
  - `sales_customer_payment_received` is a direct-recipient channel and does not use notification subscribers or fallback recipient processing
- Legacy sales form C.C.C display contract:
  - legacy form pricing keeps `pricing.grandTotal` as the base order total used for persistence and due calculations
  - legacy form pricing exposes `pricing.totalWithCcc = pricing.grandTotal + pricing.ccc` for the visible payable total when the selected payment method applies C.C.C
  - legacy form hydration derives fallback display C.C.C from `payment_option`, `ccc_percentage`, and stored base `grandTotal` when root `meta.ccc` is missing
- Sales overview transaction contract:
  - `sales.getSaleTransactions({ orderNo?, accountNo? })` returns display-ready customer transaction rows for the overview Transactions tab
  - when `orderNo` is supplied, both the transaction query and nested `salesPayments` rows are scoped to that order so multi-order customer transactions do not display unrelated order payments
- Sales inbound management contract:
  - `sales.inboundIndex` rows now expose the same `inventoryInboundOwnership` object as `sales.getOrders`. The inbound-management action opens the order Inventory/Inbounds workspace for inventory-owned inbound work and keeps the legacy manual update action for orders that have not entered inventory-owned inbound; the status column uses the linked shipment status label for inventory-owned rows instead of the stale manual order prompt.
- Product report contract:
  - `sales.getProductReport` returns enabled sales-form step components only: the component row and parent step must not be deleted, archived custom components with `meta.deletedAt` are excluded, and the row must have scoped order-backed usage through priced step forms, sales doors, or house-package moulding records
  - default ordering is by computed sales usage count descending, then units descending, then product name/id tie-breakers
- Manual order inbound status contract:
  - `SalesOrders.inventoryStatus` stores `AVAILABLE | ORDERED | PENDING ORDER`
  - `newSalesForm.saveDraft` / `saveFinal` accept optional `inventoryStatus` for orders and return it in the saved payload
  - `newSalesForm.get` / `bootstrap` return top-level `inventoryStatus`
  - `notes.saveInboundNote` updates the order-level status and creates an `inventory_inbound` order note; `PENDING ORDER` also creates unread recipients for inbound-channel subscribers
  - `notes.saveInboundNote` rejects manual status updates through the shared `inventoryInboundOwnership` rule when the order already has non-cancelled inventory `InboundDemand` linked to an active `InboundShipmentItem` / `InboundShipment`; inventory-created inbound work owns status from that point, and operators should update the linked inbound shipment instead. Cancelled or deleted inbound shipments do not keep blocking manual order status recovery.
- New sales form save completion contract:
  - `newSalesForm.saveDraft` / `saveFinal` return after the sales form record is persisted
  - both save inputs accept an optional development-only `clientRequestId` (a bounded opaque string); it is used only to correlate mobile diagnostics with the API `requestId` and is not persisted into the order payload
  - follow-up sales-document snapshot expiration, Trigger queue work for sales inventory line-item sync, and document snapshot warmups are best-effort and bounded; timeout/failure must not change the save response payload or leave clients waiting indefinitely
  - in development only, the API captures parsed save payloads for debugging under `debug/new-sales-form-save-payloads/YYYY-MM-DD/*.json` and emits ingress/payload-captured/core-complete/post-save-complete stage timings with both request ids; this capture has no persistence side effect, is not active in production, and file-write failures are logged without failing the save
- Mobile sales dashboard contract:
  - `sales.mobileDashboardOverview.recentSales[]` returns card-ready recent order rows with `id`, `orderId`, `customerName`, `customerPhone`, `total`, `due`, `paid`, `createdAt`, and `deliveryOption`
  - recent sales rows also include display-only `displayTotal`, `displayPending`, and `displayCcc` so mobile recent-sales cards can show C.C.C-adjusted card totals without changing principal `total`, `due`, or `paid`
- Inventory browser validation fixture report contract:
  - `inventories.inventoryBrowserValidationFixtureReport` returns `status`, `summary`, `fixtures`, `missingFixtures`, `diagnostics`, and `nextAction`
  - every fixture row includes package-owned `workspaceHref`, `recommendedAction`, `seedFixtureId`, `seedPlanHref`, bounded `samples`, and `countDiagnostic`
  - `missingFixtures` includes the same seed-plan identifiers so blocked reports can be converted directly into the controlled fixture seed plan
  - `diagnostics.seedFixturesToPrepare` groups missing fixture categories by `seedFixtureId`, preserving category keys/labels so an operator can prepare one seed fixture that satisfies multiple blocked categories
  - `countDiagnostic.countSource` is `sql_count` for complete database counts or `bounded_application_scan` for readiness categories that require application-level metadata/stock math
  - `countDiagnostic.complete=false` means the readiness count may be underreported because only a bounded candidate set was scanned; the current bounded categories are held partial shipment lines and low-stock monitored variants
- Sales inventory overview contract:
  - `inventories.salesInventoryOverview({ salesOrderId })` continues returning the sale, line items, and summary, and now also returns `groups[]` plus merged top-level `rows[]` for sales overview Inventory tabs
  - Inventory overview rows include `supplierCount`, sorted `supplierNames`,
    and `hasSupplierPrice`, derived only from active, non-deleted supplier
    variants. Sales Overview uses this evidence for the read-only manager
    production-preflight projection.
  - `inventories.orderInboundShipmentCount({ salesOrderId })` accepts a positive integer sale id and returns the active linked inbound-shipment count without loading shipment items; the Inventory tab uses it for the inactive Inbounds badge and falls back to the detailed list only while the count is loading
  - `salesInventoryOverview` also returns lifecycle/setup metadata for the Inventory tab: `lifecycleStatus`, `lifecycleLabel`, `lifecycleTone`, `fulfillmentStatus`, `setupMode`, and `hasInventoryIntegration`. `setupMode` is `active` when merged inventory rows exist, `not_configured` for active orders that can still self-sync, `legacy_status_locked` for active orders with a manual `SalesOrders.inventoryStatus` but no inventory rows, and `completed_readonly` for fulfilled orders with no inventory rows so historical orders do not create new inventory demand after fulfillment.
  - `salesInventoryOverview` returns operation policy metadata: `operationMode`, `capabilities`, `isInventoryReadOnly`, and `inventoryActionBlockReason`. These capability flags are the UI contract for whether the current sale may sync inventory, create inbound, allocate stock, mark available, or configure tracking. Fulfilled and cancelled orders return read-only capabilities even when existing inventory rows remain inspectable.
  - `inventories.syncSalesInventoryOverview({ salesOrderId })` runs the existing single-sale inventory line-item sync for one order and returns the package sync result; the sales overview Inventory tab uses it as a self-healing path when an opened order has no inventory-backed rows yet. `salesOrderId` must be a positive integer at the tRPC boundary, and the underlying `sync-sales-inventory-line-items` Trigger schema applies the same positive-integer requirement for repair/manual sync jobs. When sync removes stale components from a still-active line, child allocation/demand cleanup and component removal are guarded by the exact pre-read component identity: component id, parent line id, sub-component id, and inventory variant id. When sync removes stale inventory lines for sales items no longer present on the sale, it first soft-deletes only line items still tied to the same sale and stale sales item ids, then cleans allocation, inbound-demand, and component residue only under line items confirmed by that soft-delete write; `deletedCount` reports confirmed line writes.
  - `inventoryApplicability` includes `canVerify`. It is true only for active
    `not_applicable` orders whose last completed projection currently resolves
    to zero tracked needs and whose lifecycle has not passed the inventory
    repair boundary.
  - `inventories.verifySalesInventoryApplicability({ salesOrderId })` is the
    protected single-order challenge path for an active `N/A` result. It reloads
    the authoritative overview, requires `canVerify=true`, runs the canonical
    projection synchronizer with source `repair`, and returns the normal sync
    result. Missing orders return `NOT_FOUND`; stale or historical verification
    attempts return `PRECONDITION_FAILED`. Sync warnings/errors are not converted
    into a confirmed `N/A` result.
  - `inventories.resolveSalesInventoryLegacyStatusSetup({ salesOrderId, action, legacyStatus? })` is the per-order legacy adaptation contract for shared compatibility state `legacy_locked`, including configured/partially synchronized orders whose historical `ORDERED` or `PENDING ORDER` intent still lacks a linked inbound. Canonical actions are `continue | clear`; deprecated aliases remain accepted for one compatibility window as `override -> continue` and `reset -> clear`. `salesOrderId` must be a positive integer, and an optional `legacyStatus` is normalized then checked against the exact persisted status baseline. `continue` recognizes only `ORDERED`, `PENDING ORDER`, and `AVAILABLE`, runs line synchronization and status-specific materialization in one transaction, preserves the historical prompt, and writes one canonical migration history entry. Missing supplier resolution creates an inbound with `supplierId=null` instead of blocking or inventing a supplier. `clear` removes only the exact guarded prompt, synchronizes normally, and does not mutate linked or received inventory evidence. Unsupported non-empty values are blocked for review.
  - The legacy adaptation response includes canonical `action`, original `requestedAction`, `result = migrated | migrated_with_review | already_migrated`, normalized `legacyStatus`, sync counts/warnings, `createdInbounds[]`, `advancedInboundIds`, `fulfilledComponentCount`, `protectedComponentIds`, `unresolvedSupplierDemandIds`, `linkedInboundIds`, `nextSegment`, `noPhysicalStockChange`, and user-facing `messages`. `unresolvedSupplierDemandIds` records which demand was placed on a supplier-less inbound; it is informational and does not make the migration partial. Protected fulfillment evidence can still produce `migrated_with_review`.
  - `sales.getOrders` and `inventories.salesInventoryOverview` return the shared `inventoryLegacyCompatibility` contract: state, normalized status, display label/tone/description, recommended action, clear/continue capabilities, destination segment, shipment/need target, and reason code. Active linked inventory inbound ownership remains higher precedence than legacy state.
  - each group represents an invoice item with `label`, `qty`, `rows[]`, and totals for required, in-stock, allocated, pending, and cost
  - top-level `rows[]` is the Inventory-tab display contract: matching component/category/variant rows are merged across invoice items, demand quantities are summed, and physical stock is reported once per inventory variant instead of multiplied by every invoice item occurrence
  - each row includes component name, step/category name, required qty, summed physical stock qty from active `InventoryStock` rows, allocated qty, pending qty, open inbound qty, linked open inbound qty, cost, sales price, status, tracking policy, inventory ids, variant SKU, merged component ids, inbound demand ids, unassigned pending inbound demand ids, pending stock allocation ids, and action eligibility
  - each row also includes derived requirement display fields: `requirementStatus`, `requirementLabel`, `requirementShortLabel`, and `canEditInboundStatus`. Rows with `trackingPolicy != tracked` or `qtyRequired <= 0` return `not_applicable` / `Not Applicable` / `N/A` and cannot edit inbound status from the row; tracked rows with positive required quantity return `required`.
  - `inventories.salesInventoryTrackingChangeRepairPreview({ inventoryCategoryId, limit? })` returns a read-only repair preview after stock tracking becomes stricter. The response includes `eligibleOrderCount`, `skippedReadOnlyOrderCount`, `totalPendingQty`, bounded `orders[]` with order id, lifecycle, pending qty, and component names, plus `truncated`. Orders at `ready_to_fulfill`, fulfillment-stage, fulfilled, or cancelled lifecycle states are skipped instead of mutated.
  - `inventories.createInboundShipmentFromDemands` accepts existing demand ids and/or selected sales line-item component groups with requested qty, optional initial `status` (`pending` or `in_progress`), and an optional trimmed activity `note` up to 2,000 characters. `supplierId` is optional/nullable; expected date and PO/reference are also optional, so status plus selected demand is a valid creation request. `supplierId`, `demandIds`, `lineItemComponentIds`, and selected component ids must be positive integers when supplied, and each selected component `qty` must be positive before the API prepares demand. When component selections are supplied, the API prepares only the requested pending `InboundDemand` quantity for monitored stock inventory rows before creating the inbound shipment, splitting an existing unlinked pending demand when the requested qty is smaller than its outstanding qty. Shipment item planning and linking only use active unassigned demand rows; item quantity is committed only from rows confirmed linked by guarded writes that match the pre-read `qtyReceived` baseline and through a final parent-inbound active-state guard, already-linked or concurrently received demand rows are ignored for new shipment quantity, and a request with no unassigned demand fails before creating a new inbound shipment. Empty item and empty shipment cleanup after zero confirmed links is also guarded by the created inbound remaining non-deleted and non-terminal.
  - `inventories.createInboundShipmentFromDemands` rejects terminal fulfilled/cancelled parent sales before preparing or splitting demand rows, then creates the inbound shipment, links demand, and sets affected `SalesOrders.inventoryStatus` values to `ORDERED` in one transaction. The status update and activity order references are derived from demand rows confirmed linked by the package result, not the original requested/candidate ids. The response returns `updatedSalesOrderCount` for linked inventory-created inbound work.
  - `inventories.assignInboundDemands({ inboundId, demandIds })` requires a positive-integer `inboundId` and a non-empty positive-integer `demandIds` array, then assigns existing demand rows to a non-deleted, non-terminal inbound shipment using the same active unassigned-demand and confirmed-link rule as create-inbound. The API wraps package assignment in one transaction so demand links and shipment item quantity updates commit together. Existing inbound shipment item rows are incremented atomically by confirmed linked quantity from rows whose link writes match the pre-read `qtyReceived` baseline instead of rewritten from stale demand/item pre-reads, and the item quantity commit is guarded by the parent inbound remaining non-deleted and non-terminal. Already-linked or concurrently received demand fails before mutating shipment items, and concurrently claimed demand that leaves zero confirmed links fails instead of recording a no-op assignment; any newly-created empty item cleanup is also parent-state guarded.
  - `inventories.salesInventoryMarkAsPreflight({ salesOrderIds, action })` reviews configured inventory rows and pending production material reviews before shared `SalesMenu.MarkAs` production-complete or fulfilled tasks run. `salesOrderIds` must be a non-empty positive-integer array of at most 100 ids before the preflight can run. Orders with no inventory-backed rows and no pending review remain allowed so legacy Mark As behavior is preserved. A configured blocker or pending review returns `ok=false` plus inventory blockers and an `automation` summary: affected order count, pending review/submission/quantity, linked active inbound shipment/item/remaining quantity, residual availability component count, automatic payment-review effect, and whether dispatch completion follows.
  - `inventories.resolveSalesInventoryMarkAsAutoForContinue({ salesOrderIds, action })` is the transitional Mark As Fulfilled auto-resolution mutation for active, non-terminal orders. It uses the same positive-integer batch guard as the preflight route, rejects fulfilled/cancelled orders before writes, approves active pending-review stock allocations, creates missing `InboundDemand` rows for remaining monitored-stock shortages, groups and creates inbound shipments by preferred supplier/default supplier/fallback `Auto-created inbound`, links demand rows to those shipments, recomputes affected components, updates orders with linked inbound demand to `ORDERED` and allocation-only orders to `AVAILABLE`, writes `SalesHistory` audit rows, reruns preflight for evidence, and returns `continueAllowed=true` once blockers have been converted into allocation or inbound work. The normal preflight may still report awaiting inbound after this mutation because receiving has not happened yet; the fulfilled Mark As UI intentionally continues during this transitional operating mode.
  - `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue({ salesOrderIds, action })` retains the safe availability-repair contract: it cancels only unlinked mutable `pending` / `ordered` `InboundDemand` rows with no received quantity, stamps and confirms the exact changed rows, recomputes affected components, updates only confirmed resolved orders to `AVAILABLE`, and continues only when the post-mutation preflight is clean.
  - `inventories.fulfillSalesInventoryNeedsManually({ salesOrderId })` requires `editOrders` and a positive order id. It resolves only active monitored inventory components that are visible as pending Needs, sets those component statuses to `fulfilled`, clears their projected inbound quantity, and cancels only unlinked/unreceived mutable demand. It does not increase stock, allocation, or receipt quantities. Linked or partially received inbound-owned components are preserved and returned as `protectedComponentIds`; the order prompt becomes `AVAILABLE` only when no protected applicable need remains. The response reports fulfilled/protected component counts, cancelled demand count, and resulting inventory status, while `SalesHistory` records the actor and `noPhysicalStockChange=true`.
  - `inventories.overrideSalesInventoryMarkAsAvailabilityForContinue({ salesOrderIds, action })` is the backward-compatible endpoint name for the explicit `Receive, approve and continue` orchestration. It requires `editOrders`, `editInboundOrder`, and `editProduction` together so newly appearing dependencies cannot cross a preview/execution permission boundary. It receives every remaining item on each linked shipment through `receiveInboundShipment`, resolves tracked needs through canonical manual fulfillment, approves every pending production material review after fresh evidence, and records the existing `sales_inventory_mark_as_availability_overridden` history only for residual legacy/configuration checks. It returns actual inbound/review/manual/override counts plus the initial and remaining preflight. The client starts the existing production or fulfillment task only when `continueAllowed=true`.
  - `inventories.salesInventoryInboundStatusBackfillPreview({ limit?, cursor? })` is a bounded read-only dry-run for Phase 8 repair planning. It returns active inventory-owned inbound orders whose legacy `SalesOrders.inventoryStatus` is null or not `ORDERED`, plus `inventoryInboundOwnership` summaries, page-level `sampledMismatchCount`, global `totalMismatchCount`, `nextCursor`, and `hasMore`. It performs no repair or mutation; `status` reflects the global total rather than only the current page.
  - `inventories.repairSalesInventoryInboundStatusBackfill({ salesOrderIds, dryRun? })` is the explicit reviewed repair path for Phase 8 samples. `dryRun` defaults to `true`; apply mode requires `dryRun=false`, accepts only explicit positive order ids, revalidates active inventory-owned inbound demand plus stale legacy status at mutation time, and also guards the write by the exact legacy `SalesOrders.inventoryStatus` value captured in the reviewed candidate. Only matched rows confirmed by that guarded write are set to `ORDERED` and receive `SalesHistory` audit rows with previous status, linked inbound ids, linked demand count, and triggering user metadata. The response reports `status` (`clean` or `needs_backfill`), requested, matched, applied, skipped ids, `skippedSalesOrderReasons`, and post-run `remainingMismatchCount` / `remainingCandidates` so operators can compare apply results with the preview and see any still-stale rows after concurrent changes. Initial skip reasons are `already_ordered`, `missing_or_ineligible_order`, `no_active_inventory_inbound`, or fallback `not_matching_candidate`; apply-time revalidation skips use `changed_before_apply`.
  - `inventories.backfillSalesInventorySync({ salesOrderIds?, cursorId?, batchSize?, includeAlreadySynced?, source? })` queues the `backfill-sales-inventory-line-items` Trigger repair job. `salesOrderIds`, when supplied, must be a non-empty positive-integer list capped at 200 and the job reads exactly that targeted set instead of truncating it by `batchSize`; cursor-based repair runs keep using the bounded `batchSize` and `cursorId` pagination contract.
  - `inventories.cleanupStaleSalesInventoryLineItems({ lineItemIds?, limit?, dryRun? })` is the explicit stale inventory sale-line cleanup contract. `dryRun` defaults to `true`; when `lineItemIds` is supplied it must be a non-empty positive-integer list so an explicit empty targeted repair request cannot broaden into the default stale-line scan, and `limit` must be an integer from 1 to 500. Apply mode first soft-deletes only line items still matching the stale predicate for missing/deleted parent sales, then releases stock allocations, cancels inbound demand, and removes components only under line items confirmed by that soft-delete write. If a stale pre-read line is restored or reassigned before apply, child cleanup is skipped and response counts remain tied to confirmed writes.
  - sales overview row-level `Allocate available stock` approves pending stock allocation ids through the bulk allocation approval contract; inbound creation is a stock-scoped mutation contract. Stock allocation approve/reject/bulk-approve mutations require positive-integer allocation ids before planning, bulk approval requires a non-empty id list, and single approval requires a positive `approvedQty` when an override quantity is supplied. The mutations run in an API transaction that first resolves each active pending allocation's parent sale lifecycle and rejects fulfilled/cancelled parent sales before allocation writes or component recomputes run.
  - `inventories.shipAvailableSalesInventory({ salesOrderId, lineItemIds?, deliveryMode?, deliveredTo?, authorName?, note? })` requires positive-integer `salesOrderId` and positive-integer `lineItemIds` when supplied, then consumes planned component allocations through guarded status/quantity writes before creating completed `OrderDelivery` / `OrderItemDelivery` compatibility rows. If a planned allocation consume is stale or concurrently claimed, the mutation rejects before delivery rows, sales inventory status updates, backorder demand creation, or component recompute evidence are committed. Successful responses keep `shippedQty` at sale-line grain and `consumedAllocationQty` at component-allocation grain.
  - `inventories.setSalesInventoryLineFulfillmentHold({ lineItemId, holdUntilComplete, note? })` requires a positive-integer `lineItemId` before updating the line-level hold-until-complete flag.
  - `inventories.assignInventoryDispatchAllocations`, `inventories.packInventoryDispatchAllocations`, and `inventories.releaseInventoryDispatchAllocations` accept optional `salesOrderId`, `lineItemIds`, and `allocationIds`, but all supplied ids must be positive integers before dispatch transition planning runs.
  - `inventories.fulfillInventoryDispatch({ salesOrderId, lineItemIds?, allocationIds?, deliveryMode?, deliveredTo?, authorName?, note? })` requires positive-integer `salesOrderId` plus positive-integer line/allocation ids when supplied before consuming picked allocations or writing delivery compatibility rows.
  - `inventories.orderInboundShipments({ salesOrderId })` returns inbound shipments linked to a sale through `InboundDemand`, including shipment items, stock-line received/ordered quantities, demand rows, and order-scoped counts for the sales overview Inventory `INBOUNDS` segment
  - `inventories.inboundShipments` returns general inbound rows with `linkedOrders[]` summary data, including order id, type/status, customer name/business name/phone, demand qty, received qty, demand count, and amount due/grand total where available
  - `inventories.receiveInboundShipment({ inboundId, receivedAt?, items? })` requires a positive-integer `inboundId`. When `items` is supplied, each `inboundShipmentItemId` must be a positive integer and `qtyReceived`, `qtyGood`, `qtyIssue`, and `unitPrice` must be nonnegative numbers when present. The mutation then receives inbound items using persisted good/issue quantities as the retry baseline and runs stock updates, stock movements, demand receipt, item updates, issue creation, component recompute, and shipment status update in one API transaction. Closed, cancelled, or deleted shipments are rejected before receipt writes begin, and the final shipment status update is guarded against concurrent `closed` / `cancelled` / deleted state. New good/issue receipt deltas are capped at the planned inbound item quantity, while already-persisted overages are preserved and not downgraded. Before stock, movement, issue, or demand writes run for a new receive delta, the shipment item row must be updated with a guarded baseline match on persisted good/issue quantities; if that guard skips, the item is reported as skipped and no downstream receive writes run for that stale snapshot. Existing stock rows use atomic quantity increments guarded by active stock row identity; stock movement and inventory log evidence are written only after that guard succeeds and the post-increment quantity is re-read. Demand receipt rows use guarded baseline/status updates; skipped stale demand rows do not consume the receipt quantity, and component recompute only runs for confirmed demand receipt writes while the component row remains active. Duplicate receives preserve the original `receivedAt` timestamp, avoid duplicate issue rows, avoid rewriting shipment item quantity/unit-price fields when there is no new receive delta, and keep `issue_open` when open item issues already exist. If `items` is omitted, all shipment items are planned for receipt; if `items` is provided, only those shipment item ids are received, omitted rows keep their persisted received quantities, and duplicate or non-shipment item ids are rejected before mutation.
  - `inventories.reportInboundItemIssue({ id?, inboundShipmentItemId, issueType, reportedQty, status?, resolutionType?, resolvedQty? })` requires positive-integer `id` and `inboundShipmentItemId` values when supplied, requires `reportedQty` to be positive, and accepts only nonnegative `resolvedQty` before creating or updating an inbound item issue.
  - `inventories.resolveInboundItemIssue({ issueId, status?, resolutionType?, resolvedQty? })` requires a positive-integer `issueId` and nonnegative `resolvedQty` when supplied before updating an inbound item issue resolution.
  - `inventories.updateInboundShipmentStatus({ inboundId, status, note? })` requires a positive-integer `inboundId`, accepts an optional trimmed activity note up to 2,000 characters, then updates an inbound shipment lifecycle status through a guarded write that requires the shipment to still be non-deleted and at the status observed before mutation. It records an `inventory_inbound_activity` event with `activityType=status_updated`, the operator note, and deduplicated linked sales order numbers so Sales Overview activity filters can resolve the lifecycle event. When the target status is `cancelled`, unreceived active demand linked to that cancelled parent inbound is released back to unassigned `pending` demand. Affected line-item components are recomputed only from demand rows confirmed released by guarded writes while the component row remains active, and the response/activity metadata include `releasedDemandCount` and `recomputedComponentCount`.
  - inbound lifecycle activity payloads carry a `lifecycleEventId`; the notification channel is synced before writing, and `inventory_inbound_activity` creates the timeline note through the standard notification handler even when no channel recipients are configured. Repeated array tag values such as duplicate `orderNos` are deduped before `NoteTags` writes.

## TODO
- Document canonical contracts for sales, checkout, dispatch, notifications, and document workflows.

## Sales document email attachment contract (2026-07-22)

- `simple_sales_document_email` no longer accepts or emits `skipPdfAttachment`.
- Simple and composed sales document emails always attempt to render one PDF attachment for the selected order/quote documents.
- A PDF render failure is non-fatal: the email may still send with its signed PDF download link, and the failure is logged for diagnosis.
- Attachment behavior is deterministic across development and production and is not gated by an environment variable.

## Sales document channel delivery contract (2026-07-23)

- `composed_sales_document_email` accepts explicit `email`, `whatsapp`, and
  `sms` channel intent; omitted intent defaults to email for backward
  compatibility.
- Email requires customer and sales-rep email. WhatsApp/SMS require one
  normalized valid customer phone and a generated secure PDF link.
- WhatsApp/SMS bodies use reusable `/sh/<slug>` PDF, payment, and
  quote-acceptance links and are bounded to 1,500 characters.
- Notification output exposes independent per-channel sent/skipped/failed
  counts and provider details. Requested skipped/failed channels are task
  failures from the operator's perspective.
- SMS is sent only through an explicitly configured Twilio adapter. Missing
  provider configuration produces a skipped result.

## Staff Square terminal payment contract (2026-07-22)

- Terminal payment submission requires a selected Square device id and a positive external amount.
- The API re-queries the configured Square location before checkout creation and matches `device:<id>` and `<id>` forms through one canonical device id.
- Only a device currently reported as `AVAILABLE` may be used. A stale, offline, unknown, or unverifiable device fails before Square checkout creation and before a local `SquarePayments` pending row is written.
- Device discovery is intersected with `PAIRED` `TERMINAL_API` device codes returned for the same Square application and location; merchant devices paired to another mode/application are not checkout candidates.
- Before checkout creation, the API creates a `PING` Terminal action with a 10-second deadline and polls through that full deadline plus a 2-second response grace period for `COMPLETED`. A device that does not acknowledge Connected mode fails with an operator-facing sign-in instruction; checkout creation and local pending-payment persistence do not run.
- Square Sandbox exposes the official successful simulated Terminal id and skips production-only pairing/`PING` gates because physical Square hardware cannot connect to the Sandbox.
- Square checkout creation runs before the local pending-payment write. When Square rejects the checkout, no pending local payment is recorded.
- The persisted terminal id and display name come from the server-observed Square device, not client-supplied display metadata.
- Active terminal checkout polling bypasses shared query-cache freshness and rechecks Square every two seconds. `CANCEL_REQUESTED` is not final; polling continues until `CANCELED`, which clears the client loading state, persists the local cancellation by Square checkout id, and tells the operator that no payment was applied.
- Applying a terminal payment does not trust the browser's reported state. The completion mutation must rebuild the selected `salesIds` and `orderNos`; the API rereads Square, rejects pending or canceled checkouts, refuses to finalize when no selected order was credited, and atomically claims the matching local row from `PENDING` to `PROCESSING`, records the order payment, then marks it `COMPLETED` with Square's verified tip. A checkout cannot be applied twice. Recovery may reclaim a `COMPLETED` row only when it has no linked `SalesPayments`, which repairs false-completed orphan rows without reopening a legitimately applied checkout.
- Operator cancellation uses Square's cancel-checkout operation. The local row remains pending while Square reports `CANCEL_REQUESTED` and becomes `CANCELED` only after Square confirms the final state; terminal dismissal is not used because it has payment-capture semantics.

## Sales Summary Money Contract (2026-07-20)

- Sales summary responses expose numeric `grandTotal`, `ccc`, and
  `totalWithCcc`.
- `grandTotal` is the order principal excluding C.C.C and is the value used for
  `SalesOrders.grandTotal`, `amountDue`, cash accounting, and order balance.
- `ccc` is the derived card/link/terminal charge calculated from the complete
  principal, including delivery, labor, flat labor, and other applicable costs.
- `totalWithCcc = grandTotal + ccc` is the card/link/terminal display amount.
- Older persisted summaries may omit `totalWithCcc`; hydration derives it
  without mutating `grandTotal`.
- Shelf `unitPrice` and `totalPrice` remain JSON numbers at API boundaries even
  though Prisma stores `DykeSalesShelfItem` values as `Decimal(12,2)`.
- Grouped service, shelf, and moulding metadata may include numeric
  `rateRoundingAdjustment` and `totalAuthoritative: true`. Consumers must use
  `lineTotal`, not `unitPrice × qty`, for save, print, summary, sync, and
  payment calculations.
## Storefront contracts (2026-07-20)

- A Storefront Offer references one canonical Dyke root component and route.
- Cart/wishlist lines persist normalized configuration, configuration hash and
  version, canonical pricing snapshot, root identities, quantity, and
  validation state.
- Checkout input contains customer/address/fulfillment/payment intent only;
  accepted line prices, tax, delivery, card charge, and final total are
  recomputed by the server.
- When an active calculated-shipping policy exists, Delivery checkout requires
  a non-expired, owner/cart-matched quote for the selected Google Place. V1
  quote amounts remain provisional; V2 may return `AUTO_APPROVED` only without
  calculation or confidence blockers.
- Shipping line evidence uses catalog Door per-unit override then canonical
  size profile; catalog Moulding pounds-per-LF override then the general
  pounds-per-shipped-LF setting; and catalog Shelf per-unit override then
  child/parent category pounds per unit. Unmapped, route-failed, out-of-area, or
  capacity-blocked quotes require manual review.
- Shipping settings project Door dimensions from Dyke
  `doorSizeVariation`/Height data plus Door pricing dependency dimensions, and
  Shelf rows from active parent `DykeShelfCategories`. Product-specific
  overrides belong to
  `StorefrontComponent.metadata.shipping`; policy save no longer accepts manual
  product override or Moulding profile JSON.
- Catalog Shelf metadata carries the numeric `DykeShelfCategories.id`, and
  catalog family behavior is resolved from the canonical Dyke source step
  rather than a public Storefront category slug/title.
- The active legacy policy remains read-compatible. Settings returns a legacy
  configuration summary, and `saveShipping` requires
  `acknowledgeLegacyReplacement=true` before replacing unrepresentable legacy
  mappings with the typed settings/catalog model. The prior immutable version
  remains available as rollback evidence.
- Payment-link creation accepts shipping only in `AUTO_APPROVED`, `APPROVED`,
  or `OVERRIDDEN`. Office finalization transactionally updates checkout totals,
  canonical Sales Delivery extra cost, `grandTotal`, and `amountDue`.
- Successful checkout returns the canonical storefront checkout and standard
  Sales Order identity. Retries use idempotency and cannot create a second
  charge or order.
- Availability is an online merchandising/lead-time policy, not an inventory
  reservation guarantee.
- Public and guest storefront calls use the allowlisted
  `/api/storefront/trpc` endpoint. Guest ownership comes from the signed guest
  cookie; customer ownership may come from the existing chunked secure
  NextAuth session cookie.

### Storefront profile pricing and promotion contract (2026-07-24)

- Pricing profile precedence is signed-in customer's active global profile,
  active global storefront default profile, then canonical Sales pricing.
- Dealer-owned, soft-deleted, or missing profiles are ignored. Public payloads
  never include profile coefficients or target membership.
- Campaign start is inclusive and end is exclusive. `endsAt = null` means no
  scheduled end; archiving still disables the campaign.
- Target audience matches selected customer OR selected resolved profile.
  Product scope matches selected category OR selected offer.
- Eligible campaigns do not stack. Winner order is percentage descending,
  priority descending, start descending, then ID ascending.
- The profile adjustment runs before the campaign percentage. Percentage
  discount is calculated once on the authoritative full line total with
  decimal money helpers.
- Cart pricing snapshots include private profile/campaign identity and public
  list/final totals. Guest-to-customer merge and checkout both reprice.
- Checkout reports `PRICE_CHANGED` when profile, campaign, list total, or final
  total differs from the accepted line snapshot.
- Sales persistence receives the resolved customer profile, one fixed
  `Discount` extra-cost adjustment per applied campaign, and private
  storefront pricing metadata.

## Custom millwork inquiry contract (2026-07-22)

- A custom brief requires at least one canonical project type, property type,
  city/state/postal code, a 20-character description, contact name/email, and a
  contact preference. Dimensions, materials, budget, target date, fulfillment
  notes, and phone are optional except phone is required for phone-only contact.
- Attachment finalization accepts no more than five verified private files.
  Each file is at most 10 MB and must be JPEG, PNG, WebP, HEIC/HEIF, or PDF.
  Upload authorization also atomically requires `DRAFT` state and fewer than
  five prior authorizations, so a reusable client token cannot upload after
  submission or exceed the server-side cap.
- Submission is idempotent for an inquiry/upload token pair and returns the
  stable customer reference. Notification delivery is outside the commit and
  cannot change submission success.
- Inquiry statuses are `DRAFT`, `NEW`, `IN_REVIEW`, `AWAITING_CUSTOMER`,
  `QUOTE_CREATED`, `RESPONDED`, `CLOSED`, and `SPAM`; transitions are validated
  by the shared sales-domain state machine. `DRAFT` and `QUOTE_CREATED` are
  system-owned and cannot be selected through the generic office status mutation.
- Quote conversion requires a linked office customer and assigned rep. Repeated
  conversion returns the already-linked quote rather than creating another. If
  the Sales write committed before inquiry linkage, retry locates the unique
  storefront-inquiry origin metadata and repairs the link instead of duplicating
  the quote.
- Configuration preview may validate a partial selection and returns
  `complete: boolean`. Cart, wishlist, and checkout writes still require a
  complete server-valid configuration. Hidden, unavailable, and explicitly
  waived dependent steps do not block completion.
- `NotificationOptions.forceInAppRecipients` is reserved for mandatory,
  explicitly addressed operational notices. Storefront order review uses it
  for the assigned sales rep; it does not enable email or WhatsApp delivery.

## Workflow component catalog contracts (2026-07-21)

- All writes identify existing active catalog components by positive numeric
  `componentId`; batch visibility/archive inputs require a non-empty id list.
- Visibility is `variations[]` (OR), each containing non-empty `rules[]` (AND).
  A rule contains canonical `stepUid`, `operator = is | isNot`, and non-empty
  `componentsUid[]`; server validation requires every target to remain active
  under the referenced step.
- Details and section writes merge only their owned fields. Component metadata
  unrelated to `variations` or `sectionOverride` is preserved.
- Redirect targets must resolve to an active canonical Dyke step; null clears.
- Pricing rows accept optional ids, dependency keys, and nullable prices. Any
  supplied row id must belong to the target component UID before mutation.
- Archive writes `DykeStepProducts.deletedAt`; it never deletes sale-line or
  selected-component snapshots already persisted in sales JSON/rows.
- The shared `saveDykeStepComponent` helper persists `productCode` on both
  update and create paths.

## Sales order inventory repair contracts (2026-07-22)

- `inventories.salesInventoryOrderRepairPreview` accepts `{ salesOrderId }` and
  returns exact row baselines for active inbound demand and non-terminal stock
  allocations. Safe rows are unlinked/unreceived `pending` or `ordered` demand
  and `pending_review`/`approved`/`reserved` allocations; linked, received,
  picked, and consumed rows are returned as review-only classifications.
- `inventories.resolveSalesInventoryOrderRepair` accepts selected preview
  baselines in `demandBaselines[]` and `allocationBaselines[]`, plus optional
  review-only baselines in `reviewDemandBaselines[]` and
  `reviewAllocationBaselines[]` (each capped at 200). The
  server scopes rows to the live order and requires the reviewed component,
  status, quantity, received quantity, and inbound-link values to still match.
  Only confirmed mutable rows are soft-cancelled/released, affected component
  demand state is recomputed, and one `sales_inventory_order_update_repair`
  SalesHistory record captures applied and skipped ids.
## Customer Service work-order save contract (2026-07-27)

- `community.workOrder.form` hydrates Prisma `DateTime` values through
  SuperJSON, so `assignedAt` is a nullable `Date` in the shared work-order form
  schema rather than a string.
- `community.workOrder.saveWorkOrderForm` accepts that hydrated value for edit
  round-trips but does not write `assignedAt` or `techId`; assignment remains
  owned by the dedicated customer-service assignment workflow.
- Existing assigned work orders must pass the same form schema as new work
  orders before the protected save mutation runs.

## Production assignment and readiness contract (updated 2026-07-28)

- Readiness states are `ready`, `blocked`, `overridden`, `not_configured`, and
  `read_only`.
- A configured blocked projection exposes a deterministic revision,
  blocker/sample evidence, pending quantity, open inbound quantity, and
  `canOverride = true`.
- Confirmation compares `expectedRevision` after repair synchronization inside
  the write transaction. A mismatch returns `stale` without activating a new
  confirmation.
- `not_configured` and terminal orders cannot be overridden.
- `createAssignments` does not enforce readiness and does not read an active
  confirmation. Inventory, allocation, and inbound state are informational for
  assignment.
- `submitAll` continues to enforce the strict readiness gate.
- `sales.productionOrderDetailV2.items[].materials[]` returns the material
  identity, readiness/stock status, required/available/open-inbound quantities,
  and nullable linked-shipment `expectedAt`.
- `sales.productionOrderDetailV2.materialsState` is `available` or
  `unavailable`; inventory enrichment failure returns the core production items
  with `unavailable` instead of failing the order detail.
- `sales.productions.data[]` and `sales.productionTasks.data[]` include a
  display-only `materials` summary with state, component counts, open inbound
  quantity, latest known outstanding linked-shipment `expectedAt`, and
  `undatedPendingCount`. `state=unavailable` is returned when enrichment fails;
  the production rows remain available. Material-enriched pages are capped at
  100 orders.
- The confirmation contract remains callable for compatibility and audit
  history, but it no longer authorizes or blocks assignment.

## Sales inventory synchronization capability (updated 2026-07-29)

- `inventories.salesInventoryOverview.capabilities.canSync` is true for
  non-terminal orders in either `not_configured` or `active` setup mode.
  `active` includes legacy orders that already have inventory-backed line rows
  but are missing or have failed the canonical projection marker.
- `inventories.syncSalesInventoryOverview` continues to enforce the returned
  operation capability server-side. Fulfilled, cancelled, legacy-locked,
  completed-readonly, and confirmed zero-need/not-applicable orders cannot use
  the synchronization mutation.
- `inventories.verifySalesInventoryApplicability` is the only exception for a
  confirmed zero-need state. It is limited to active `not_applicable` orders and
  rechecks `canVerify` server-side before rebuilding; terminal and
  `legacy_not_applicable` orders remain read-only.
- Clients should automatically synchronize only when
  `inventoryApplicability.state` is `not_synced` or `failed` and
  `inventoryApplicability.canManualSync` is true. Capability alone does not
  imply that every active order should be resynchronized on view.
- A successful projection synchronization also runs guarded repair-residue
  cleanup in the same transaction. Only pending/ordered, unreceived, unlinked
  demand and pending-review/approved/reserved allocations attached to deleted
  sale lines or `cancelled` retired components are changed. Linked, received,
  picked, consumed, and other non-mutable rows remain untouched.
- `inventories.salesInventoryOrderRepairPreview` returns only residue attached
  to deleted sale lines or retired (`status=cancelled`) components. Ordinary
  live demand/allocation on a current synchronized component must not appear in
  the repair panel.

## Sales accounting list contract (2026-07-29)

- `sales.getSalesAccountings.data[].customerName` is an additive
  `string | null` display field.
- Each customer resolves `businessName` before personal `name`. The transaction
  wallet customer is preferred; associated order customers are used only when
  it is missing, and duplicate names from multi-invoice payments are returned
  once.
- Missing customer data returns `null`; the dashboard displays
  `Unnamed customer`.
- The database schema, URL filters, pagination, selection, row opening, and
  Excel export contracts are unchanged.

## Contractor accounting ledger contract (updated 2026-07-30)

- Every period input uses inclusive `YYYY-MM-DD` business dates plus an IANA
  timezone and is normalized to `[from, toExclusive)` UTC boundaries. Invalid
  calendar dates, reversed periods, unknown timezones, and reversed amount
  bounds fail at the Zod boundary.
- Shared filter snapshots support free-text search, up to 100 contractor IDs,
  entry/source types, minimum/maximum absolute amount, and exception-only mode.
  List routes add opaque cursor, 1-100 page size, and ascending/descending
  effective-date order.
- `contractorAccounting.summary` and
  `contractorAccounting.periodReport` return canonical ledger-derived opening,
  earned, adjustment, payout, reversal, net, closing, contractor, count, and
  data-quality fields in integer cents.
- `contractorAccounting.entries` returns cursor-paginated serialized immutable
  journal rows, including Decimal magnitude/effect normalized to cents and
  per-contractor balance after the entry. `entry` returns one detail row.
- `filterOptions`, `periods`, `reconciliationIssues`, `reportRuns`,
  `reportSchedules`, and `taxProfiles` are bounded control-center reads.
- `payables` returns per-contractor ledger balance, FIFO aging, oldest unpaid
  date, blockers, W-9 state, readiness, and only currently eligible unpaid job
  IDs. `contractorProfile` returns the same accounting authority plus recent
  payout-run history for Contractor 360.
- `insights` returns bounded continuous daily/weekly/monthly earned, payout,
  net, and closing-liability periods plus aging.
- `resolutionIssues` and `resolutionIssue` combine stored reconciliation
  evidence with append-only resolution events. Canonical evidence fingerprints
  distinguish active, resolved, and stale resolution state.
- `closeReadiness` returns hard blockers and warnings for the exact requested
  period. `closePeriod` repeats this server-side gate and rejects unresolved or
  stale reconciliation evidence.
- Payout runs use immutable proposal snapshots and constrained transitions:
  draft, ready, handed off, completed, or cancelled. The API does not create a
  payment; Payment Portal remains the execution boundary.
- Alert rules validate kind-specific thresholds and 1-50 recipients. Alert
  events expose open/acknowledged/resolved lifecycle and durable delivery
  evidence.
- `createAdjustment` accepts bonus/expense/deduction money with two-decimal
  precision, effective date/timezone, description, optional job, and bounded
  evidence. `reverseEntry` accepts an entry, effective date/timezone, and
  reason; it creates a new reversal instead of editing the original.
- `closePeriod` accepts only a global date period, stores the canonical snapshot
  and hash, and creates a close event. `reopenPeriod` requires period ID and a
  reason. `runReconciliation` stores legacy/ledger totals plus typed issues;
  `reviewReconciliationIssue` stores reviewed/resolved state and note.
- `generateReport` requires one of six kinds and `PDF | XLSX | CSV`. Contractor
  statements require one contractor; PDF is limited to consolidated and
  contractor statement output. The route snapshots filters, creates a report
  run, and queues the report job.
- `createReportSchedule` validates a five-part cron, timezone, report
  kind/format, full filter snapshot, and 1-50 email recipients. Scheduled
  contractor statements require exactly one contractor.
- `updateTaxProfile` stores W-9 state and bounded tax-readiness evidence.
  `backfillLedger` accepts only `dryRun` (default true).
- `myStatement` deliberately has a separate pre-refinement schema without
  caller-controlled contractor IDs. The server derives scope from the
  authenticated user.
- Compatibility `jobs.contractorPeriodReport` and
  `print.contractorAccounting` now consume the immutable ledger. The legacy
  calculation remains only for reconciliation comparison.

## Sales dashboard and reporting contract (2026-07-30)

- `salesDashboard.getKpis` returns booked sales, order count, quote count,
  average order value, active production count, equal-length previous-period
  percentage changes, and resolved current/previous period bounds.
- `getRevenueOverTime` returns continuous day/week/month buckets with
  `rawDate`, inclusive `bucketTo`, booked sales, order count, AOV, and
  granularity.
- `getRecentSales` returns five selected-period order projections suitable for
  canonical Sales Overview drill-down.
- `getTopProducts`, `getSalesRepLeaderboard`, and
  `getSalesChannelBreakdown` use the same selected-period and visibility
  contract; none replaces Sales Finance reporting.
- Every sales order projection excludes `deletedAt` rows and applies the
  office/dealer-customer visibility predicate.

## Sales customer dual-address contract (2026-08-03)

- `customers.createCustomer` accepts optional `salesType`,
  `salesId`, `shippingSameAsBilling`, `billingAddress`, and `shippingAddress`
  fields while preserving the existing flat customer/address input. With a
  sale id, customer and both sale address assignments update atomically.
- Sales-context responses retain `addressId` as the billing alias and add
  `billingAddressId` plus `shippingAddressId` for direct sales-form assignment.
- `customers.assignSalesAddress` accepts a positive `salesId`, positive
  `customerId`, `billing | shipping` address kind, optional owned address id,
  and address fields. It requires customer-edit permission, rejects dealer-owned
  customers and mismatched/non-office sales, copy-on-writes shared addresses,
  and updates only the requested relation on the initiating sale.
- `customers.assignSalesAddress` and sales-context `customers.createCustomer`
  reject `CONFLICT` once the sale's canonical lifecycle is fulfilled, including
  fulfillment derived from a completed delivery with delivered items. This
  server guard is authoritative even if a stale client still exposes an editor.
- Sales-context `customers.createCustomer({ customerOnly: true })` updates
  customer identity/contact/profile data without reading or writing address
  relations. This is the permitted customer-edit path for fulfilled sales.
- Customer address inputs include an optional address-specific `name`; billing
  and shipping recipients persist independently of the owning customer name.
- `google.place` normalizes Google `addressComponents` into the customer form
  address contract. Locality/postal-town fallbacks supply city, state uses the
  administrative-area short code, and ZIP suffixes are preserved. County-level
  administrative areas are never substituted for a missing city.
- `google.places` restricts US suggestions with supported primary types
  (`street_address`, `subpremise`, `route`, `premise`, and `landmark`);
  component-only `street_number` is not sent as a primary-type filter.
- `customers.getSalesCustomer` exposes a normalized `customerForm` projection
  containing the exact requested billing/shipping assignments and strict
  non-null id equality for `shippingSameAsBilling`; Sales Overview uses this
  projection to hydrate its inline full-customer editor.

## Production submission material review contract (2026-07-30)

- A production submission returns `finalized` or `pending_material_review`,
  review id, material revision, submitted count, and idempotent-replay state.
- Every new produceable submission has a server-validated batch key and scoped
  assignment/material snapshot. Reuse with another order, worker, or assignment
  scope is rejected.
- Pending review quantity is reported but not finalized. Only approved or
  legacy no-review submissions contribute to production completion, packing,
  dispatch, payroll, or completion-dependent payment review.
- Decision input includes review id, expected `updatedAt`, action, note, and
  optional explicit resolution selections. Each inbound item requires
  admin-entered good and issue quantities; no quantity is preselected.
- `RESOLVE_AND_APPROVE` accepts up to 20 linked receipts plus up to 200 scoped
  no-inbound component ids, enabling mixed resolution. Server ownership checks
  reject arbitrary inbound/component ids.
- `APPROVE_CONFIGURATION_EXCEPTION` is reserved for the permission-checked
  one-click fulfillment resolution path. It is accepted only when fresh evidence
  remains `pending_material_review` with reason `NOT_CONFIGURED`, records
  `configurationException=true` and `noPhysicalStockChange=true`, and still runs
  the canonical approval completion effects. It cannot bypass configured stock,
  inbound, or availability blockers.
- If blockers remain after a valid resolution, inventory changes commit, the
  review stays pending with refreshed evidence, and the exact unresolved
  snapshot is returned. Final decisions are idempotent.

## Manual activity note audit contract (2026-08-04)

- Mutable activity channels are limited to `sales_info` and `inventory_inbound`.
- Edit returns root id, updated note, and revision id; delete returns root id, `deleted: true`, and revision id.
- Revision children carry `type=activity_note_revision`, `revisionAction=edited|deleted`, `revisionOf=<root id>`, original-author contact, and changing-user tags; their sender is the actor who made the change.
- Activity-tree nodes expose `senderProfileId` and `deletedAt`; deleted roots require an authorized `includeDeleted` read.
- Inbound status updates return `previousStatus` and `actorName` with committed shipment fields.

## Inventory fulfillment contract closure (2026-08-04)

- Delivery mode is the shared enum `pickup | delivery | ship`. Inventory sentinel
  values are metadata sources, not delivery modes, and are rejected at the API.
- Fulfillment mutation inputs are strict and do not accept `authorName`; actor id and
  display name are resolved from the authenticated session.
- Fulfilled and cancelled sales reject shipment, hold, and dispatch mutations with a
  conflict response. Requested line ids outside the selected sale are rejected as a
  bad request.
- Backorder and partial-shipment responses expose `deliveryMode`, order lifecycle,
  a stable `nextCursorId`, and page summary. Dedicated summary endpoints return
  complete filtered totals rather than page totals.
- Multi-component shortage totals are reported at finished-line grain. Allocation
  consumption remains component grain and is separately reconciled in mutation
  results.
- Inventory fulfillment mutation transactions use Serializable isolation, 30-second
  timeout, 5-second max wait, and at most three attempts for Prisma `P2034` write
  conflicts.

## Dyke custom step component contract (2026-08-06)

- `inventories.upsertDykeCustomStepComponent` reuses normalized titles within
  the requested Dyke step. An explicit `id` or `uid` must identify a non-archived
  custom component on that same step; standard and cross-step targets are
  rejected.
- Optional price semantics are intentional: omitted `price` leaves pricing
  untouched because pricing is not applicable, a finite number creates or
  updates the selected pricing row, and `price: null` soft-deletes the supplied
  pricing row.
- `inventories.archiveDykeCustomStepComponent` remains a soft archive. Archived
  options leave future autocomplete results but saved sales keep rendering their
  embedded selected-component snapshots.

## Guarded inbound and existing-sale quantity contract (2026-08-06)

- Direct inbound reduction input is `{ inboundId, demandId, targetQty, note }`;
  IDs must be positive, target quantity nonnegative, and the trimmed reason must
  contain 3–2000 characters.
- Target quantity may not increase or fall below received quantity. Zero removes
  an unreceived demand from the shipment while leaving it open for reassignment.
- Existing-sale reductions with downstream evidence require explicit
  acknowledgement. Open inbound also requires a cancel-open or keep-for-
  warehouse disposition.
- Snapshot drift makes the adjustment stale. Sale/payment/inbound mutation is
  atomic; the durable adjustment snapshot holds reconciliation checkpoints, and
  bounded delayed lease recovery uses exact compare-and-swap takeover to make
  projection/activity retry idempotent.
