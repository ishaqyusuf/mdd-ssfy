# Task: Capture customer requests and build example-guided sales generation

## Status
Backlog

## Priority
Medium

## Created Date
2026-09-09

## Last Updated
2026-09-09

## Source Context
The user requested an implementation ticket after agreeing on this workflow:
sales representatives paste the customer's email into the sales form, configure
the sale manually, and save the request with the configured order. After enough
verified examples exist, AI retrieves relevant past request/configuration pairs
and proposes a new sales configuration. Initial delivery is data collection;
generation follows measured evaluation. This ticket is canonical in Brain.

## Related Feature
Sales form / customer request capture / assisted order generation

## Implementation Progress
- Completion: 0%
- Current Checklist: 1/10 — Define request and example contracts
- Blockers: None for request capture. AI release depends on representative data and evaluation.

## Product Contract
- First release targets the Dashboard new sales form for quotes and orders.
  Keep shared contracts compatible with Dealership and Mobile; adding their
  request UI is a later scope extension.
- Add an optional collapsible `Customer Request` textarea with helper text:
  `Paste the customer's request, then configure the order as usual.`
- Preserve original Unicode, line breaks, fractions, and Spanish text. Enforce
  a shared 50,000-character limit with visible validation; never silently truncate.
- Save/load through the current form persistence flow, including recovery and
  any enabled autosave. Existing records and clients may omit the field.
  Omitted means preserve existing text; explicit null means clear it.
- Capture requires no AI key, external request, embedding service, or email connection.
- The source text stays internal: exclude it from customer PDFs, emails,
  storefront/dealer responses, broad list payloads, and routine logs.
- Copying a sale clears request/example identities and source text by default.
  Quote-to-order conversion preserves provenance, but must not create duplicate
  eligible examples for the same source/configuration pair.

## Data and Lifecycle Contract
Use additive Prisma models compatible with the existing MySQL database.
Names below are proposed; reuse equivalent existing persistence where suitable.

`SalesRequest`: sale relation, raw text, content hash, source type (`pasted_email`
or `manual_text`), revision, author and timestamps. Derive sale/customer access
from existing server authorization. Never trust client-supplied ownership IDs.

`SalesRequestExample`: request revision, sale revision, schema version, immutable
request text snapshot, immutable canonical configuration JSON, configuration
hash, creator, timestamp, eligibility status and exclusion reason. A unique
request-revision/sale-revision/schema-version identity makes retrying idempotent.
Record product/step IDs alongside human-readable labels and resolved options;
include quantities, units, dimensions, handing, swing, groups, location and
configuration details. Preserve referenced catalog facts without assuming a
global catalog-version mechanism exists. Minimize unrelated customer/payment data.

- Persist source changes atomically with the sale. A failed save cannot leave
  a request attached to a different or uncommitted configuration.
- On successful explicit final form save, capture the committed configuration
  and exact source revision atomically, or reuse an existing immutable history
  revision with durable processing intent. Do not let a delayed worker snapshot
  a newer live sale. Form final save is not fulfillment completion or approval.
- Drafts can retain text but are not eligible examples. New examples start
  `pending_review`; an authorized sales editor explicitly confirms that the saved
  configuration matches the source before it becomes `approved`.
- Source/configuration corrections supersede old eligible examples and require
  reapproval. Cancelled, deleted, test, incomplete, and superseded records are
  excluded. Ordinary workspace archiving alone is not evidence of a bad example.
- Preserve an optional rep clarification note for details supplied by phone or
  follow-up. Future generation must not infer those facts from an incomplete email.
- Clearing source text disables its examples; deletion/retention handling must
  also reach snapshots and future search indexes. Immutability does not bypass deletion.

## Implementation Checklist
- [ ] 1. Define request and versioned snapshot schemas, omission/clear behavior, eligibility transitions, and package-owned snapshot projection.
- [ ] 2. Add additive persistence, relations, indexes, idempotency identities, and local migration; run repository-required `bun run db:migrate`, `bun run db:push`, and client generation against the verified local target. Record drift blockers without resetting data.
- [ ] 3. Extend canonical sales load/save contracts and transactions; cover rollback, stale versions, retries, quote conversion, copies, old clients, and exact-revision snapshot capture.
- [ ] 4. Add Dashboard request input, save/reopen/recovery behavior, clarification note, and scoped example review/exclusion control using existing shared form/UI primitives.
- [ ] 5. Validate and release request capture independently; update feature, API, database and task documentation. This is the first build/release milestone.
- [ ] 6. Add resumable background preparation: normalized text, language/category metadata, embeddings and bounded line-example extraction, with revision checks, attempt records and index invalidation.
- [ ] 7. Build offline evaluation and hybrid retrieval, choose storage against actual database capabilities, and record measured retrieval quality/cost before choosing generation defaults.
- [ ] 8. Implement Midday-style Vercel AI structured intent generation and the current-catalog resolver; retain source evidence, unresolved fields, run metadata and retrieved example IDs.
- [ ] 9. Add reviewed generation preview/apply/undo to the sales form and capture AI proposal versus rep corrections. Use the existing canonical save and invoice preview paths.
- [ ] 10. Pass the AI pilot release gates, document operations and rollback, and update Brain completion evidence. Do not mark the whole ticket complete after capture alone.

## Later AI Implementation Requirements
- Durable jobs own cleaning/indexing and long provider work. Save only IDs and
  revisions in job payloads; persist retryable intent so queue failures lose no work.
- Retrieve only approved, currently eligible examples within the caller's actual
  authorized business/dealer boundary. GND tenancy migration is separate work;
  do not assume a tenantId column or invent tenancy from customer identity.
