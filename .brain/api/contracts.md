# API Contracts

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
  - Dealer print access accepts `pricingMode: "customer" | "internal"`.
    Explicit modes are part of the print snapshot document identity, so cached
    customer and internal documents cannot collide.
  - Sales order filtering accepts optional
    `salesChannel: "dealership" | "office"`; dealership means
    `dealerAuthId > 0`, while office includes null and legacy zero ownership.
- WWW client query invalidation contract:
  - Successful browser tRPC mutations pass through the global TanStack `MutationCache.onSuccess`, which resolves a typed mutation route from the tRPC mutation key and emits the route's registered query events.
  - Mutation results/variables may resolve affected sale references, and mutation options may add `meta.queryEventScope`; mutation options may also add typed `meta.queryEvents: QueryEventName[]`, while `meta.queryEvents: false` opts out of automatic route events.
  - Query events own typed tRPC path/exact/infinite targets in `apps/www/src/lib/query-events/registry.ts`; Sales Overview detail reads use exact `{ orderNo, salesType }` keys when scope is available, while lists/summaries/dashboards/filters/page tabs remain broad. Missing scope falls back to broad detail invalidation.
  - Events reach the initiating tab and other open GND tabs in the same browser via `BroadcastChannel`. This is not a multi-device or server-originated realtime contract.
  - Query invalidation errors are logged independently and never change a successfully committed mutation into a mutation failure.
  - `salesPaymentProcessor.applyPayment` returns `appliedSales: Array<{ salesId, orderId, amountApplied, remainingDue }>` for successful office/customer-portal payments. Pending terminal setup returns an empty array and emits no sales event.
  - `checkout.verifyPayment` returns `appliedSales: Array<{ salesId, orderId, salesType }>` after completed settlement so online customer payments can invalidate the affected Sales Overview queries; pending verification returns no affected sales event.
  - Inventory dispatch/fulfillment mutation results attach `sale: { id, orderId, type } | null` when a sales order is known so the client can invalidate that exact Sales Overview.
  - `sales.markLatestPaymentReviewed` returns its related order `{ id, orderId, type }` with the reviewed payment result.
  - `sales.markPaymentsReviewed({ salesIds, note? })` accepts 1-100 positive sales ids, deduplicates them, and returns `{ reviewed, skipped }`. Each reviewed row contains `{ paymentId, salesId, orderId, type }`; each skipped row contains `{ salesId, reason: "no_payment_needs_review" }`. The Sales Orders batch caller suppresses per-mutation automatic events and awaits one coalesced `sales.payment.changed` event before clearing selection and closing the menu.
