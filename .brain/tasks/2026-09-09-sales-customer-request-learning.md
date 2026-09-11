# Task: Generate sales form drafts from requests and live configuration

## Status
In Progress

## Priority
Medium

## Plan File
[Detailed implementation guidelines](../plans/2026-09-10-configuration-driven-sales-generation.md)

## Created Date
2026-09-09

## Last Updated
2026-09-11

## Source Context
Execution steering: implement backend functionality and automated tests first.
Delegation preference: use Luna Max for bounded implementation/investigation and
Sol High for more involved independent work to reduce Astra usage; primary agent
retains integration and final verification. User explicitly authorized agents.
UI, browser testing and connecting the creator to the form UI are deferred until
the technical pipeline is tested. Retain those items as later-phase work rather
than treating them as prerequisites for backend delivery.
Primary input is pasted customer-request text. Image input is explicitly secondary
and means a screenshot/snapped email or order, or a photo/scan of handwriting—not
product photography. Reuse the same seed contract; unreadable/cropped facts remain
unresolved rather than inferred.

The user replaced the historical-example learning approach on 2026-09-10.
Supply email text or request images, a compact sales skeleton schema, item-type
step sequences, and each step's available component IDs/titles to AI. AI selects
from this configuration and returns a skeleton. GND hydrates those selections
through the normal form engine, resolves current prices, and calculates totals.
Optional 3–5 synthetic shape examples demonstrate structure, not historical sales.

This specification supersedes the previous contents of this ticket. Training-data
collection, example approval, embeddings, vector storage and historical-sale
retrieval are no longer prerequisites or implementation milestones. Keep this
file path stable so existing links continue to work.

## Implementation Progress
- Ticket Position: 1/1
- Completion: 100%
- Current Checklist: 15/15 — Provider-agnostic backend and Sales Settings selection implemented
- Blockers: Provider credentials are not configured locally, so paid live-model accuracy, token,
  cost and latency measurement cannot run. A clean scoped commit is unsafe while
  unrelated active work overlaps shared manifests/lockfile. UI and image extraction
  remain intentionally deferred.

## Product Contract
- First deliver a small Dashboard prototype: paste email/request text or upload
  a readable request photo/screenshot, generate a skeleton, inspect the result,
  then open/apply it to an unsaved sales form for review.
- Prioritize pasted text. In the secondary image phase, support text plus screenshots,
  snapped order/email images, and handwritten request photos. Use an image-capable provider through the
  Vercel AI SDK; enforce supported media types, byte/pixel limits, and private
  access. Blurry, cropped or unreadable details become unresolved questions.
- AI generates selections and customer-specified values. GND owns hydration,
  dependencies, product resolution, current pricing, tax and totals.
- No historical sales are sent. No training dataset or new vector database.
- Save only through existing sales save actions after review. Generation or form
  opening must not silently finalize/send invoices or mutate inventory/payments.

## Configuration Input
Latest extension: add a clearable default component per item-type/step configuration.
Export native UID-based component visibility variations and default policies to AI.
Apply defaults deterministically only when source information is omitted and the
default satisfies current visibility rules; explicit, ambiguous or unreadable input
must not be replaced silently. See the detailed guide's added design and execution
skill sections. The implementation must follow `implement-with-progress`.

Build a server-owned, versioned projection of the actual settings available to
the current user/business/dealer scope:
- Item types: stable ID, title, ordered step IDs and required/optional semantics.
- Steps: stable ID, name, and components limited to ID and title.
- Keep branching, applicability and dependency rules in compact configuration
  metadata where they affect legal selections; a flat list alone is insufficient
  if choices depend on preceding steps.
- Describe free-value fields separately: quantity, unit, dimensions, handing,
  swing and room/location where these are not actual component selections.
- Supply a JSON Schema/Zod output contract and a minimal example based on the
  real sales-form structure. Do not send the full live form state, historical
  prices, customer records, or irrelevant settings.
- Optionally include 3–5 synthetic examples for structurally different item types.
  Examples must conform to the same schema and current selection rules.
- For the prototype, send complete applicable configuration if it fits the
  measured token budget. For large catalogs, first identify candidate item types
  then fetch only their steps/components, allowing expansion when classification
  is uncertain. Never arbitrarily drop valid components to meet a token limit.
