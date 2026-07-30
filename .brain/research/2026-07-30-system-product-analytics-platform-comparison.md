# System Product Analytics Platform Comparison

Date: 2026-07-30  
Status: Research and architecture recommendation  
Scope: Authenticated product-usage analytics for GND, not public-site traffic analytics

## Question being answered

GND needs to answer:

- Which authenticated users use which pages?
- Which product features do they actually complete, such as report generation,
  batch PDF creation, batch printing, and batch export?
- How many times did each user use a page or feature on each business day?
- Which pages/features are growing, stable, declining, or unused?
- Can this be done without a new recurring vendor bill?

The requested storage behavior is interpreted as **one aggregate row per user,
day, page/feature, and app, with a counter that is incremented on later uses
during that day**. This is different from sending only one observation per day:
if only one observation is collected, later visits cannot increase the counter.

## Recommendation

Use a **hybrid architecture**:

1. Build a small internal, MySQL-backed `SystemUsageDaily` aggregate as the
   canonical source of truth.
2. Instrument successful feature operations at the server/domain boundary and
   canonicalized page arrivals at a shared route boundary.
3. Optionally mirror a privacy-bounded event stream to a product-analytics
   product for funnels, retention, cohorts, and faster exploratory analysis.
4. If a hosted exploratory tool is wanted, prefer **PostHog Cloud**. Its current
   product-analytics free tier is large enough for a curated GND event set and
   it directly supports identified users.
5. If avoiding a new vendor is the priority, continue with the already-installed
   **OpenPanel integration**, but treat the internal table as canonical and get
   clarification before sending authenticated identities to OpenPanel Cloud.
6. Do not use Vercel Web Analytics or Plausible as the primary solution for
   this requirement. Their privacy models are intentionally anonymous and do
   not provide persistent authenticated-user usage.

This gives GND exact daily row/counter semantics, full data ownership, no new
SaaS fee, and a clean escape hatch to a richer product-analytics UI later.

## Existing GND baseline

GND is not starting from zero:

- [`packages/events/src/server.ts`](../../packages/events/src/server.ts)
  and [`packages/events/src/client.tsx`](../../packages/events/src/client.tsx)
  already wrap `@openpanel/nextjs`.
- The wrapper already supports server/client custom events, OpenPanel profile
  identification, production-only client tracking, automatic screen views, and
  outgoing-link tracking.
- [`packages/db/src/schema/schema.prisma`](../../packages/db/src/schema/schema.prisma)
  already contains append-only `PageView` and `Event` models.
- Sales Finance already records privacy-bounded authenticated `PageView`
  adoption evidence and exposes a rolling 30-day readiness view; see
  [`sales-finance.md`](../features/sales-finance.md).

These are useful precedents, but neither existing table has the composite
unique key or atomic daily counter needed for a single per-user/per-day usage
row. Reusing `PageView` for every page visit would continue creating an
append-only record per occurrence.

The current OpenPanel wrapper should also receive a consent/data-flow audit
before expansion. The server identification path reads `tracking-consent`, but
the returned server `track` function is not conditioned on that value, and the
client provider does not show an explicit consent gate. That is a local code
observation, not a claim about OpenPanel.

## Decision matrix