- Shared schemas and DTOs live across `apps/api/src/schemas`, `apps/api/src/dto`, and shared packages.
- Sales production query contracts live in `packages/sales/src/schema.ts`.
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
  - `sales.getSaleOverview` also returns `overviewItems[]` for mobile/document overview surfaces, with bounded non-deleted sales line rows containing `id`, display `title`, `subtitle`, `qty`, and `total`; order views may still prefer dispatch-enriched item rows when dispatch data is available
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
  - follow-up sales-document snapshot expiration, Trigger queue work for sales inventory line-item sync, and document snapshot warmups are best-effort and bounded; timeout/failure must not change the save response payload or leave clients waiting indefinitely
  - in development only, the API captures parsed save payloads for debugging under `debug/new-sales-form-save-payloads/YYYY-MM-DD/*.json`; this capture has no request/response shape impact, is not active in production, and file-write failures are logged without failing the save
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
  - `salesInventoryOverview` also returns lifecycle/setup metadata for the Inventory tab: `lifecycleStatus`, `lifecycleLabel`, `lifecycleTone`, `fulfillmentStatus`, `setupMode`, and `hasInventoryIntegration`. `setupMode` is `active` when merged inventory rows exist, `not_configured` for active orders that can still self-sync, `legacy_status_locked` for active orders with a manual `SalesOrders.inventoryStatus` but no inventory rows, and `completed_readonly` for fulfilled orders with no inventory rows so historical orders do not create new inventory demand after fulfillment.
  - `salesInventoryOverview` returns operation policy metadata: `operationMode`, `capabilities`, `isInventoryReadOnly`, and `inventoryActionBlockReason`. These capability flags are the UI contract for whether the current sale may sync inventory, create inbound, allocate stock, mark available, or configure tracking. Fulfilled and cancelled orders return read-only capabilities even when existing inventory rows remain inspectable.
  - `inventories.syncSalesInventoryOverview({ salesOrderId })` runs the existing single-sale inventory line-item sync for one order and returns the package sync result; the sales overview Inventory tab uses it as a self-healing path when an opened order has no inventory-backed rows yet. `salesOrderId` must be a positive integer at the tRPC boundary, and the underlying `sync-sales-inventory-line-items` Trigger schema applies the same positive-integer requirement for repair/manual sync jobs. When sync removes stale components from a still-active line, child allocation/demand cleanup and component removal are guarded by the exact pre-read component identity: component id, parent line id, sub-component id, and inventory variant id. When sync removes stale inventory lines for sales items no longer present on the sale, it first soft-deletes only line items still tied to the same sale and stale sales item ids, then cleans allocation, inbound-demand, and component residue only under line items confirmed by that soft-delete write; `deletedCount` reports confirmed line writes.
  - `inventories.resolveSalesInventoryLegacyStatusSetup({ salesOrderId, action })` is the explicit Inventory-tab unlock contract for `setupMode=legacy_status_locked`. `salesOrderId` must be a positive integer at the tRPC boundary. The mutation records the reviewed manual `SalesOrders.inventoryStatus` baseline from the overview, then revalidates that exact status inside the transaction before writing history or running sync. `action=reset` clears `SalesOrders.inventoryStatus` only through that guarded baseline write; `action=override` preserves the existing manual status only after the same baseline check. If the manual status changes between review and apply, no `SalesHistory` row is written and single-sale inventory sync does not run. Requests for orders that are not in `legacy_status_locked` are rejected.
  - each group represents an invoice item with `label`, `qty`, `rows[]`, and totals for required, in-stock, allocated, pending, and cost
  - top-level `rows[]` is the Inventory-tab display contract: matching component/category/variant rows are merged across invoice items, demand quantities are summed, and physical stock is reported once per inventory variant instead of multiplied by every invoice item occurrence
  - each row includes component name, step/category name, required qty, summed physical stock qty from active `InventoryStock` rows, allocated qty, pending qty, open inbound qty, linked open inbound qty, cost, sales price, status, tracking policy, inventory ids, variant SKU, merged component ids, inbound demand ids, unassigned pending inbound demand ids, pending stock allocation ids, and action eligibility
  - each row also includes derived requirement display fields: `requirementStatus`, `requirementLabel`, `requirementShortLabel`, and `canEditInboundStatus`. Rows with `trackingPolicy != tracked` or `qtyRequired <= 0` return `not_applicable` / `Not Applicable` / `N/A` and cannot edit inbound status from the row; tracked rows with positive required quantity return `required`.
  - `inventories.salesInventoryTrackingChangeRepairPreview({ inventoryCategoryId, limit? })` returns a read-only repair preview after stock tracking becomes stricter. The response includes `eligibleOrderCount`, `skippedReadOnlyOrderCount`, `totalPendingQty`, bounded `orders[]` with order id, lifecycle, pending qty, and component names, plus `truncated`. Orders at `ready_to_fulfill`, fulfillment-stage, fulfilled, or cancelled lifecycle states are skipped instead of mutated.
  - `inventories.createInboundShipmentFromDemands` accepts existing demand ids and/or selected sales line-item component groups with requested qty. `supplierId`, `demandIds`, `lineItemComponentIds`, and selected component ids must be positive integers when supplied, and each selected component `qty` must be positive before the API prepares demand. When component selections are supplied, the API prepares only the requested pending `InboundDemand` quantity for monitored stock inventory rows before creating the inbound shipment, splitting an existing unlinked pending demand when the requested qty is smaller than its outstanding qty. Shipment item planning and linking only use active unassigned demand rows; item quantity is committed only from rows confirmed linked by guarded writes that match the pre-read `qtyReceived` baseline and through a final parent-inbound active-state guard, already-linked or concurrently received demand rows are ignored for new shipment quantity, and a request with no unassigned demand fails before creating a new inbound shipment. Empty item and empty shipment cleanup after zero confirmed links is also guarded by the created inbound remaining non-deleted and non-terminal.
  - `inventories.createInboundShipmentFromDemands` rejects terminal fulfilled/cancelled parent sales before preparing or splitting demand rows, then creates the inbound shipment, links demand, and sets affected `SalesOrders.inventoryStatus` values to `ORDERED` in one transaction. The status update and activity order references are derived from demand rows confirmed linked by the package result, not the original requested/candidate ids. The response returns `updatedSalesOrderCount` for linked inventory-created inbound work.
  - `inventories.assignInboundDemands({ inboundId, demandIds })` requires a positive-integer `inboundId` and a non-empty positive-integer `demandIds` array, then assigns existing demand rows to a non-deleted, non-terminal inbound shipment using the same active unassigned-demand and confirmed-link rule as create-inbound. The API wraps package assignment in one transaction so demand links and shipment item quantity updates commit together. Existing inbound shipment item rows are incremented atomically by confirmed linked quantity from rows whose link writes match the pre-read `qtyReceived` baseline instead of rewritten from stale demand/item pre-reads, and the item quantity commit is guarded by the parent inbound remaining non-deleted and non-terminal. Already-linked or concurrently received demand fails before mutating shipment items, and concurrently claimed demand that leaves zero confirmed links fails instead of recording a no-op assignment; any newly-created empty item cleanup is also parent-state guarded.
  - `inventories.salesInventoryMarkAsPreflight({ salesOrderIds, action })` reviews configured inventory rows before shared `SalesMenu.MarkAs` production-complete or fulfilled tasks run. `salesOrderIds` must be a non-empty positive-integer array of at most 100 ids before the preflight can run. Orders with no inventory-backed rows remain allowed so legacy Mark As behavior is preserved; configured orders with required components still awaiting inbound or allocation return `ok=false`, blocker counts, pending/open inbound totals, safe-resolve eligibility, pending stock allocation ids/qty, auto-inbound demand ids/qty, supplier hints, and a bounded blocker/component preview for the web alert dialog.
  - `inventories.resolveSalesInventoryMarkAsAutoForContinue({ salesOrderIds, action })` is the transitional Mark As Fulfilled auto-resolution mutation for active, non-terminal orders. It uses the same positive-integer batch guard as the preflight route, rejects fulfilled/cancelled orders before writes, approves active pending-review stock allocations, creates missing `InboundDemand` rows for remaining monitored-stock shortages, groups and creates inbound shipments by preferred supplier/default supplier/fallback `Auto-created inbound`, links demand rows to those shipments, recomputes affected components, updates orders with linked inbound demand to `ORDERED` and allocation-only orders to `AVAILABLE`, writes `SalesHistory` audit rows, reruns preflight for evidence, and returns `continueAllowed=true` once blockers have been converted into allocation or inbound work. The normal preflight may still report awaiting inbound after this mutation because receiving has not happened yet; the fulfilled Mark As UI intentionally continues during this transitional operating mode.
  - `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue({ salesOrderIds, action })` is the explicit Mark As continue mutation. `salesOrderIds` uses the same non-empty positive-integer batch guard as the preflight route. It cancels only unlinked mutable `pending` / `ordered` `InboundDemand` rows with no received quantity, stamps rows changed by this apply with a per-mutation operation note, recomputes affected `LineItemComponents`, updates only orders with demand rows confirmed cancelled by that apply to `SalesOrders.inventoryStatus=AVAILABLE`, writes order-scoped `SalesHistory` audit rows, reruns the preflight, and returns `continueAllowed` only when the remaining preflight is clean. The response includes `auditHistoryCount`; shipment-linked, partially received, or allocation-required blockers are not auto-mutated and keep Mark As paused.
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
  - `inventories.updateInboundShipmentStatus({ inboundId, status })` requires a positive-integer `inboundId`, then updates an inbound shipment lifecycle status through a guarded write that requires the shipment to still be non-deleted and at the status observed before mutation, and records an `inventory_inbound_activity` lifecycle event with `activityType=status_updated`. When the target status is `cancelled`, unreceived active demand linked to that cancelled parent inbound is released back to unassigned `pending` demand. Affected line-item components are recomputed only from demand rows confirmed released by guarded writes while the component row remains active, and the response/activity metadata include `releasedDemandCount` and `recomputedComponentCount`.
  - inbound lifecycle activity payloads carry a `lifecycleEventId`; the notification channel is synced before writing, and `inventory_inbound_activity` creates the timeline note through the standard notification handler even when no channel recipients are configured. Repeated array tag values such as duplicate `orderNos` are deduped before `NoteTags` writes.