- Cache the compact projection by actual access scope and configuration revision/hash;
  invalidate on settings changes. Revalidate current configuration before apply.

## Output Contract
Define a small versioned `NewSalesFormSeed` DTO as a strict partial form shell,
using the editor's native `lineItems`, `qty`, `formSteps`, `stepId`, `prodUid`,
`selectedProdUids`, and `housePackageTool.doors` vocabulary. It is not a second
AI-specific proposal model. Proposed shape:
- schemaVersion, configurationRevision, lineItems, unresolved.
- Each line has a transient native `uid`, qty, formSteps and supported explicit
  house-package facts. The shared initializer may normalize/regenerate that UID;
  no persisted database row identity is model-generated.
- Preserve groups, openings versus leaves, dimensions and units where applicable.
- Each unresolved entry identifies item/field, reason and source text or image
  reference. Missing/ambiguous selections remain null or absent as the schema permits.
- AI may select IDs only from supplied allowed candidates. Do not ask it to
  invent database row identities, costs, prices, totals or persisted sale metadata.
- Treat source text/images as data rather than instructions. Schema validation
  alone does not prove an ID belongs to the right step or item type.

## Hydration and Validation
Implement one package-owned new-sales-form seed initializer, reusable by AI,
templates/imports and ordinary form bootstrapping rather than owned by the AI API:
1. Validate output schema, allowed IDs, ID/step/type membership, dependencies,
   quantities and units. Reject unsupported selections with actionable issues.
2. Reload authoritative component records and replay selected steps in dependency
   order through the existing new-form workflow actions/resolvers. Reuse supported
   default rules; do not maintain a parallel pricing or selection engine.
3. Populate the actual door, shelf, HPT or other supported line structures and
   invoke canonical pricing/recalculation with current customer/profile context.
4. Preserve missing required choices as incomplete. Missing price is a visible
   review/blocking state, not an accepted zero-price product.
5. Show the hydrated preview and allow the rep to apply it. On an edited form,
   show changes explicitly, guard against stale revisions, and provide undo.

Do not assume assigning component IDs to stored JSON or opening the page triggers
all normal selection side effects. Prove equivalence to manual configuration first.
If existing hydration lacks this behavior, implementing the shared adapter is part
of the feature. Customer/profile selection must be available for correct pricing.

## Implementation Checklist
- [x] Inspect local settings and export a price-free sample using only steps referenced by configured routes; exclude unused component families.
- [x] 1. Inspect current item-type configuration and manual step-selection paths; prove a fixed interior and exterior skeleton hydrate and price identically to manual entry.
- [x] 2. Define strict proposal and configuration contracts plus compact scoped configuration exporter in the sales domain; include dependency metadata and revision/hash.
- [x] Add per-route-step default settings persistence, authorized editing API, and eligible fallback resolver with request/default provenance and visibility parity tests.
- [x] Add the complete scoped, price-free server configuration snapshot cache with structural invalidation, atomic revision publication, compact tuple-JSON serialization and size comparison against CSV; test price-only stability and concurrent rebuilds.
- [x] 3. Add authenticated text/image generation endpoint using Midday Vercel AI structured output, bounded provider calls and actionable failures.
- [x] 5. Implement native seed validation and the shared new-sales-form initializer for the declared door subset; incomplete/unsupported requests remain reviewable.
- [x] 6. Implement backend stale-configuration checks, current pricing and normal save/reopen compatibility; defer UI apply/undo.
- [x] 7. Evaluate text fixtures first. Live model accuracy/token/cost/latency
  measurement remains an explicit pre-pilot gate. Handwritten-photo and
  email/order-screenshot extraction evaluation is deferred by product direction.
- [x] 8. Complete focused backend tests and Brain feature/API documentation, record supported types and pilot limitations; browser validation is deferred.
- [x] Complete implementation-skill code review and resolve findings. Scoped commit
  is deferred because unrelated active work overlaps shared manifests and lockfile;
  committing them together would violate task isolation.
- [x] Add an allowlisted OpenAI, Anthropic, DeepSeek, and Gemini provider/model
  contract persisted in the authoritative Sales Settings metadata.