| Option | Persistent authenticated user | Custom feature events | Exact one-row-per-user/day counter | Current price snapshot | Data/operations | GND fit |
| --- | --- | --- | --- | --- | --- | --- |
| Internal MySQL aggregate | Yes | Yes | **Yes, by design** | No new SaaS fee; uses existing app/database capacity | Full ownership; GND builds and maintains ingestion/reporting | **Best canonical fit** |
| PostHog Cloud | Yes | Excellent | No documented ingestion upsert; aggregate immutable events by day | 1M product analytics events/month free; then starts at $0.00005/event | Managed; US or EU cloud | **Best optional hosted exploration layer** |
| OpenPanel Cloud | Yes, per identify docs | Strong | No documented ingestion upsert; daily query aggregation | 30-day trial; 5k events $2.50/month, 10k $5, 100k $20 | Managed, EU analytics hosting; identity/privacy docs need clarification | Good because GND already integrates it, but not canonical |
| OpenPanel self-hosted | Yes | Strong | No documented ingestion upsert | Software free; infrastructure/operations are not free | PostgreSQL, Redis, ClickHouse, API, dashboard, worker; 2 GB minimum/4 GB recommended | Reasonable only if control justifies a second analytics stack |
| Umami Cloud | Yes, with Distinct ID | Good | No documented ingestion upsert; aggregate events by day | Hobby plan is free; paid plans are usage based on the live pricing page | Managed; US/EU; data export supported | Good lightweight option; less need because OpenPanel is already present |
| Umami self-hosted | Yes | Good | No documented ingestion upsert | MIT software is free; infrastructure/operations are not free | Node 18.18+, PostgreSQL 12.14+, Docker/source deployment | Lighter than PostHog/OpenPanel self-hosting, but still a second database/app |
| Vercel Web Analytics | **No** | Custom events only on Pro/Enterprise | No; anonymous aggregates | Hobby 50k events/month but no custom events; Pro usage $3/100k events | Managed by Vercel; no self-hosting | Poor for authenticated product usage |
| Plausible Cloud | **No, by design** | Custom events; properties require Business | No; anonymous aggregates | No permanent free plan; 30-day trial; at 10k events/month Starter $9, Growth $14, Business $19 | Managed in EU | Poor: user IDs conflict with its documented privacy rules |
| Plausible CE | **No, by design** | Custom events/properties | No; anonymous aggregates | Community Edition is free software | Docker, PostgreSQL, ClickHouse, 2 GB RAM recommended | High operational cost for a privacy model that rejects the main requirement |

All vendor prices and limits above are a 2026-07-30 snapshot and should be
rechecked before procurement.

## Vendor findings

### 1. Vercel Web Analytics

Vercel Web Analytics is a good public-site traffic tool, but it is the wrong
identity model for this project.

