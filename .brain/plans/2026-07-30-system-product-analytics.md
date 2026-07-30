# System Product Analytics

## Objective

Design a privacy-bounded, authenticated product-usage analytics system for GND
that answers which pages and features are used, by whom, how often, and whether
usage is growing or declining. The system should store at most one aggregate
row per user, activity day, surface, and stable page/feature key; repeated use
increments that row's counter. It should support GND's web and mobile surfaces,
work without a new paid vendor, and avoid collecting customer/order content or
turning usage data into an opaque employee-performance score.

## Assumptions

- The primary purpose is product improvement, feature adoption, training, and
  retirement decisions—not payroll, discipline, or employee surveillance.
- GND needs authenticated user-level drill-down, but individual views will be
  restricted more tightly than aggregate page/feature rankings.
- A "day" must use one configurable GND business timezone so reports are
  comparable across devices. The exact IANA timezone must be confirmed before
  implementation; do not trust a browser-local date as the canonical bucket.
- Page tracking ignores query strings, search terms, filters, record ids, and
  URL fragments. Dynamic routes map to stable logical page keys.
- Feature usage means a meaningful action completed successfully. A button
  click that fails validation or server execution is not successful adoption.
- GND's existing `PageView` and `Event` tables remain available during rollout,
  but they are not the target schema: `PageView` is append-only and `Event`
  also carries durable domain/audit events.
- GND's existing `@gnd/events` OpenPanel integration may remain for public or
  external-product analytics, but the internal staff analytics ledger will not
  depend on a third-party service.
- Planning does not authorize implementation, migration execution, production
  instrumentation, or changes to existing telemetry.

## Detailed Execution Plan

### Phase 0 — Confirm policy and measurement rules

Dependencies: product owner, system administrator, and—if individual staff
activity will be reviewed—appropriate HR/legal policy review.

1. Confirm the canonical business timezone and store it as a server-owned
   configuration value such as `SYSTEM_ANALYTICS_TIMEZONE`.
2. Approve the visibility boundary:
   - aggregate analytics: users with `viewSystemAnalytics`;
   - named user drill-down: Super Admin or a narrower
     `viewUserSystemAnalytics` permission;
   - normal users: optionally expose only their own activity summary.
3. Publish a short internal transparency statement covering what is collected,
   why it is collected, who can see it, retention, and how corrections or
   questions are handled.
4. Explicitly prohibit collection of:
   - customer names, phones, emails, addresses, or free-form text;
   - order, payment, document, or job identifiers;
   - search terms, filter values, query strings, or form contents;
   - keystrokes, screenshots, session replay, or DOM recordings;
   - a hidden or opaque "employee productivity score."
5. Define the reporting vocabulary:
   - `entry count`: number of logical page entries or successful feature uses;
   - `user-day`: one user with at least one row for a key on one day;
   - `unique users`: distinct users in a reporting period;
   - `active days`: distinct days on which a user used a key;
   - `eligible reach`: unique users divided by active users whose current
     permissions allow the feature;
   - `repeat depth`: uses after the first use per user-day;
   - `trend`: recent seven-day unique users/user-days compared with the prior
     seven days.

Decision gate: do not build named user ranking until the access and policy
boundary is approved. Page and feature ranking can proceed independently.

Validation: product owner signs off on a one-page data dictionary and privacy
boundary before schema work begins.

### Phase 1 — Create a typed analytics catalog

Dependencies: Phase 0 definitions.

1. Add a shared package such as `packages/product-analytics` rather than
   expanding the generic legacy `Event` model. This package owns stable keys,
   labels, categories, permission eligibility, and safe dimensions.
2. Define a reviewed code registry. Example keys:
   - `page.sales.orders`
   - `page.sales.order_overview`
   - `page.sales.finance`
   - `page.inventory.products`
   - `feature.sales.batch.print_pdf.succeeded`
   - `feature.sales.batch.export_excel.succeeded`
   - `feature.sales.batch.status_update.succeeded`
   - `report.sales.orders.generated`
   - `report.sales.finance.generated`
3. Give every definition:
   - stable `eventKey`;
   - reader-facing label and description;
   - `PAGE`, `FEATURE`, `BATCH`, `REPORT`, or `EXPORT` kind;
   - owning product area;
   - supported surface (`dashboard`, `dealership`, `mobile`, or
     `storefront-admin`);
   - source of truth (`client-entry` or `server-success`);
   - required permission(s), when applicable;
   - allowed bounded dimensions, if any.