- Use lexical plus semantic matching, category filters and optional customer
  preference. Rerank a bounded candidate set; begin with 3–5 diverse examples
  within a token budget and tune using evaluation. Near-identical copied orders
  must not crowd out relevant examples.
- Begin with order-level examples. Add line-level examples only when source-to-line
  alignment is reliable; do not invent exact mappings from ambiguous paragraphs.
- GND currently uses MySQL (`packages/db/src/schema/schema.prisma`). Do not add
  pgvector or migrate the primary database as a prerequisite for this feature.
  Choose a compatible search adapter during step 7; an external index, if used,
  is rebuildable and never authoritative. Defer embedding dependency/storage cost
  until indexing is needed.
- Follow Midday's `generateText` + `Output.object` + Zod pattern for intent;
  inspect current SDK/provider compatibility before dependencies are added.
  Use bounded retries/timeouts and provider-supported generation settings.
- Treat customer text and retrieved examples as data, never instructions.
  Retrieve sanitized configuration examples, excluding unrelated personal data
  and historical prices/discounts from model context.
- AI returns requested attributes, quantities/units, source evidence, missing
  fields and contradictions. Server code resolves active catalog IDs, validates
  combinations and calculates current prices using existing GND domain logic.
- Missing dimensions or conflicting quantities remain review items. An AI
  confidence score alone cannot approve a configuration.
- Preview changes before applying to an edited form; reject stale form revisions,
  preserve manual changes, and allow undo. Persist model/prompt/schema versions,
  retrieved example revisions, latency, token/cost metrics and final corrections.
- Reuse existing invoice generation after a normal validated save. Automatic
  invoice finalization/sending, mailbox ingestion, OCR and fine-tuning are follow-ups.

## Acceptance and Validation
Capture milestone must demonstrate:
1. Paste, save, reopen, edit, clear and recover text on new/existing quotes/orders;
   Unicode, maximum-size and empty values behave consistently.
2. Missing field from an older client preserves source text. Copy clears it.
   Quote conversion preserves provenance without duplicate learning eligibility.
3. Failed or stale saves create no mismatched example; retrying a committed save
   creates no duplicates. Snapshots preserve the exact original revision.
4. Approval, correction, cancellation, deletion and reapproval produce the defined
   eligibility transitions. Unauthorized reads/writes/reviews fail.
5. Existing pricing, totals, stock/payment effects and invoice content are unchanged;
   no provider work is introduced into the capture save path.
6. Focused persistence/domain/API tests and authenticated Dashboard browser smoke
   pass; run `bun run test:new-sales-form-migration`, relevant workspace checks,
   and root `bun run typecheck` for shared changes. Report unrelated baseline failures.

AI pilot gates:
- Split evaluation by source/project/time so copied or revised examples cannot
  leak between retrieval/training material and the held-out set.
- Include door singles/doubles, HPT, bifolds, moulding units, English/Spanish,
  missing dimensions, conflicting quantities and obsolete catalog references.
- Compare schema-only generation against retrieval-assisted generation. Report
  field accuracy, complete-order accuracy, unsupported guesses, ambiguity recall,
  rep correction rate, time saved, p50/p95 latency and cost per request.
- Proposed launch targets: 100% schema-valid applied proposals, zero unauthorized
  retrievals or invalid catalog/pricing applications in the evaluation suite,
  all deliberately contradictory fixtures flagged, and at least 30% lower median
  rep entry time in the reviewed pilot. Report sample sizes and failures; no fixed
  historical-order count alone authorizes release. Broader automatic acceptance
  requires separately agreed measured thresholds.

## Code Entry Points and Midday References
- `packages/db/src/schema/sales.prisma` and `schema.prisma`: existing Prisma boundary.
- `packages/sales/src/sales-form/contracts/schemas.ts`: shared contracts; add reusable request/snapshot logic under the sales domain and intentional public exports.
- `apps/api/src/schemas/new-sales-form.ts`: validated API contracts.
- `apps/api/src/trpc/routers/new-sales-form.route.ts`: thin authenticated orchestration.
- `apps/api/src/db/queries/new-sales-form.ts`: canonical load, draft/final save, version checks and post-save work; inspect existing immutable history before adding duplicate machinery.
- `apps/dashboard/src/components/forms/new-sales-form/`: input, store, mapper and recovery integration; use existing shared form composition.
- `packages/jobs/src/tasks/`: later asynchronous preparation/generation.
- Midday root: `/Users/M1PRO/Documents/code/_kitchen_sink/midday`.
  Inspect `apps/api/src/chat/utils.ts` for structured output and
  `packages/documents/src/processors/base-extraction-engine.ts` for extraction
  retries/quality orchestration. These use different SDK APIs today; copy the
  appropriate pattern deliberately rather than assuming uniform versions.
- Apply `midday`, `vercel-react-best-practices`, and `agency-engineering` with
  its Frontend Developer guidance when implementing the Dashboard changes.
  Retain GND's Prisma/MySQL and `@gnd/*` boundaries while following Midday layering.

## Brain Documentation Impact at Implementation
Update `../features/sales-form-system-hardening.md` or a dedicated request feature
document, `../api/contracts.md`, `../api/permissions.md`, and the database schema,
relationships and migrations documents. Add an ADR when the durable snapshot /
retrieval architecture is implemented. Move this task's single ledger pointer
as its status changes and record milestone evidence here.

## Validation Evidence
- Ticket grounded in current GND schema, sales save/version entry points, Brain
  contracts and local Midday structured-output code on 2026-09-09.
- Implementation has not started. No application tests or database commands run.