## TODO
- Document canonical contracts for sales, checkout, dispatch, notifications, and document workflows.

## Sales document email attachment contract (2026-07-22)

- `simple_sales_document_email` no longer accepts or emits `skipPdfAttachment`.
- Simple and composed sales document emails always attempt to render one PDF attachment for the selected order/quote documents.
- A PDF render failure is non-fatal: the email may still send with its signed PDF download link, and the failure is logged for diagnosis.
- Attachment behavior is deterministic across development and production and is not gated by an environment variable.

## Staff Square terminal payment contract (2026-07-22)

- Terminal payment submission requires a selected Square device id and a positive external amount.
- The API re-queries the configured Square location before checkout creation and matches `device:<id>` and `<id>` forms through one canonical device id.
- Only a device currently reported as `AVAILABLE` may be used. A stale, offline, unknown, or unverifiable device fails before Square checkout creation and before a local `SquarePayments` pending row is written.
- Device discovery is intersected with `PAIRED` `TERMINAL_API` device codes returned for the same Square application and location; merchant devices paired to another mode/application are not checkout candidates.
- Before checkout creation, the API creates a `PING` Terminal action and waits briefly for `COMPLETED`. A device that does not acknowledge Connected mode fails with an operator-facing sign-in instruction; checkout creation and local pending-payment persistence do not run.
- Square Sandbox exposes the official successful simulated Terminal id and skips production-only pairing/`PING` gates because physical Square hardware cannot connect to the Sandbox.
- Square checkout creation runs before the local pending-payment write. When Square rejects the checkout, no pending local payment is recorded.
- The persisted terminal id and display name come from the server-observed Square device, not client-supplied display metadata.

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
- Successful checkout returns the canonical storefront checkout and standard
  Sales Order identity. Retries use idempotency and cannot create a second
  charge or order.