- [x] Add Super Admin settings read/update API and the minimum Sales Settings UI
  selector needed to configure the feature without environment model selection.
- [x] Add provider adapters and resolve generation exclusively from persisted Sales
  Settings while retaining server-only provider credentials.
- [x] Complete provider-focused tests, final review, Brain synchronization, and a
  safely scoped commit when the shared dirty worktree permits it.

## Architecture and Midday Guidance
- Inspect local Midday at /Users/M1PRO/Documents/code/_kitchen_sink/midday,
  especially apps/api/src/chat/utils.ts for generateText + Output.object and
  packages/documents/src/processors/base-extraction-engine.ts for provider
  retry/quality patterns. Check current SDK/provider compatibility at implementation.
- Keep typed Zod contracts, compact settings projection and hydration in
  packages/sales with intentional public exports.
- Keep API authentication/orchestration in apps/api/src/schemas and
  apps/api/src/trpc/routers; reuse current catalog queries and access rules.
- Relevant existing entry points:
  packages/sales/src/sales-form/contracts/schemas.ts;
  apps/api/src/schemas/new-sales-form.ts;
  apps/api/src/db/queries/new-sales-form.ts;
  apps/api/src/trpc/routers/new-sales-form.route.ts;
  apps/dashboard/src/components/forms/new-sales-form/.
- UI uses current form composition and shared @gnd/ui primitives. Apply midday,
  vercel-react-best-practices and agency-engineering Frontend Developer guidance
  at implementation.
- Bound generation duration/retries and allow cancellation. Use existing jobs
  infrastructure if multimodal work exceeds the request budget; avoid introducing
  a durable job/state-machine subsystem merely for the small prototype.
- Track minimal run diagnostics: prompt/model/schema/config versions, duration,
  usage and validation issues. Exclude raw customer text/images from ordinary logs.
- Reuse existing private upload/document infrastructure if persistence is needed.
  No new training tables or database migration is required by this design itself.

## Acceptance and Validation
- Clear interior/exterior requests yield allowed type/step/component IDs and the
  same configuration/prices/totals as manual fixtures using identical context.
- English, Spanish, fractions and request photos are exercised. Double units
  versus leaf counts and ambiguous dimensions remain explicit review issues.
- Invented IDs, wrong-step IDs, stale/deleted components and illegal combinations
  cannot become applied valid lines. Test scope isolation and prompt injection.
- Missing customer pricing context, missing prices and required choices are visible;
  no plausible historical/default price is fabricated.
- Large configurations use bounded context without silently excluding candidates.
- Editing while generation runs does not overwrite manual work. Apply, undo,
  save and reopen preserve the hydrated configuration.
- Compare no-example versus synthetic-example prompts on held-out hand-authored
  fixtures; report sample count, field/whole-order match, ambiguity handling,
  correction effort, latency and cost. These fixtures are evaluation, not training.
- Run focused domain/API tests, relevant workspace checks and
  bun run test:new-sales-form-migration; root bun run typecheck for shared changes.
  Browser smoke covers text input, image input, unresolved results and apply/undo.
- Prototype success establishes feasibility; invoice finalization and automatic
  sending remain governed by existing user actions.

## Validation Evidence
- A shared-initializer compatibility test composes the hydrated record through the
  existing New Sales Form save-payload function, validates its meta, line, extra-cost
  and summary structures against the canonical schemas, then rehydrates it through
  the ordinary form loader. Component snapshots, HPT pricing and totals remain
  stable. This is non-persisting backend compatibility evidence; it does not replace
  future UI apply/undo or an authenticated database save smoke test.
- Production snapshot reads now use the shared Redis cache keyed by an access scope
  plus a price-free structural SHA-256 revision. Component title/add/delete,
  configured route flags, defaults, visibility metadata, redirect and step identity
  affect the key; prices, images and unrelated metadata do not. Reads probe before
  and after cache use/build, retry concurrent structural edits, validate cached JSON,
  and serve a fresh database projection when Redis is unavailable. The probe still
  reads scoped structural rows, so this saves projection/serialization work rather
  than eliminating all database reads. Ten query/cache tests cover cache hit,
  structural invalidation, price-only stability, concurrent rebuild and outage.