- Vercel says analytics datapoints are anonymous and not tied to an individual
  or IP. Its generated visitor/session identity is discarded after 24 hours.
  That makes persistent employee/user histories impossible by design. See
  [Vercel Web Analytics privacy](https://vercel.com/docs/analytics/privacy-policy).
- It automatically captures pageviews and supports client/server `track()`
  custom events with flat scalar properties, but custom events are available
  on Pro and Enterprise, not Hobby. See
  [Vercel custom events](https://vercel.com/docs/analytics/custom-events).
- The Web Analytics API returns aggregated visits/events grouped by time, route,
  or custom data, while raw streams require Drains. It does not change the
  anonymous identity model. See
  [the official Web Analytics API announcement](https://vercel.com/changelog/web-analytics-api).
- Current limits/pricing: Hobby includes 50,000 events/month without custom
  events. On Pro, collected pageviews and custom events are billed at
  $3/100,000 events; Pro has 12-month reporting. See
  [Vercel limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing).
- Next.js integration is first party through `@vercel/analytics/next`. See
  [Vercel's quickstart](https://vercel.com/docs/analytics/quickstart).

**Fit:** retain it only for anonymous public traffic if desired. It cannot
answer “which authenticated GND user used this page or feature?”

### 2. PostHog

#### Cloud

PostHog is the strongest turnkey product-analytics option in this comparison.

- `identify(stableUserId, properties)` connects events across sessions/devices,
  and the same distinct ID can be used in server-side capture. See
  [PostHog identification](https://posthog.com/docs/product-analytics/identify).
- Automatic pageviews/pageleaves and UI autocapture are available, while
  curated custom events use `capture()` and can include event properties. See
  [PostHog event capture](https://posthog.com/docs/product-analytics/capture-events).
- Trends can calculate total event count, unique users, and daily active users,
  filter by event/URL properties, and group by day/week/month. See
  [PostHog Trends](https://posthog.com/docs/product-analytics/trends/overview).
- It has an official Next.js guide covering App Router, Pages Router, browser,
  and Node/server capture. The guide currently marks `@posthog/next` as
  pre-release, so GND should start with the stable `posthog-js` and
  `posthog-node` packages if selected. See
  [PostHog for Next.js](https://posthog.com/docs/libraries/next-js).
- Current Cloud product-analytics pricing is 1 million events/month free for
  one project with one-year retention and unlimited team members. Pay-as-you-go
  preserves the monthly free quota and then starts at $0.00005/event. See
  [PostHog pricing](https://posthog.com/pricing).
- Cloud is available in US Virginia or EU Frankfurt. See
  [PostHog privacy guidance](https://posthog.com/docs/privacy) and its
  [Trust Center](https://trust.posthog.com/).

PostHog's normal ingestion model is an immutable event per occurrence. Its
documented daily calculations are query-time analytics, not an atomic mutable
row per user/page/day. It can answer the analytical question but is not a
replacement for the requested exact storage contract.

#### Self-hosted

- PostHog provides a free MIT Docker Compose deployment, but describes it as
  unsupported, without guarantees or paid support, and recommends Cloud for
  most users.
- Its self-host guide calls for an Ubuntu Linux environment around 4 vCPU,
  16 GB RAM, more than 30 GB storage, and a domain/DNS setup. Paid-plan features
  remain Cloud-only. See
  [PostHog self-hosting](https://posthog.com/docs/self-host).

**Fit:** Cloud is attractive; self-hosting is operationally disproportionate
for GND's first analytics milestone.

### 3. OpenPanel

OpenPanel is especially relevant because GND already uses its Next.js SDK.

#### Cloud capabilities

- OpenPanel's identification docs support a stable `profileId`, optional
  profile traits, persistent profile timelines, and event/session history. See
  [identify users](https://openpanel.dev/docs/get-started/identify-users) and
  [identified profiles](https://openpanel.dev/features/identify-users).
- It supports custom events/properties and provides a Next.js SDK for
  client/server events, automatic screen views, profile IDs, Vercel
  `waitUntil`, and proxying. See
  [event tracking](https://openpanel.dev/docs/get-started/track-events) and the
  [Next.js SDK](https://openpanel.dev/docs/sdks/nextjs).
- Its overview ranks events by count, and chart exports support daily
  intervals. See
  [the overview](https://openpanel.dev/docs/dashboard/understand-the-overview)
  and [chart export API](https://openpanel.dev/docs/api-reference/export/export/charts/get).
- Current Cloud pricing advertises a 30-day trial, $2.50/month for 5,000
  events, $5/month for 10,000, and $20/month for 100,000, with unlimited apps,
  users, dashboards, and profiles. It advertises self-hosting as free but does
  not clearly advertise a permanent Cloud free tier. See
  [OpenPanel pricing](https://openpanel.dev/pricing).
- Its terms say customers retain ownership and data is not sold/shared for
  advertising; Cloud analytics storage is in Germany and backups are in the
  EU. See [OpenPanel terms](https://openpanel.dev/terms) and
  [OpenPanel privacy](https://openpanel.dev/privacy).

There is a material documentation ambiguity to resolve. The current identify
documentation advertises persistent profile IDs, optional names/emails, and
individual timelines, while the May 2026 privacy page says OpenPanel does not
store persistent IDs, names, emails, or individual behavioral profiles. Before
GND expands Cloud usage with authenticated identities, obtain written
clarification and a suitable DPA/data-processing position.

#### Self-hosted

- The official Docker Compose deployment uses PostgreSQL, Redis, ClickHouse,
  API, dashboard, and worker services. It lists 2 GB RAM minimum and 4 GB or
  more recommended. See
  [OpenPanel Docker deployment](https://openpanel.dev/docs/self-hosting/deploy-docker-compose).
- The repository is AGPL-3.0. See
  [OpenPanel on GitHub](https://github.com/Openpanel-dev/openpanel).

**Fit:** lowest code-integration friction because GND already has it. Keep it
as an optional exploration layer, not the only system of record. Self-hosting
adds a meaningful database/queue/upgrade/backup burden.

### 4. Umami

Umami has become capable of lightweight identified product analytics.

#### Cloud

- A logged-in user can be assigned a Distinct ID with `umami.identify()`.
  Subsequent pageviews/events in the session are linked to it, and the UI can
  search that ID across sessions and show pages, events, and timestamps. The
  docs recommend an internal or hashed ID rather than email. See
  [Umami's identified-user guide](https://docs.umami.is/docs/guides/identify-logged-in-users).
- It captures named custom events through HTML data attributes or JavaScript
  and supports event properties and property filters. See
  [Umami event tracking](https://docs.umami.is/docs/track-events).
- Its statistics API filters by path, event, or distinct ID and supports daily
  time buckets for ranges up to six months. See
  [Umami website statistics](https://docs.umami.is/docs/api/website-stats).
- Umami Cloud says the Hobby plan is completely free, paid use is usage based,
  Cloud is managed in US/EU regions, and data can be exported. Each page hit
  and custom event counts toward usage, and each stored event-data property
  also counts as an event. See the
  [Cloud FAQ](https://docs.umami.is/docs/cloud/faq) and live
  [pricing page](https://umami.is/pricing).

The official pricing page is dynamically rendered; the durable official docs
confirm the free Hobby plan and usage-based billing but do not publish a
stable paid-tier table. Recheck the live quote if Umami reaches procurement.

#### Self-hosted

- Umami is MIT-licensed and can be installed from source, Docker Compose, or a
  prebuilt image.
- Current requirements are Node.js 18.18+ and PostgreSQL 12.14+; its Docker
  Compose bundle includes the app and PostgreSQL. See
  [installation](https://docs.umami.is/docs/install) and the
  [official repository](https://github.com/umami-software/umami).

**Fit:** the lightest credible self-hosted vendor option, but still duplicates
database, deployment, backup, monitoring, and upgrades that an internal GND
aggregate avoids.

### 5. Plausible

Plausible is intentionally privacy-first website analytics, not persistent
identified product analytics.

#### Cloud

- Plausible states it does not process personal data, track individual users,
  use persistent identifiers, or use cookies. See its
  [security and compliance overview](https://plausible.io/docs/compliance).
- Custom properties explicitly must not contain PII or pseudonymous end-user
  identifiers. Its current guidance specifically treats internal user IDs as
  data that should not be sent. See
  [custom properties](https://plausible.io/docs/custom-props/introduction) and
  [PII examples](https://plausible.io/blog/pii-examples).
- It does support custom events and scalar event properties, but custom events
  count toward billable usage and Cloud custom properties require Business.
  See [custom event tracking](https://plausible.io/docs/custom-event-goals).
- It can return aggregate event/pageview counts through the Stats API, but
  cannot provide authenticated-user histories without violating its intended
  model. See [Stats API](https://plausible.io/docs/stats-api).
- Plausible has no permanent Cloud free plan; it has a 30-day free trial. At
  the 10,000 monthly pageview/custom-event tier, current monthly pricing is
  Starter $9, Growth $14, and Business $19. See the
  [official pricing table](https://plausible.io/#pricing) and
  [subscription documentation](https://plausible.io/docs/subscription-plans).

#### Self-hosted Community Edition

- Plausible CE is free, AGPL-licensed software. See its
  [Community Edition announcement](https://plausible.io/blog/community-edition).
- The official Compose setup requires Docker/Compose, a CPU with SSE 4.2 or
  NEON, and recommends at least 2 GB RAM. It operates PostgreSQL for user data
  and ClickHouse for analytics. See the
  [official CE repository](https://github.com/plausible/community-edition/) and
  [configuration guide](https://github.com/plausible/community-edition/wiki/Configuration).

**Fit:** poor for this project. Self-hosting changes data custody but does not
make persistent employee/user identification consistent with Plausible's
documented model.

### 6. Fully internal MySQL-backed system

This section is an **architecture inference/recommendation**, not a vendor
claim.

An internal aggregate exactly matches the requested write model and GND's
current Next.js + Prisma + MySQL/Turborepo architecture.

Recommended logical model:

```text
SystemUsageDaily
  id
  businessDate            DATE
  userId                  FK Users
  app                     dashboard | dealership | mobile | api
  kind                    page | feature
  key                     canonical stable identifier
  groupKey                sales | inventory | reports | ...
  occurrenceCount         integer
  quantityTotal           integer, nullable
  firstOccurredAt         timestamp
  lastOccurredAt          timestamp
  createdAt
  updatedAt

UNIQUE(userId, businessDate, app, kind, key)
INDEX(businessDate, kind, key)
INDEX(userId, businessDate)
INDEX(groupKey, businessDate)
```

Examples:

```text
page       sales.orders
page       sales.reports
feature    sales.report.generated
feature    sales.batch.pdf_created
feature    sales.batch.printed
feature    sales.batch.exported
feature    inventory.batch.archived
```

For batch operations, increment both:

- `occurrenceCount += 1` to measure how often the workflow is used.
- `quantityTotal += selectedItemCount` to measure how much work it handles.

Use a single atomic MySQL `INSERT ... ON DUPLICATE KEY UPDATE`, executed behind
a shared package helper. The first occurrence inserts count `1`; later
occurrences for the same key/user/business date increment the existing row and
advance `lastOccurredAt`. This prevents the read-then-write race that a naive
application-level counter can introduce.

Derive `businessDate` centrally using the approved company/business timezone,
not the browser's arbitrary timezone. Store timestamps in UTC. If GND's
business timezone can vary by office in the future, include the authoritative
office/timezone context in the keying policy before rollout.

#### Collection rules

1. **Page usage**
   - Track route-template keys, not raw URLs.
   - `/sales-book/orders/123` becomes `sales.orders.detail`, not a row containing
     an order ID.
   - Never store query strings, customer names, search text, filters, payment
     IDs, or document tokens.
   - Emit once per real route arrival/navigation. A refresh or later revisit
     legitimately increments the day's counter.
   - Keep page tracking best-effort so analytics never blocks rendering.

2. **Feature usage**
   - Record successful domain outcomes, not merely button clicks.
   - `sales.batch.printed` should be emitted after the server has successfully
     produced/authorized the print artifact.
   - Put instrumentation in shared server/domain operations so dashboard,
     dealership, mobile, API, and jobs do not invent different meanings.
   - If failures matter operationally, track them under a separate bounded
     failure taxonomy; do not mix them into adoption counts.

3. **Retries and exactness**
   - Server-side feature events should attach an idempotency/request key when
     the underlying mutation can be retried.
   - If exact de-duplication across transport retries is required, add a
     short-retention ingestion receipt/outbox keyed by request ID and update the
     daily row in the same transaction.
   - Page analytics can remain best-effort because browsers, ad blockers, tab
     restoration, and lost connections make “perfect” view counts unrealistic.

4. **Security/privacy**
   - Use opaque internal user IDs in storage and join names only in an
     authorized GND report.
   - Do not mirror names, emails, customer/order IDs, free text, or financial
     context to a hosted vendor.
   - Add a dedicated permission such as `viewSystemAnalytics`; per-user drill
     downs should be more restricted than aggregate page/feature trends.
   - State in product policy that analytics is for product improvement and
     adoption support, not covert employee performance scoring.
   - Log access to identifiable drill-downs if they become management-facing.

#### Reporting model

Do not rank pages by raw visits alone. The system should expose:

- unique users in the selected period;
- total occurrences;
- active user-days;
- occurrences per active user;
- current 28 days versus previous 28 days;
- percentage change with a minimum-volume threshold;
- last-used date;
- number of users who used the feature/page for the first time;
- batch `quantityTotal` alongside batch invocation count;
- adoption breadth: users who used the feature divided by users eligible to
  use it, when permission eligibility can be calculated safely.

Suggested views:

- **Overview:** active users, tracked pages, tracked features, report usage,
  batch usage, and declining/unused surfaces.
- **Pages:** ranking and trend by canonical page key.
- **Features:** ranking and trend by feature key/action.
- **Users:** authorized drill-down of a user's active days and adopted features.
- **Health:** unknown keys, ingestion failures, high-volume anomalies, and
  instrumentation coverage.

“Dying” should mean a sustained decline with enough volume, for example current
28-day unique users/active-user-days versus the prior 28 days, not a one-day
drop. New and permission-limited pages must be labeled separately so low usage
is not mistaken for poor product value.

## Proposed delivery phases

### Phase 0: measurement contract

- Agree on the business timezone.
- Approve the privacy and employee-use policy.
- Create a typed registry of canonical page and feature keys, owners, and
  descriptions.
- Define which successful outcome owns each feature event.
- Decide whether OpenPanel remains enabled and whether PostHog will be piloted.

### Phase 1: internal foundation

- Add `SystemUsageDaily` with its composite unique key and reporting indexes.
- Add one shared server helper for atomic page/feature increments.
- Add a protected ingestion endpoint for client page arrivals.
- Add retention, unknown-key detection, and ingestion diagnostics.
- Cover concurrent upserts, timezone boundaries, soft-deleted users, and
  permission boundaries with focused tests.

### Phase 2: representative instrumentation

Start narrow:

- Sales Orders list/detail page use.
- Sales Reports page and successful report generation.
- Sales batch PDF, print, and export, including selected-item quantity.
- One Inventory batch action.
- Existing Sales Finance/Accounting adoption telemetry migration or bridge.

Validate the semantics and dashboard before instrumenting every route.

### Phase 3: analytics workspace

- Add protected overview/page/feature/user queries.
- Add 28-day comparison and “declining/unused” classifications.
- Add a Midday-style summary-first analytics workspace with deferred detail.
- Exclude identifiable user detail from general product dashboards.

### Phase 4: broaden and optionally mirror

- Expand the typed registry module by module.
- Mirror only the approved, privacy-bounded taxonomy to PostHog or OpenPanel.
- Disable broad autocapture/session replay unless there is a separately
  approved purpose.
- Compare internal totals with vendor totals and document expected differences.

### Phase 5: governance

- Review the event registry quarterly.
- Mark renamed/retired features instead of silently reusing keys.
- Add instrumentation coverage to feature completion checklists.
- Publish a monthly product-adoption review focused on optimization,
  discoverability, retirement, and training opportunities.

## Final option ranking

1. **Internal daily aggregate + optional PostHog Cloud:** best overall balance
   of exactness, ownership, exploratory power, and near-term cost.
2. **Internal daily aggregate + existing OpenPanel:** least integration churn,
   subject to privacy/identity clarification and a local consent audit.
3. **Internal only:** best if zero additional vendors is a hard requirement;
   reporting requires more GND engineering.
4. **Umami Cloud/self-hosted:** capable lightweight alternative, but adds a new
   platform despite GND already having OpenPanel.
5. **OpenPanel self-hosted:** capable but operationally heavier than the
   internal requirement warrants.
6. **PostHog self-hosted:** powerful but disproportionately heavy and
   officially unsupported for production operations.
7. **Vercel Web Analytics/Plausible:** useful anonymous web analytics, not the
   authenticated product-usage system requested here.