4. Map route patterns to logical page keys. Dynamic ids and search parameters
   must never become keys. Query-driven sheets that behave like a page, such as
   Sales Overview, receive an explicit logical key.
5. Add a development/test assertion for unknown event keys so a typo cannot
   silently create a new high-cardinality metric.

Validation:

- registry keys are unique and naming tests pass;
- every tracked key has an owner and reader-facing description;
- route normalization tests prove ids, filters, and search parameters are
  removed;
- a static audit reports catalog entries that have no instrumentation and
  emitted keys that are absent from the catalog.

### Phase 2 — Add the internal daily aggregate ledger

Dependencies: Phase 1 catalog and confirmed timezone.

1. Add a dedicated Prisma model, tentatively `SystemUsageDaily`, with:
   - `id`;
   - `userId`;
   - canonical `activityDate` (`DATE`, derived on the server);
   - `surface`;
   - `eventKey`;
   - `kind`;
   - integer `count`;
   - optional integer `quantityTotal` for batch volume without selected ids;
   - `firstOccurredAt` and `lastOccurredAt`;
   - `createdAt` and `updatedAt`.
2. Enforce one row with a composite unique key on:
   `userId + activityDate + surface + eventKey`.
3. Add report-oriented indexes:
   - `activityDate + kind + eventKey`;
   - `userId + activityDate`;
   - `surface + activityDate`.
4. Decide tenancy before finalizing the unique key:
   - if the same user can perform analytics-relevant work in multiple active
     organizations, require `organizationId` in the row and unique key;
   - do not add a nullable organization field to the unique key because MySQL
     permits multiple `NULL` values in unique indexes.
5. Add `SystemUsageIngestReceipt` for idempotent client-batch retries:
   - unique random `batchId`;
   - authenticated `userId`;
   - received timestamp and expiry timestamp;
   - no event payload.
6. Implement one atomic MySQL merge operation:
   - insert the daily row if absent;
   - otherwise increment `count`;
   - add a bounded batch quantity to `quantityTotal` when the catalog allows
     it;
   - preserve the earliest `firstOccurredAt`;
   - preserve the latest `lastOccurredAt`;
   - remain safe under simultaneous tabs and devices.
7. Bound ingestion:
   - authenticated users only;
   - known catalog keys only;
   - maximum batch size, count delta, timestamp age, and future clock skew;
   - server derives the activity date from `occurredAt` and the configured
     timezone;
   - accept only a short offline backfill window, initially seven days.
8. Add a daily cleanup job for expired ingest receipts. Keep daily aggregates
   for an initial 13 months, then review whether to delete, anonymize, or retain
   coarser rollups.

Why a separate ledger:

- the current `PageView` model creates a row for every ping and has no daily
  uniqueness/counter contract;
- the current `Event` model is also used for business and audit history, so
  product analytics retention or aggregation rules must not affect it;
- one aggregate row per user/key/day gives exact daily adoption without
  retaining a raw clickstream.

Capacity check:

- 100 active users × 50 used keys/day × 365 days is at most 1,825,000 daily
  rows/year;
- 1,000 active users at the same density is 18,250,000 rows/year, which is the
  point to add pre-aggregated rollups, partitioning, or a dedicated analytics
  store rather than prematurely introducing one.

Validation:

- concurrent increments cannot create duplicates or lose counts;
- retrying a client batch id does not increment twice;
- offline events cross midnight into the correct business day;
- unknown, oversized, stale, future-dated, unauthenticated, and cross-user
  payloads are rejected;
- the Prisma migration is generated/applied using the repository's required
  database commands and documented in Brain before rollout.

### Phase 3 — Implement the local persistent queue correctly

Dependencies: Phase 2 batch API.

The user's proposed local persistence is retained as a buffer and write
coalescer, but it must not wait exclusively for the next day.

1. Prefer IndexedDB over `localStorage`:
   - asynchronous writes do not block page rendering;
   - transactions make queue updates safer;
   - it is a better fit for pending batches and acknowledgements.
   Use an in-memory fallback if persistent browser storage is unavailable.
2. Store only normalized analytics data:
   - schema version;
   - owner/user fingerprint;
   - random device id;
   - canonical event key;
   - occurred timestamps;
   - pending count;
   - random batch id.
   Never store raw URLs, entity ids, names, or feature payloads.