- The superseded request proposal, selection-plan, AI-specific hydrator and
  door-line hydration modules were removed. The remaining expansion boundary is
  the generic `initializeNewSalesFormSeed`; `default-policy.ts` remains as its safe
  omission-only fallback helper. No legacy stack symbols remain in executable code.
- Current consolidated feature verification passes 98 tests / 268 assertions across
  20 files after removing the two obsolete cache-wrapper tests. Targeted Biome is
  clean across 41 feature files. Cache typecheck is clean; Sales and API typechecks
  report only the unrelated `copy-sales.ts:521` baseline. Settings typecheck reaches
  only pre-existing `packages/errors` NodeNext extension diagnostics.
- Shared `initializeNewSalesFormSeed` now owns seed expansion in the sales-form
  application layer rather than the AI API. It resolves authoritative route/component
  inputs, replays existing scalar/multi-select mutations, applies defaults only to
  omissions, preserves unresolved-step blocks, uses existing profile/tier/HPT and
  record-hydration algorithms, and never accepts a persisted sale base. Six focused
  tests / 23 assertions cover interior, exterior, HPT pricing, selectedComponents
  snapshots, defaults, hidden dependencies, and dynamic redirects. Sales typecheck
  reports only the unrelated `copy-sales.ts:521` baseline error.
- Final focused backend regression passes 142 tests / 340 assertions across 22
  files. Coverage includes the native seed schema and real-example validation,
  scoped configuration, defaults, cache primitives, protected routing, provider
  boundaries, image-byte safety, visibility rules, and mock evaluation. Sales and
  API typechecks both reach only the known unrelated `copy-sales.ts:521` baseline
  nullability error; no feature file appears in diagnostics.
- JSON is the selected canonical prompt/cache format. A deterministic shape
  benchmark built from the local diagnostic sample measured tuple JSON at 27,834
  UTF-8 bytes versus CSV at 37,699 bytes (CSV 1.354x larger). CSV required 631
  typed rows, quote/delimiter handling, and eight embedded JSON cells for nested
  route/visibility rules; semantic round-trip passed. No compatible tokenizer is
  installed, so these are byte/character measurements, not token counts. Ambiguous
  routes were excluded rather than guessed; this is a shape benchmark, not a valid
  full local publication.
- Added a network-off evaluation harness with synthetic English, Spanish and
  ambiguous two-opening cases. The native-seed mock run passes 15/15 expected
  fields, 3/3 whole orders, and records zero unsafe guesses. These scores validate
  harness logic and fixtures only; live-model accuracy/token/cost/latency awaits a
  configured provider key. Image extraction evaluation is deferred.
- The protected preview endpoint returns a strict native NewSalesFormSeed only after
  schema, route, step, component, selection-cardinality and configured-visibility
  validation plus a post-provider revision check. It does not hydrate, price or save
  a sale. The earlier API-specific hydration service was removed after the user
  rejected maintaining a parallel form path; expansion belongs in the shared sales
  form initializer still to be implemented.
  Its input no longer accepts customerProfileId because seed generation does not
  price or hydrate; normal new-form bootstrap owns that context.
- Super Admin-only default persistence is exposed through a protected API mutation.
  The server derives the settings row; clients cannot supply `settingId`. Defaults
  are clearable, merged without discarding unrelated settings metadata, and
  validated against the configured route/step/component. Focused API/default tests
  pass; no UI has been added.
- User requested current-form relevance audit, normalized root step references,
  complete real edit JSON and a streamlined AI-output example. Exported local order
  09645LM via the exact read functions/router enrichments; kept real customer/order
  JSON outside git under `/private/tmp/gnd-sales-example.UBIyMZ`. Created a 551-character
  native AI-seed example from its selections and door facts, not a live
  model result. See `../analysis/2026-09-10-sales-request-form-shape-audit.md` for keep/
  omit findings and why simply opening the UI cannot hydrate all missing prices.
  Removed legacy addonQty/shelfLineItems flags from the model projection only; stored
  settings were not deleted. Numeric root-step lookup normalization is verified by
  14 focused tests / 41 assertions and diagnostic reference checks. Full compact
  edit JSON is 6,315 characters; native AI seed is 551 characters (91.3% reduction
  in characters, not a tokenizer/cost benchmark).
