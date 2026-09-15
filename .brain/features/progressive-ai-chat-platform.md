# Progressive AI Chat Platform

## System-level workspace — 2026-09-15

The assistant is now a first-class authenticated workspace at `/assistant`, with
reloadable conversations at `/assistant?chat=<id>`. Its entitlement-gated
navigation is the first shared link inside every selected business module; the
Assistant is not itself a selectable module. The page keeps the standard
dashboard sidebar and header. The Sales Dashboard no longer mounts or owns chat. Legacy
`/sales-dashboard?assistant=true` links redirect to the canonical route while
preserving conversation query state. Runtime tools retain their existing actor,
grant, organization, and row-level scope checks; neutral placement does not
expand data access. See [ADR-104](../decisions/ADR-104-system-level-assistant-workspace.md).

## Live DeepSeek smoke test — 2026-09-15

The saved DeepSeek `deepseek-flash` configuration returns a complete greeting in
the live dashboard after correcting trusted configured origins for the shared
HTTPS proxy. See [browser smoke evidence](../reports/2026-09-15-assistant-deepseek-browser-smoke.md)
for business-tool acceptance results and outstanding findings.

Capability discovery now projects catalog entries to its declared strict output
schema, fixing `system_search_tools` validation failures. Browser retest returns
the Sales tool list; focused origin/registry/router coverage passes 25 tests.
Given-order visibility differs from the native Sales overview and remains an
open smoke-test finding. Persisted text history passes, but prior live tool groups
are absent after reload and follow-up responses misdescribe their own evidence.

## Conversation menu spacing — 2026-09-15

Assistant conversation menu items now apply the standard `gap-2` utility between
their icon and label. The change is scoped to
`apps/dashboard/src/components/assistant/assistant-header.tsx` and keeps the
shared `@gnd/ui` dropdown primitive unchanged.

Live browser verification confirms an 8px computed gap on all eight menu items;
the screenshot shows aligned icons and labels. The focused Biome check passes.

## Current state — 2026-09-12
UI-first interactive preview implemented. Canonical plan: [Progressive AI Chat Platform](../plans/2026-09-11-feature-progressive-ai-chat-platform.md). [Task/checklist](../tasks/2026-09-12-progressive-ai-chat-platform/2026-09-11-progressive-ai-chat-platform.md). [Verified Midday parity contract and ticket map](progressive-ai-chat-midday-parity.md).

- `/assistant` composes the client workspace beneath the existing authenticated dashboard layout.
- `/assistant-preview` renders the same synthetic component for isolated design review, only when NODE_ENV is development; it returns notFound otherwise. Existing auth/proxy code is unchanged.
- Welcome/composer, suggested prompts, chart/table, order status, invoice HTML preview, favorites, history, category/search tool browser, preferences and feature requests are local React state only. Nothing persists after reload.
- Registered demo scenarios use explicit sample data. Unknown prompts lead to the feature-request preview; this is a demo matcher, not capability classification.
- Release notification checkbox starts unchecked; Not now discards the dialog, Notify developers records a session-only preview with a no-send notice.
- Charts reuse @gnd/ui/chart and Recharts via lazy loading. UI primitives reuse existing @gnd/ui components. AI SDK streaming and AI Elements installation remain future integration work.
- No real order/customer data, permission claims, API tools, PDF generation, emails, notifications or provider calls are connected. Invoice HTML is illustrative, not a generated PDF.
- Chat response preference is selectable but not wired to model behavior; the UI explains this. History tracks submitted preview prompts rather than durable conversations.

## Files
`apps/dashboard/src/components/assistant/` contains the workspace, result cards, lazy chart, synthetic fixtures and scoped CSS. Route files are compositional.

## Verification
Browser checked welcome, chart, order, invoice dialog, favorite save/list and request consent/local submission. Compact viewport measured 390px content at 390px width. No browser error logs. Screenshots linked from the task. Authenticated-shell integration remains unverified because no employee session was authorized. No application schema/API changes; no migrations needed.

## Dashboard navigation clarification — 2026-09-12
User requires normal dashboard navigation with no separate assistant header. Removed the assistant header and moved chat actions beside the composer. Added the Assistant preview link to Sales navigation under existing Sales view/edit grants. `/assistant` continues to inherit the normal sidebar layout/header. The standalone development route is only a synthetic test fixture. Existing chat behavior is preserved. Browser confirmed header removal; full authenticated-shell verification remains pending.

## Implementation ticket roadmap — 2026-09-12