3. Aggregate repeated page entries locally by day/key before transmission.
4. Flush in bounded batches:
   - shortly after activity (for example 30–60 seconds);
   - after a small threshold such as 20 pending increments;
   - when the browser becomes hidden or goes online;
   - on logout;
   - before/after local day rollover;
   - on the next authenticated launch, with prior-day batches first.
5. Use authenticated `fetch` with `keepalive` where appropriate. A failed
   request remains queued.
6. Freeze a delta into an immutable batch id before sending. Delete it only
   after acknowledgement. If acknowledgement is lost, the same batch retries
   and the server receipt prevents a double increment.
7. Coordinate tabs using `BroadcastChannel` and, where supported,
   `navigator.locks`, so multiple tabs do not flush the same mutable buffer.
8. On account change:
   - never upload User A's queue under User B;
   - retain only if it can be safely associated with the same authenticated
     account;
   - otherwise discard it;
   - clear normalized pending data on explicit logout after the final flush
     attempt.
9. Cap the queue (for example seven days and 500 unique pending keys). Surface
   development diagnostics when data is dropped because the cap is reached.

Important consequence: next-day launch is a recovery flush, not the primary
delivery mechanism. Waiting exclusively for tomorrow loses data when the user
never returns, changes device/browser, clears storage, or uses private mode.

Validation:

- refresh, crash simulation, offline/online transition, day rollover, shared
  browser account switch, and two-tab concurrency;
- acknowledged batches clear locally;
- unacknowledged batches retry without double counting;
- a disabled/unavailable IndexedDB path still tracks via the safe fallback.

### Phase 4 — Instrument page usage

Dependencies: Phases 1–3.

1. Add one authenticated tracker at each app shell, starting with
   `apps/dashboard`.
2. Use Next.js pathname changes, then map the path to the typed catalog.
3. Count a logical entry when:
   - the app first mounts on a known logical page; or
   - the logical page key changes after navigation.
4. Do not count:
   - search/filter/query-param changes on the same logical page;
   - component remounts;
   - loading skeletons;
   - background prefetches;
   - unknown/public/auth pages unless explicitly approved.
5. Give logical workspaces explicit semantics. For example, opening an order
   overview sheet can count `page.sales.order_overview` even if it is represented
   by a query parameter, but the order id is never stored.
6. Replace the existing targeted Finance and Sales Form append-only adoption
   pings only after the new rows and reports are verified. Preserve the legacy
   data during the comparison window.

Validation:

- enter page, change filters repeatedly, leave, return, refresh, and open a
  query-driven overview;
- the expected daily row count changes and no raw URL/search data appears;
- navigation remains non-blocking even when analytics ingestion is unavailable.

### Phase 5 — Instrument meaningful feature outcomes

Dependencies: Phase 2 ledger; Phase 3 only for actions with no server success
boundary.

1. Track server-owned actions at the successful mutation/service boundary,
   after authorization and business completion:
   - report generated;
   - batch PDF created;
   - batch print payload prepared;
   - Excel export generated;
   - batch status update completed;
   - bulk assignment/dispatch completed.
2. Track client-generated documents/exports immediately after successful
   artifact creation, using the local queue.
3. Do not place one generic tracker on every button. Instrument reviewed
   outcomes, not interface noise.
4. For batch actions, track both:
   - optional `batch.selection_started` once per local interaction session to
     measure discoverability;
   - the specific successful batch outcome.
5. Permit only low-cardinality dimensions such as:
   - output format (`pdf`, `print`, `xlsx`);
   - selection-size bucket (`2–5`, `6–20`, `21+`);
   - logical surface.
   Do not store exact selected ids or exact document/customer/order context.
   When batch workload matters, add only the selected-item quantity to the
   daily row's `quantityTotal`; keep invocation frequency in `count`.
6. Begin with a Sales pilot:
   - Sales Orders page entry;
   - Sales Overview entry;
   - batch selection started;
   - batch PDF/print success;
   - selected-row Excel export success;
   - sales report generation success.
7. Create an instrumentation checklist for every later product area. New
   features should declare their analytics key and success boundary during
   feature review rather than adding telemetry as an afterthought.

Validation:

- successful actions increment once;
- validation failures, cancellations, permission failures, and server failures
  do not count as successful use;