- Combined backend/domain/cache run passes 81 tests / 183 assertions across 18
  files. Removed API defaults override: snapshot defaults now originate in stored
  route metadata. Provider failure/schema errors are sanitized without retaining
  provider causes that may contain customer content. Defaults persistence and real
  API hydration binding remain delegated; efficient all-writer cache invalidation
  is still open and is not represented as complete.
- Re-ran exact local export after terminal marker compatibility fix: settings 3
  now reaches and rejects ambiguous `wUGhI`, confirming the known duplicate identity
  is the current publication blocker. No components were silently merged and no
  local data was changed. Independent backend integration continues.
- Registered protected `salesRequest.generatePreview` behind an off-by-default
  feature flag. Reuses editOrders authorization, server-only settings selection,
  atomic Redis per-user quota with outage failure, and post-provider snapshot
  freshness checks. Text/base64 image transport is strictly validated; no image
  storage/public URLs or sales writes. Twelve focused API tests / 34 assertions
  pass; API typecheck has only existing copy-sales.ts:521. Live endpoint/provider
  acceptance and fully hydrated response remain pending. API docs updated.
- Fixed interior/exterior fixtures now prove canonical tier-pricing/HPT normalization
  parity in addition to shared step-selection mutation parity. The public adapter
  derives leaf count, handing and swing from explicit proposal facts with provenance;
  opening-to-leaf and unsupported dimension conversions remain unresolved. Focused
  projector/contracts/door-hydration/API query run passes 20 tests / 51 assertions.
  These fixed-fixture proofs complete checklist item 2, not full real-model or
  authenticated end-to-end delivery. Defaults persistence is delegated next.
- API snapshot binding now derives model JSON and server selection rules from one
  projection and computes SHA-256 over price-free compact JSON. Four query/snapshot
  tests pass (15 assertions), including default changes affecting payload/revision.
  Added `scripts/export-sales-request-configuration.ts --setting-id=<id>` for exact
  local model JSON through a read-only RepeatableRead transaction. First local run
  exposed Mouldings' final `{uid:""}` route terminator; compatibility fix delegated
  with real query evidence. Full local payload remains unverified until route and
  duplicate-identity validation succeeds; no data repair or write ran.
- Combined focused backend run now passes 55 tests / 123 assertions across 14
  files, including canonical door-line fixtures and the assertion that malformed
  image bytes never reach the provider. This does not establish authenticated
  transport, real-model accuracy, or complete end-to-end draft generation yet.
- Image preprocessing is wired into provider orchestration: JPEG/PNG/WebP decoding,
  actual-format checks, EXIF orientation/metadata stripping, animation rejection,
  three-image cap, 5 MiB per image / 10 MiB total / 20MP limits. Three image tests
  plus four provider tests pass (15 assertions). Sharp pinned to existing lockfile
  version 0.35.3. API typecheck still has only the pre-existing copy-sales.ts:521
  error. Private upload authorization/transport is not yet implemented: shared
  document storage currently offers public URL upload, so it was not reused blindly.
- Prisma query-boundary tests pass: 2 tests / 7 assertions verify explicit settings
  ID, configured step UID filtering, resolved component-family filtering, price-free
  selects, and no component query on ambiguous steps. API typecheck after binding
  still reports only the existing `copy-sales.ts:521` nullability diagnostic.
- Integrated public hydration and scoped loader exports; added Prisma repository
  binding with explicit settings identity, active-row filtering, route-derived step
  queries and component queries restricted to resolved step IDs. No API endpoint
  exposes this query yet. Provider receives a combined caller/45-second abort signal.
  Combined domain/cache/provider suite: 45 tests, 97 assertions pass. Hydration
  tests prove shared selection-mutation parity, not full door pricing parity.
- Redis cache adapter is implemented with scope/revision validation and a 24-hour
  TTL. Durable structural revision publication and orchestration binding remain open.
- Added the server-only Midday AI SDK adapter and strict native-seed validation.
  Two provider-boundary tests / three assertions pass with mocked responses.
  API typecheck reports only pre-existing `packages/sales/src/copy-sales.ts:521`.
  Dependencies pinned to local Midday ai 6.0.141 / @ai-sdk/openai 3.0.48; UI's
  older dependencies remain separately resolved. No live provider call yet.
