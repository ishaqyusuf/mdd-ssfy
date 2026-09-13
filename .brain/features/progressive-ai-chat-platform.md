# Progressive AI Chat Platform

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

The platform plan is decomposed into 19 dedicated tickets. T01–T09 reproduce the verified Midday chat baseline inside GND boundaries. T10–T14 deliver GND business tools, PDFs, request-to-order workflows, schema-aware queries, and charts. T15–T19 deliver favorites/preferences, missing-feature intake and notifications, approval/security, individual access/usage governance, evaluations, and staged rollout. T01–T10 are complete; T11 is active.

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