- retry/replay behavior does not create duplicate counts beyond intentional
  repeated user executions;
- instrumentation does not alter the business transaction if analytics fails.

### Phase 6 — Build the System Analytics workspace

Dependencies: enough pilot data from Phases 4–5.

1. Add a protected Midday-style route such as
   `/settings/system-analytics`, using small independent summary/table queries
   rather than loading raw rows.
2. Summary cards:
   - active users today / 7 days / 30 days;
   - distinct pages used;
   - distinct features used;
   - successful batch actions;
   - report generations.
3. Page ranking table, ranked primarily by unique users or user-days—not raw
   visits from a single power user:
   - page;
   - eligible users when permission mapping exists;
   - unique users;
   - user-days;
   - total entries;
   - repeat depth;
   - active days;
   - 7-day versus previous-7-day trend;
   - last used date.
4. Feature adoption table:
   - feature and product area;
   - eligible reach;
   - unique adopters;
   - total successful uses;
   - batch items processed, where `quantityTotal` is defined;
   - uses per adopter;
   - trend and last used date.
5. User adoption matrix, under the stricter permission:
   - user, current role, active days, distinct pages, distinct features, last
     activity;
   - drill-down by day and stable event label;
   - optional "feature coverage" as a transparent count of eligible core
     features used, never a productivity or quality score.
6. Declining/unused watchlist:
   - no use in the last 30 days despite eligible active users;
   - at least 30% decline across two consecutive seven-day comparisons;
   - require a minimum sample, initially five users or 20 uses, to suppress
     noise;
   - show the underlying counts, not only a red/green label.
7. Filters:
   - business date range;
   - surface;
   - product area;
   - page/feature kind;
   - role;
   - user, only when authorized.
8. Add a visible definition/freshness panel explaining metric semantics,
   business timezone, most recent server ingestion, retention, and known
   coverage gaps.
9. Cache heavy aggregate queries for a short period and paginate drill-downs.
   Do not fetch all daily rows into the browser.

Validation:

- every metric is reconciled against deterministic daily fixtures;
- permission tests prove aggregate and named-user boundaries;
- empty, low-sample, partial-instrumentation, and stale-data states are clear;
- aggregate query plans use the intended indexes;
- desktop/mobile browser validation confirms independent loading boundaries.

### Phase 7 — Migrate, observe, and expand

Dependencies: a verified pilot dashboard.

1. Run the new Sales pilot alongside existing Finance/Sales Form `PageView`
   telemetry for 14–30 days.
2. Reconcile broad directional totals while accounting for the old system's
   append-only mount semantics and the new system's normalized route semantics.
3. Optionally backfill only safely mappable legacy `PageView` groups into daily
   aggregates. Mark backfilled source and do not invent feature events.
4. Stop old targeted adoption pings after explicit acceptance. Do not delete
   the generic `PageView` or `Event` tables as part of this project because
   other workflows may depend on them.
5. Expand domain by domain:
   - reports/exports;
   - inventory batch operations;
   - production/dispatch;
   - jobs/contractor workflows;
   - HR/admin workflows;
   - dealership/mobile surfaces.
6. After 90 days, review:
   - keys with missing instrumentation;
   - dashboard queries and index health;
   - retention/storage volume;
   - declining-feature alerts;
   - whether optional vendor analytics still provides distinct value.

Acceptance gate:

- 95%+ of catalogued pilot outcomes emit correctly in tested paths;
- no raw URL/query/entity/customer data is present;
- counters are concurrency- and retry-safe;
- named user data is permission-protected;
- analytics failure never blocks a product action;
- product owner accepts the metric definitions and pilot dashboard.

### Platform recommendation

Recommended source of truth: internal MySQL daily aggregate ledger.

Reasons:

- it exactly matches the requested user/day/key/counter data model;
- GND already has authenticated user identity, Prisma/MySQL, protected tRPC,
  permissions, jobs, and dashboard patterns;
- it avoids exporting staff usage or business context to a vendor;
- it has no new vendor bill and modest volume at GND's current likely scale;
- the local queue reduces request/write frequency without sacrificing
  recoverability;
- the system can expose GND-specific eligible reach using real permissions,
  which generic page analytics tools do not understand automatically.

Role of existing OpenPanel:

- keep it optional for public/dealership/storefront marketing-style analytics
  if it is configured and useful;