- Integrated serializer and selection planner through the public package export
  `@gnd/sales/sales-form/request-generation`. Combined focused suite passes
  31 tests / 51 assertions; public Bun import smoke succeeds. Feature status
  documented in `../features/sales-request-generation.md`. Provider/default
  persistence/cache wiring/hydration remain incomplete.
- Identity investigation found no canonical tie-breaker: existing code uses
  unordered settings.findFirst and overwrites duplicate step UIDs. User clarification
  requested for settings 3/4 and step wUGhI (21/41); no data repair performed.
  Explicit-setting scoped loader is being implemented with ambiguity rejection.
- Cache orchestration boundary added with revision-keyed artifacts, scope checks,
  fresh-build fallback on cache outage and revision recheck before return. Its
  two focused tests pass. Structural revision persistence and shared Redis binding
  remain incomplete; this is not yet the full production cache.
- Added versioned provider instruction builder and bounded source schema: text
  or private attachment IDs required, arbitrary image URL fields rejected. The
  server remains responsible for attachment ownership/content checks. Request
  generation tests pass 16 tests / 26 assertions; no provider invocation yet.
- Initial strict AI proposal contracts added; reject money fields and duplicate
  item/step identities while allowing unresolved request facts. Integrated Sol's
  default resolver: combined request-generation suite passes 15 tests / 22 assertions.
  Sol also verified default/shared-engine parity at 26 tests / 40 assertions and
  reported only existing `copy-sales.ts:521` in sales typecheck. Ordered selection
  planning is delegated next; this is not completed hydration or provider integration.
- Component projection now preserves the allowlisted `sectionOverride` flags
  needed by swing/handle configuration while stripping unrelated price fields.
  Six route/projection tests pass with eight assertions. Default/serializer agent
  integration and end-to-end functionality remain pending.
- Price-free component projection added with strict visibility-rule validation:
  malformed variations fail rather than becoming unrestricted candidates, and
  metadata-deleted components are excluded. Combined focused suite passes
  5 tests / 7 assertions. Full structural projection (including overrides and
  route redirects), local-data identity resolution and integration remain open.
- Real local inspection artifact: [configuration sample](../analysis/sales-request-local-configuration-sample.json).
  Two active settings records (3 and 4) each reference nine routes. Queries restrict
  component families to those route sequences and root components to route keys.
  Root step `MtJgR` resolves to Item Type, with Interior pre-hung `KmUMM` and
  Exterior `r6lf5`. Raw matching step rows total 21 and component rows 591 per
  setting; this is inspection evidence, not a validated full model payload.
- Luna Max is implementing the deterministic compact serializer; Sol High is
  implementing the eligible-default resolver. Their focused tests and integration
  remain pending. No UI changes or database writes have been made by this task.
- Configured-route boundary tests pass: 3 tests / 4 assertions. Coverage includes
  excluding stale route-map steps, nested settings compatibility, and rejecting
  duplicate step UID resolution. Duplicate identity investigation delegated to
  Luna Max; no canonical mapping assumed yet.
- Backend implementation started with `configured-routes.ts` and a local-only
  read-only inspection script. The settings-derived query returned 591 component
  rows per inspected setting, with no missing referenced step UID. This is a raw
  scoped inspection, not the final AI payload: component metadata includes show,
  deleted, variations, stepSequence, sectionOverride and custom.
- Local data has duplicate step UID `wUGhI` (step 21 Height and step 41 Door Type).
  Resolve canonical routing identity before publishing an AI snapshot; do not
  silently merge both step families or arbitrarily choose one. Full exporter,
  defaults/cache/creator tests and AI functionality remain incomplete.
- Local settings inspection succeeded through the local environment runner after
  sandbox escalation. MySQL is running on 127.0.0.1:3307; no database writes ran.
  Settings contain routeSequence and separate externalRouteSequence, so component
  loading must derive active step UIDs before querying DykeStepProducts.
- 2026-09-10: Ticket revised to the user's configuration-driven prototype approach.
- Application implementation and hydration proof have not started.

## Brain Documentation Impact
This ticket and its backlog pointer describe planned work. At implementation,
document actual behavior and contracts in feature/API docs; update database docs
only if persistence changes are introduced. Keep one status-ledger pointer.