The platform plan is decomposed into 20 dedicated tickets. T01–T09 reproduce the verified Midday chat baseline inside GND boundaries. T10–T14 deliver GND business tools, PDFs, request-to-order workflows, schema-aware queries, and charts. T15–T20 deliver favorites/preferences, missing-feature intake and notifications, approval/security, individual access/usage governance, the complete admin feature-delivery center, evaluations, and staged rollout. T01–T11 are complete; T12 is active.

## Architecture foundation — 2026-09-12

ADR-090 and the dated task-folder implementation contract freeze the request-scoped Midday MCP architecture, GND package boundaries, explicit authorization checkpoints, tool naming/versioning, capability/effect vocabulary, connected-app/web-search policy, per-tool Zod outputs, and distinct artifact/job lifecycles. `apps/api/src/assistant/contracts.ts` now provides the tested public schemas. Focused tests pass 7/7; API typecheck reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` error.

## Durable history foundation — 2026-09-12

T02 adds actor-and-context-scoped conversation, message, run, tool-execution, and action-proposal storage. Message order and run-event order are allocated by the server inside retry-safe serializable transactions; client messages, generated run outputs, run requests, and tool calls have database-backed identities plus canonical request fingerprints. Tool input values are hashed then replaced by a redaction marker, and durable results contain bounded status/reference metadata only. Clients can persist bounded text and server-issued `StoredDocument` handles only, while assistant/tool/reasoning/source parts remain server-owned. Conversation list, search, history, archive/delete, run checkpoint/terminal state, and bounded reconnect queries carry user plus resolved scope into the database predicate.

Uploads and generated files continue through `StoredDocument` using `ownerType = "assistant_conversation"` and the conversation ID. Only current, ready, private, size-bounded image/text/PDF documents can enter user history; soft deletion also revokes those document rows. Assistant records use logical actor IDs plus explicit indexes; internal relations use Prisma `NoAction` semantics because this repository runs with `relationMode = "prisma"`. A bounded retention scan exposes due soft-deleted conversations for application-owned cleanup order.

## Protected streaming transport — 2026-09-12

T03 mounts authenticated `POST /api/assistant/chat` and actor-scoped reconnect reads under the existing API. The server derives active organization role, nondeleted role and individual permissions, trusted timezone, document handles, and connected-integration mentions. It rejects client-authored assistant history, raw upload URLs, oversized bodies, invalid origins, and integrations outside the actor's resolved connections.

Request and run persistence is atomic, retries reuse the durable run, and a queued-to-running claim allows one executor. Redis owns production request/concurrency limits with renewable token-owned leases; nonproduction may use an in-memory guard. Streams expose typed rate-limit, title, run, sequence, source, warning, and terminal parts with private no-store caching. Cancellation and provider failures persist generic terminal diagnostics, while reconnect maps database state through an explicit redacted DTO. T04 now owns the actual model runtime.

## Bounded agent runtime — 2026-09-12

T04 connects the protected route to an AI SDK 6 `ToolLoopAgent` with strict provider/model selection, a ten-step ceiling, at most twelve eligible discovery tools, one retry, a 4,000-token output ceiling, smooth text streaming, and a 45-second foreground deadline. The contextual system prompt uses normalized server-owned profile, organization, locale, timezone, currency, and display preferences. Uploaded summaries and resolved integration labels remain bounded, JSON-serialized untrusted data.

The runtime loads the latest actor-scoped durable conversation history, retains whole chronological turns within a 48,000-character/40-message limit, and persists generated assistant text before terminal success. Cancellation wins before persistence; once history is committed, a late abort preserves success so reconnect state cannot contradict the saved reply. Model, prompt, and catalog identities plus bounded token usage are stored with each run. Model discovery excludes write, external-send, destructive, and deterministic workflow tools; T05 now supplies the canonical registry and semantic selector.

## MCP registry and tool selection — 2026-09-12

T05 adds the canonical `assistant-catalog-v1` registry used by MCP execution, model discovery, UI catalog data, future recipes, and diagnostics. Every definition carries a stable version, GND domain, strict Zod input/output schemas, effect, required grants, presentation metadata, related tools, and capability state. System search and capability explanation are implemented; Sales, customer, inventory, Production, fulfillment, Community, document, finance, and employee capabilities have explicit coming-soon entries until their domain tickets ship.

Each turn owns an in-memory MCP client/server pair. The model sees only authorized implemented definitions. Every call reloads current authenticated access, verifies that user and scope still match the turn, rechecks grants, validates the typed result envelope, and closes both transports deterministically. Toolpick ranks only already-authorized public metadata, keeps discovery tools active, and stores no actor handler or result in its bounded caches. A frozen 512-dimensional general English sentence-embedding benchmark scored 75% top-1/top-3 versus 87.5% for the deterministic baseline, so production embeddings remain opt-in pending a representative evaluation.

## Live dashboard chat shell — 2026-09-13

T06 replaces the synthetic `/assistant` state with Midday-style `useChat` and `DefaultChatTransport` while retaining the normal dashboard header and sidebar. A strict request adapter sends only the latest user message plus durable conversation and request identities. Stream data updates title, request limits, run identity, reconnect cursors, warnings, and terminal status. The fixed responsive composer exposes offline, stop, retry, and reconnect states.

Conversation create/list/search/get/title/archive/delete operations use the same current actor resolver as the stream, including active user, organization, role, role-permission, and individual-permission checks. Chat URLs use `?chat=<id>` for refresh-safe deep links, and persisted messages hydrate on reload. The synthetic `/assistant-preview` remains a development-only design fixture.

Conversation reads return explicit UI DTOs and hydrate the newest bounded 200-message window in chronological order. Client request generations prevent late history or conversation responses from replacing newer selections. Reconnect polling survives React Strict Mode remount checks, recovered messages merge by ID, stop state reconciles from the durable run, and rejected quota requests show remaining allowance plus reset time.

## Composer, uploads, integrations, and web sources — 2026-09-13

T07 adds grant-sensitive curated suggestions with metadata-only usage events, queued multi-file selection, image/PDF previews and removal, paste/drop support, accessible failures, retry-stable request identities, and transient attachment/integration clearing. Assistant uploads require a resolved assistant actor, reserve staged count/bytes under a serializable transaction, use private Blob storage, adopt only the current actor's staged `StoredDocument`, parse PDFs authoritatively with a 50-page ceiling, and pass bounded image/PDF content into the model. Failed writes delete their deterministic reserved Blob pathname before tombstoning. Image preprocessing enforces pixel, output, cancellation, and time bounds and uses the PDF.js browser build so the API process does not load its optional Canvas native stack beside Sharp/libvips. The hourly retention job drains expired uploads and recovers stale deletion claims and abandoned reservations.

Connected apps follow Midday's Composio implementation: the actor's user ID scopes Composio sessions, active toolkits determine the public app list, each turn limits its session to explicitly mentioned configured toolkits, only the search meta-tool joins the runtime, live actor scope is reauthorized before execution, and failed-message retries preserve the original app context. Web search is configuration gated, applies locale-safe private-data checks, is available only to an isolated upload-free and integration-free public first turn, and is removed after any non-web tool result.

Connected-app definitions and their management URL come from bounded server configuration. The client can explicitly mention configured providers for the next message; the stream resolves that list again and rejects unknown providers. Web search follows run cancellation and emits unique HTTPS citation parts. A deterministic public-term policy blocks identifiers, record vocabulary, contact data, addresses, and unreviewed terms before any query reaches the external search provider.

## Streaming messages and typed response states — 2026-09-13

T08 replaces plain chat text with a stable message view model and Streamdown rendering for Markdown, code, lists, and tables. Completed assistant messages are memoized while the active response remains animated. The UI groups tools with explicit queued, running, complete, failed, and approval-required labels; renders at most eight scope-labelled sources; shows generic empty, ambiguity, partial, permission, degraded, and recoverable-error cards; and offers retry actions for recoverable cards. Remote and data-image Markdown is suppressed, external links require HTTPS, motion respects the user's reduced-motion preference, and one dedicated live status avoids repeated screen-reader announcements.

The runtime consumes the AI SDK full stream sequentially through an explicit server allowlist. It emits only assistant text, bounded public and workspace citation metadata, generic tool lifecycle data, and typed response cards. Reasoning content, tool arguments and business result data, provider metadata, generated file payloads, and raw errors never enter the browser stream. Error and abort events fail partial runs, open text and running tools receive terminal parts, denied approvals become an explicit failed state, and long tool-input parsing surfaces safe progress without exposing arguments. The stream drains before the run reaches terminal success, while the existing plain-text fallback remains available for compatible test/provider adapters.

## Entity links, artifact canvas, and mutation freshness — 2026-09-13

T09 completes the verified Midday chat baseline with typed order, customer, inventory, Community, document, and reviewed app-destination references. Only successful or partial results from GND-trusted tools may emit entity parts. Both server and client validate those parts, numeric record identifiers must be positive safe integers, document references contain opaque IDs rather than storage paths, and arbitrary app URLs are never accepted. Denied and malformed results render no record controls.

Record actions reuse the existing Sales Overview, customer overview, inventory, and Community query-param authorities. Documents resolve through an authenticated endpoint that verifies the current actor, scope, owning conversation, and private current Blob record. They render in a 650px side canvas using the existing `FileViewer`, expand to the full viewport below 700px, respect reduced motion, support Escape/focus restoration and compact focus containment, and can move into the existing global document viewer. The selected artifact ID is URL-owned and restores only when durable trusted message parts contain the matching document.

Successful and partial trusted mutations may emit only reviewed invalidation tags when the canonical tool registry classifies the tool effect as write, artifact, external-send, or destructive. The dashboard maps those tags to the existing query-event families for Sales, customers, inventory, Community projects, and user documents, deduplicates by tool-call ID, and refreshes global search once per new event batch. Entity and invalidation parts are persisted with the assistant message so reconnect and reload preserve links and freshness. No tool payload or model-authored query key reaches TanStack Query.

## Sales and customer read tools — 2026-09-13

T10 implements seven versioned, typed read tools for order discovery, canonical status, blockers, timeline, customer discovery, safe summary, and customer order history. Each call derives organization or representative scope from the current actor, repeats grant checks at execution, excludes deleted records, defaults away from archived sales, preserves decimal values as strings, and uses bounded projections and pagination.

Detailed Sales results reuse `sales-pipeline/v2` for lifecycle, payment, material, Production, Fulfillment, packing, Dispatch, blocker, conflict, and freshness facts. Duplicate order/quote numbers return explicit choices. Revisions include related delivery, payment, statistic, pipeline, and timeline-history evidence; stale callers receive typed conflicts. Customer records use the privacy-safe `cust-<id>` route authority and never expose phone or email through these tool results. Finance fields and payment blockers require the existing payment grant, and related-action hints are filtered to actions the actor can execute.

The canonical catalog is now `assistant-catalog-v2`. Both deterministic selection and the frozen local semantic benchmark include natural Sales/customer requests; semantic embeddings remain optional because the measured frozen model still underperforms the deterministic baseline. Typed entities route orders and quotes to their correct dashboard modes, customer links use the supported opaque account key, and ambiguity/conflict results remain reviewable in chat.

## Operations and Community read tools — 2026-09-13

T11 adds nine typed `assistant-catalog-v3` reads for physical inventory and demand,
worker/manager Production status and schedules, fulfillment status and exceptions,
and Community project discovery, summaries, and unit lists. Production reads reuse
active Sales order and assignment boundaries. Inventory separates committed from
pending-review allocations and combines physical, inbound, and outstanding demand
without exposing supplier or commercial fields.

Community reads require an active project and independently gate job/task, invoice,
and document aggregates with their existing grants. `CommunityUnit` users may find
projects and units, but never receive install costs; invoice amounts remain absent
without full invoice access. Results include bounded pagination, evidence-backed
revisions, source records, related actions, and validated project/unit deep links.
Focused validation passes 129 tests and 522 assertions; both independent reviews are
clean. No database schema or migration changed for T11.

## PDF artifact workflows — 2026-09-13

T12 implements durable Sales PDF status, queue, retry, cancellation, storage,
download, source-freshness, and expiry cleanup boundaries on the existing canonical
Sales v2 renderer. Concurrent requests share one source-bound snapshot and Trigger
idempotency key. The worker reauthorizes the current actor, scope, grants, Sales
record, and canonical revision before claim and completion. Failed uploads retain a
cleanup handle; an hourly task atomically invalidates seven-day expired snapshots,
deletes Blob objects, and tombstones `StoredDocument` rows.

Status and authenticated preview are implemented in `assistant-catalog-v5`.
Generation and cancellation stay unavailable to model discovery until T17 adds the
approved artifact execution path. T12 is 5/7 complete; statement/report document
families and reconnect/app-output parity evidence remain.

## Order draft creation — 2026-09-13

T13 has started with `assistant-catalog-v6` and the strict text-only
`sales_draft_from_request@1` preview contract. It carries the native
`NewSalesFormSeed`, published configuration identity, provider/model and prompt
identity, generation ID, bounded nested-provider usage, and derived unresolved
state. The contract is a draft action requiring `editOrders`; it remains
`coming_soon` until T17 connects approval and nested usage accounting. Image input
is rejected until the separate evaluated image phase.

The first checklist item is now complete. The default draft service reuses the
production Sales Request preview orchestrator with the current pilot, permission,
usage, benchmark, repeatable-read catalog snapshot, provider, and durable
actor-bound telemetry boundaries. A preview proceeds only when the catalog is
published and its published revision exactly matches the generated context. MCP
cancellation propagates into provider work.
The native form initializer and artifact canvas remain the next T13 slice.

The native initializer slice is now complete. Strictly validated draft output is
stored as a dedicated durable chat part and opens in an adjacent dashboard canvas.
The canvas reuses the existing Sales proposal preparation and generic initializer,
checks the exact published revision even for unresolved requests, resolves fresh
components, and displays the authoritative native grand total. T13 is 2/8 (25%);
complete evidence presentation and edit/apply/discard remain next.

## Schema-aware analytics and generative UI — 2026-09-13

T14 adds the versioned `analytics_query@1` read tool and
`assistant-catalog-v7`. Six reviewed metrics cover Sales revenue and order status,
Fulfillment blockers, Production throughput, Inventory pending demand, and
Community progress. The model submits only a strict semantic intent; code owns all
SQL identifiers and binds actor scope, dates, filters, timezone, and limits.

Every request rechecks current grants and business scope. Direct aggregates and
canonical Sales pipeline/inventory projections share query-count, row, byte, date,
cost, cancellation, and whole-operation eight-second limits. Production follows
the canonical submission-to-item-to-order path. Typed analytics parts persist with
conversation history and render as KPI, table, bar, line, or area cards using the
existing GND chart wrapper, accessible table fallback, definitions, sources,
units, date/timezone, observation time, and allowlisted dashboard drill-downs.

Representative local MySQL `EXPLAIN` plans used the existing primary and relation
indexes with bounded row estimates, so no speculative index or migration was
added. The full Assistant API suite passes 134 tests and 727 assertions; targeted
formatting, diff integrity, and changed-path type checks pass. Both independent
reviews are clean.

## Saved actions, preferences, and explicit memory — 2026-09-13

T15 adds actor-and-scope-owned display preferences, removable personal memory,
prompt shortcuts, and versioned deterministic recipes. A recipe stores its exact
registry identity, effect, compatibility revision, typed parameter definitions,
reviewed JSON input template, output bindings, display order, optimistic version,
and last-run state. Saving from chat requires a durable successful execution; the
server derives the tool identity rather than trusting browser input.

The normal Assistant toolbar now opens favorites and preferences without adding a
separate page header. Prompt shortcuts append to chat. Read and draft recipes
reauthorize current actor scope and grants before executing. Write, artifact,
external-send, and destructive recipes always create a new expiring proposal and
one-time approval token. Incompatible or retired recipes stop with a bounded
catalog repair preview and never execute generated code or SQL.

Response style, detail, and chart presentation are trusted server formatting
settings. Explicit personal memory is bounded, removable, and serialized within
the prompt's untrusted context. Ordinary MCP tool calls now record durable,
redacted execution evidence so eligible chat outcomes can become favorites. The
full Assistant API suite passes 151 tests and 772 assertions. Saved-result refreshes
cannot remount a different active conversation, unresolved drafts remain completed
but non-reusable, and failed MCP recording cannot replace the original tool error.

## Missing-feature intake and release notices — 2026-09-13

T16 adds a typed missing-capability result and editable request flow in the normal
Assistant dashboard toolbar. Missing capability remains distinct from permission,
prerequisite, ambiguity, outage, and degraded-rollout states. `Not now` writes
nothing; developer notification and the initially unchecked release opt-in are
independent choices.

Canonical scoped requests retain idempotent user submissions, minimal evidence,
explicit subscriptions, immutable sequenced events, bounded cited AI analysis,
developer ownership/merge/review state, verified capability releases, and a
deduplicated notification outbox. Super Admins manage triage and publication.
Release delivery repeats consent and current access checks and covers subscribers
from canonical requests plus merged duplicates. Users can review request status and
unsubscribe from the Assistant menu.

## Per-user Assistant quotas — 2026-09-14

Assistant bootstrap now returns the current account entitlement plus a bounded
personal allowance projection. Effective-dated policies support daily/monthly
requests and tokens, concurrent runs, optional integer-micro cost ceilings,
warning thresholds, timezone resets, hard enforcement, warning-only observation,
and dry-run observation. Null limits remain unlimited.

Every provider run reserves capacity under a serializable transaction before it is
claimed for execution. The run ID makes admission idempotent across UI retries.
Terminal completion settles actual provider-ledger tokens and estimated cost in the
same transaction; recovery settles conservatively when exact usage is unavailable.
Quota failures are typed separately from Redis infrastructure rate limits. The
standard Assistant toolbar shows only the current user's remaining requests and
tokens plus reset time; organization spend and other users remain Super Admin data.

## Dashboard provider selection — 2026-09-14

The standard `/settings/assistant` page now lets Super Admins select the global
Assistant provider and one allowlisted model. OpenAI, Anthropic, DeepSeek, and
Google appear in the same dashboard surface as individual access. Credential
presence is shown only as configured or missing; key values remain in server
environment variables and an unconfigured provider cannot be saved.

The database stores one optimistic-versioned global selection plus immutable audit
events. New runs snapshot that selection into the existing durable model identity,
so a later administrator switch affects only newly started runs. Invalid persisted
catalog entries fail safely to the environment selection. ADR-096 records this
boundary. Focused validation passes 43 tests / 133 assertions, local `db:push` and
Prisma generation pass, and browser verification confirms the standard dashboard
shell and all four provider options.

## First MVP audience — 2026-09-14

The first Assistant MVP is restricted to authenticated Super Admin accounts. Its
release gate covers the standard desktop dashboard, safe provider/model selection,
Super Admin usage visibility, core Sales and Community reads, schema-aware charts,
supported PDF generation, reviewed text order creation, feature-request submission,
and essential recovery/disable evidence. Existing domain permissions, row scope,
redaction, approvals, and idempotency remain mandatory.

Employee enablement, bulk access, employee quota administration, full reporting and
CSV export, image/OCR order input, statement/report PDF expansion, mobile acceptance,
and the complete T20 feature-delivery center are post-MVP unless separately promoted.

## 2026-09-15 — Simple experience and diagnostics implementation progress

Chat now uses generic business progress for unknown tools, hides completed tool counts and internal reasoning labels, and retains explicit approval prompts. Typed outcome messages override technical model narration; trusted missing-feature review remains available. A secondary Help disclosure exposes the support reference, and a server-verified Super Admin capability enables View diagnostics. Assistant Administration has a paginated diagnostics inbox; URL parameter `assistantDiagnostic` opens a conditionally loaded shared detail sheet with sanitized technical context, execution timeline and audited review controls. Failed outcomes and deduplicated tool states persist for reload.

Focused runtime/redaction/access/review/history tests pass. Browser checks confirm a concise DeepSeek greeting and the empty diagnostic inbox. Full capture-boundary coverage, populated-sheet QA, safe recovery matrix and rollout are still in progress. Broad typecheck is currently blocked by unrelated settings/mailbox errors; dashboard typecheck stops at a syntax error in `request-generation-transaction.test.ts`.

### Assistant capture and retention follow-up

MCP handler failures capture the original exception before safe wrapping. SDK and MCP error content is scrubbed before each model step. Runtime distinguishes MCP error results from successful completion and preserves captured references. `assistant-diagnostic-retention` runs hourly in the jobs scheduler, deleting at most 2,000 expired occurrences per invocation, with their review rows; query reads already hide expired details. Scheduling execution after deployment is not yet acceptance-tested.

### Diagnostic filtering and browser transport reports

Diagnostics now exposes advanced stage, outcome category, provider, model, environment and local-time date filters, with date validation and Clear filters. Browser QA verified unmatched model yields the empty state and clearing restores the existing synthetic incident. Noncancelled chat network failures submit bounded authenticated client reports; ordinary chat displays only the safe outcome and optional Help reference. Render/attachment/reconnect report contracts exist but their UI integrations remain pending.

### Assistant diagnostics: client and approval recovery

Unexpected attachment, rendering and reconnect failures use friendly static messages and authenticated sanitized reports. Attachment validation corrections remain actionable without raw server errors. Approval create/read/decide exceptions return correlated public references. After a decision attempt, the dialog requires a status read before exposing confirmation again; a still-pending authorized review can be confirmed with the same confirmation identity. Incomplete stored reviews cannot be confirmed. This behavior remains under browser recovery acceptance testing.

### Business approval review and diagnostic monitoring

Document approval now presents a validated business summary instead of request JSON, internal effect names and revisions. It identifies the order/quote, document type, fresh-PDF request where applicable, and prepare versus stop action. Unsupported/malformed reviews cannot be confirmed.

Private diagnostic details now include existing-monitoring submission status and the event ID when available. This ID uses the same occurrence reference on repeated delivery; it indicates SDK submission, not guaranteed remote receipt. The database remains the canonical review inbox.

### Approval diagnostic replay

Caught execution failures and returned failure envelopes now finalize with safe typed outcomes. Their opaque diagnostic reference persists with the proposal/run result and survives authorized status checks without re-executing the action. Failed receipts omit raw warning strings. Revoked access hides the saved outcome/reference; staff see deterministic outcome copy and the matching Help reference where authorized.

### Mixed results and uncertain effects

Successful typed results remain available when another check fails. Read/draft failures use a single partial-result explanation when useful business work succeeded. Artifact/external-send/write/destructive failures retain uncertain-action wording and require status reconciliation. Compatibility text streams buffer narration until completion so interrupted provider text cannot appear before the friendly failure.

### Diagnostic pagination during retention

The inbox uses timestamp/reference boundaries rather than looking up the last row from the prior page. Expiring or deleting that row no longer makes later incidents disappear from pagination. A saved rollback-only local MySQL integration verifies filtering, expiry, audited review and this retention/pagination interaction.

### History and attachment failure reporting

Failure to load conversation history or attachment context produces a safe referenced outcome. The diagnostic records the original failure at its history/attachment operation before REST forwarding, avoiding duplicate incidents. Cancelled requests do not generate these incidents. New execution summaries retain warning counts instead of potentially technical warning bodies.

### Reply-save uncertainty

If saving a completed reply fails, the visible answer remains available with Copy. A short notice says it may not be saved and advises copying before leaving the page. The assistant does not rerun the provider or business action. Developers can open the save diagnostic from Help. Uncertain database commits and diagnostic-service failures preserve the useful response; neither is described as a failed business action.

### Approval checks and stale actions

If an approved action loses its final result, a later status check records an uncertain result and a diagnostic reference without re-executing it. Temporary preflight failures do not claim permissions were revoked. Changed records and revoked access have distinct safe messages; protected old results are hidden, and the UI does not claim new success based solely on a historical terminal status.

### Assistant record-link cleanup (2026-09-15)
Repeated tool results now render one related-record link per kind, subtype and record ID. Distinct quotes, orders and customer records remain separate. Simple status/document responses have more explicit concise business-language prompt guidance; this is guidance, not a deterministic output-length guarantee.

### Assistant narration/history refinement (2026-09-15)
Final responses omit model narration preceding tool checks and retain independent typed business results. Distinct final text blocks preserve paragraph boundaries. Historical execution notes are supplied separately as private model context, preventing the observed reply-format imitation path. A fresh browser follow-up accurately recalled the lookup in one sentence. Exact-order initial search inconsistency remains under acceptance investigation.

### Multiple-match clarification (2026-09-15)
Multiple matching order/quote candidates now receive a clear choice question rather than generic missing-input copy. Candidate links remain available. Runtime tests verify one neutral prompt and distinct order/quote links; live ambiguous lookup acceptance remains pending.

### Diagnostic UI release control (2026-09-15)
Inbox, detail sheet and in-chat View diagnostics are mounted only when the API confirms both authority and UI rollout. A shared cached access query refreshes every 30 seconds on active surfaces. Disabled surfaces do not mount their list/detail queries. Public Help references and diagnostic capture stay active. See the diagnostic rollout runbook for off/restore semantics.

### Partial order findings (2026-09-15)
When a request has a non-success outcome, a “What I found” section preserves validated successful order status with its check time. Regular successful replies avoid duplicate summaries. Repeated observations keep the latest status; order and quote identities stay distinct. Copy includes preserved finding text. Persistence/reload and diagnostic linkage are tested. Other successful result types and selective failed-read retry remain incomplete.

### Quiet read recovery (2026-09-15)
One transient read per Assistant request may retry once after a bounded wait and renewed authorization. Successful recovery does not interrupt the user with an error. Every failed attempt keeps private diagnostic evidence; a later failure shows only its final reference. Shared retry budget, cancellation and server Retry-After are respected. No automatic write/document replay was added. Explicit selective retry controls and broader partial-result recovery remain pending.

### Capture health in diagnostics (2026-09-15)
The developer inbox shows recorded capture attempts today (UTC), confirmed/unconfirmed database storage and monitoring submission/unavailability/failure counts. Missing Redis or invalid counters show unavailable rather than healthy zeros. Metrics contain fixed counters only and expire after 31 days. Server logs retain a reference-only signal if metrics themselves fail. Current local profile lacks Redis configuration; the live UI correctly displays unavailable. Isolated Redis integration passes; environment setup/deployed coverage remain separate.

### Simple Assistant: attachment corrections (2026-09-15)
Oversized and unsupported attachments, including images with the selected DeepSeek
provider, are rejected before downloading bytes. Known unreadable PDF/image errors
show a short file correction message. Unexpected decoder failures retain a generic
temporary-failure message. Nested preprocessing boundaries retain one diagnostic
per error and preserve the original decoder cause for sanitization. No model call
starts after attachment failure. This slice is covered by injected API tests; live
attachment browser acceptance remains outstanding.

### 2026-09-15 — Preserve early Assistant failures in conversation history
The REST execution catch now persists the public outcome and fixed copy before
finalizing a failed run. This covers attachment/history/pre-model throws that
previously appeared only in the live stream. Persistence uses the existing scoped,
run-idempotent generated-message helper; raw errors are never saved as chat text.
If transcript persistence fails, the original outcome remains primary and a
separate history-unconfirmed notice is emitted with its own diagnostic. Execution
is never replayed. User cancellation skips failure persistence and capture.
Focused REST/execute-turn suites: 39 pass, 162 assertions. Browser refresh acceptance
for an actual attachment failure is still outstanding.

### 2026-09-15 — Upload failure Help and exact diagnostic copy
Added upload-failed to the strict public outcome vocabulary and shared its fixed
copy with the attachment composer. Client attachment reports now record that exact
copy instead of the generic temporary-check message. A confirmed recorded report
adds the existing Help / authorized View diagnostics control beside the composer
error. Missing/failed recording adds no misleading link. Generation and error
version checks discard late report references after a new attempt, clear, discard
or removal. Tests: 13 pass / 58 assertions across client-report, health, outcome and
diagnostic-details suites. Live Help-link acceptance remains dependent on working
upload/report infrastructure; no durable capture was claimed in the failing local
upload test.

### 2026-09-15 — Signed-out text recovery
The live chat transport now snapshots the submitted user text and restores it on
HTTP 401 only when the composer is empty and the response belongs to the current
transport attempt. A newer draft is not overwritten. A Sign in link opens /login
in a separate tab, keeping the conversation and restored draft in memory; copy
explains returning to send manually. No automatic resend or write replay occurs.
This does not provide durable draft recovery after closing the tab, nor restore
attachment chips. Browser expired-session acceptance remains open.

### 2026-09-15 — Monitoring event lookup link
Submitted Sentry captures now retain a validated SENTRY_ORG slug with their event
ID. The authorized diagnostic detail sheet builds a fixed sentry.io organization
issue-search link for that exact event ID and a 30-day window. It ignores arbitrary
stored URLs and hides links for unavailable/failed/malformed or legacy records
without an organization. No environment files changed. This is an event lookup
link, not proof of remote event delivery or a resolved issue permalink.
Reference for event-ID issue lookup: https://forum.sentry.io/t/event-id-sentry-issue-url/4005/2
Live remote destination/delivery verification remains outstanding.

### 2026-09-15 — Capture upload validation before generic wrapping
The upload endpoint already parses Assistant PDFs before storage. Malformed PDF
validation therefore explained the earlier incomplete-file test without proving a
blob service failure. Added typed upload-validation reasons with retained decoder
causes. Assistant validation runs inside assistant.validateUpload capture, with
actor/scope context and fixed unreadable/size correction copy. Unexpected decoder
failures remain upload-failed, not a claimed invalid file. The composer accepts
only approved server copy with a valid reference and avoids duplicate browser
reporting when the server already captured it. Other upload workflows retain their
existing BAD_REQUEST messages. Actual parser test proves InvalidPDFException cause
retention. API typecheck reports only the existing Sales copy nullability issue.
Live re-test of corrected upload Help flow remains open.

### 2026-09-15 — Live unreadable-PDF correction and Help verified
First live retest created ERR-080987B7E3 at assistant.validateUpload with outcome
upload-failed. Its sanitized frame identified PDF.js fake-worker setup in the Next
server bundle. Source inspection confirmed a relative dynamic worker import.
Added pdfjs-dist to dashboard serverExternalPackages so the package resolves its
worker beside its installed module. No shared proxy or environment settings changed.
Second live upload of /tmp/gnd-assistant-unreadable-qa.pdf produced
“I couldn't read that file. Try another copy.” Help opened ERR-31FFE0E445, with the
exact same copy, attachment-unreadable, VALIDATION_FAILED and assistant.validateUpload.
The diagnostic was marked resolved with a clearly labeled local QA note, verified
in review history. No attachment was stored and no model/business action ran.
This closes the live upload-validation/correlated-Help scenario; post-submission
attachment failure history/reload and actual successful uploads remain separate.
Known InvalidPDFException/PasswordException names are now retained in sanitized
future diagnostics; arbitrary error messages remain excluded. Existing immutable
records are not rewritten. Monitoring remained unavailable locally.

### 2026-09-15 — Shadcn composer and empty state
Reused shared InputGroupTextarea/addon/buttons, Field and Empty primitives. Added
official shadcn Attachment composition from CLI source, adapting cn/Slot/Button
imports to existing workspace dependencies without overwriting shared Button.
Composer now uses a controlled textarea instead of contenteditable/execCommand;
file paste, Stop, error Help and attachment removal remain connected. Drop events
stop propagation to prevent duplicate parent uploads. New-chat Empty provides
three suggestions that fill the draft for review. Browser /assistant verified
visual layout, suggestion fill, native Shift+Enter and disabled empty Send. No
message sent, broad typecheck or new unit tests for this UI-only follow-up. Existing
Assistant diagnostics/retry implementation remains paused. Task ticket updated.