- audit the current consent gates before expansion: the local server wrapper
  checks consent for identification but does not visibly apply the same check
  to its returned `track` function, and the client provider has no explicit
  local consent condition;
- do not make it the only store for internal authenticated feature adoption;
- do not dual-send named staff events by default;
- revisit it only if GND later needs generic funnels, cohorts, or broader
  product-analytics exploration that would be expensive to build internally.

Role of Vercel Web Analytics:

- useful for web traffic and Web Vitals, but not the recommended canonical
  user/day/permission-aware feature ledger;
- it would duplicate collection while still requiring internal modeling for
  exact daily per-user counters and eligible-user reporting.

Role of broader product-analytics platforms:

- PostHog/OpenPanel can accelerate funnels, cohorts, and event exploration;
- Umami/Plausible are strongest when the main need is privacy-oriented page and
  site analytics;
- self-hosting avoids some subscription cost but introduces infrastructure,
  upgrades, backups, security, and operational ownership;
- none removes the need for a reviewed GND event taxonomy and server-side
  success instrumentation.

The companion primary-source platform research is stored at
`.brain/research/2026-07-30-system-product-analytics-platform-comparison.md`.

### Estimated delivery

- Policy, taxonomy, and route map: 1–2 engineering days plus stakeholder review.
- Schema, atomic aggregation, ingestion API, and cleanup: 2–3 days.
- IndexedDB queue and authenticated page tracker: 2–3 days.
- Sales batch/report pilot instrumentation: 2–3 days.
- Protected analytics workspace and queries: 3–5 days.
- Pilot validation and reconciliation: 2–3 days plus a 14–30 day observation
  window.

Expected engineering effort for a useful MVP: roughly 10–16 engineering days.
System-wide feature coverage should be a continuing domain-by-domain program,
not one giant instrumentation change.

## Skills List Used

- `plan` — structured the proposal into executable phases, dependencies,
  decision gates, validation, and risks without beginning implementation.
- `research` — delegated a primary-source comparison of current analytics
  platforms, hosting models, and pricing into a cited repository note.
- GND Project Brain protocol — aligned the design with current architecture,
  auth/permission, database, API, dashboard, and task-memory conventions.

## Risks and Mitigations

- **Employee-surveillance misuse:** Individual activity could be interpreted as
  productivity or quality. Mitigate with explicit purpose limits, transparent
  metrics, strict named-user permission, no opaque score, and policy review.
- **Local-only data loss:** Tomorrow-only uploads disappear when users do not
  return or clear storage. Mitigate with same-day periodic flush plus
  next-launch recovery.
- **Retry double counting:** A successful request whose response is lost may be
  retried. Mitigate with immutable batch ids and unique ingest receipts.
- **Concurrent lost updates:** Tabs/devices may increment the same row.
  Mitigate with one atomic database upsert/merge and concurrency tests.
- **Timezone drift:** Browser, API, and database dates may disagree at midnight.
  Mitigate with one configured IANA business timezone and server-derived
  buckets.
- **High-cardinality or sensitive data:** Raw URLs/properties can leak business
  context and destroy query performance. Mitigate with a closed typed catalog,
  bounded dimensions, schema validation, and payload audits.
- **Misleading rankings:** Raw visit totals over-rank power users and low-volume
  changes look dramatic. Mitigate with unique users/user-days as the primary
  rank, eligible reach, minimum samples, and visible component metrics.
- **Inaccurate action adoption:** Client clicks can count failures.
  Mitigate by recording successful business outcomes at the server/service
  boundary.
- **Analytics blocking production work:** Telemetry failures could slow or fail
  sales operations. Mitigate with non-blocking clients, bounded timeouts,
  failure isolation, and never coupling business transaction success to
  analytics success.
- **Schema volume growth:** Daily user/key rows accumulate continuously.
  Mitigate with indexed aggregate-only storage, 13-month initial retention,
  receipt cleanup, capacity monitoring, and rollups/partitioning only when
  thresholds justify them.
- **Duplicate analytics systems:** Existing OpenPanel and `PageView` tracking
  can produce conflicting numbers. Mitigate with a declared internal source of
  truth, a dual-run comparison window, metric definitions, and explicit
  retirement of targeted legacy pings.
- **Instrumentation drift:** New features may launch without tracking, or event
  names may change. Mitigate with a code-owned catalog, coverage audit, feature
  review checklist, and stable keys independent of UI labels.