- Availability is an online merchandising/lead-time policy, not an inventory
  reservation guarantee.
- Public and guest storefront calls use the allowlisted
  `/api/storefront/trpc` endpoint. Guest ownership comes from the signed guest
  cookie; customer ownership may come from the existing chunked secure
  NextAuth session cookie.

## Custom millwork inquiry contract (2026-07-22)

- A custom brief requires at least one canonical project type, property type,
  city/state/postal code, a 20-character description, contact name/email, and a
  contact preference. Dimensions, materials, budget, target date, fulfillment
  notes, and phone are optional except phone is required for phone-only contact.
- Attachment finalization accepts no more than five verified private files.
  Each file is at most 10 MB and must be JPEG, PNG, WebP, HEIC/HEIF, or PDF.
- Submission is idempotent for an inquiry/upload token pair and returns the
  stable customer reference. Notification delivery is outside the commit and
  cannot change submission success.
- Inquiry statuses are `DRAFT`, `NEW`, `IN_REVIEW`, `AWAITING_CUSTOMER`,
  `QUOTE_CREATED`, `RESPONDED`, `CLOSED`, and `SPAM`; transitions are validated
  by the shared sales-domain state machine.
- Quote conversion requires a linked office customer and assigned rep. Repeated
  conversion returns the already-linked quote rather than creating another.
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
