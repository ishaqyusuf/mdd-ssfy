# Fix Plan: Shelf Deep Search Partial Dimensions

## Status
Done

## Implementation Result
- Standalone hyphenated measurements now compile as neutral partial-
  measurement constraints instead of fraction-only prefixes.
- A partial measurement matches either exact side of a compiled dimension or
  the prefix of a mixed fraction, while unrelated independent digits remain
  invalid.
- Structured API candidate anchors now cover hyphenated, spaced, straight-
  quote, and supported curly-quote dimension-side storage forms.
- The exact `Carrara hc 5-0` fixture, spaced `5 0X6 8` storage, height-side
  matching, near-size negatives, fraction preservation, shared V1/V2 authority,
  and the existing 1,000-collision recall case are covered.
- Validation passes 46 focused tests / 228 assertions across the shared search
  domain, Shelf picker parity, and new-sales-form API query suite.

## Objective
Make Shelf product deep search match a product such as
`BFLD, 4DR 5-0X6-8 HC Carrara SM, Carton Pack` when an operator searches
`Carrara hc 5-0`, without weakening full-dimension matching or allowing
unrelated numeric collisions.

## Confirmed Root Cause
- Lexical matching is working: `Carrara hc` returns the product.
- Full structured matching is working: `Carrara hc 5-0 x 6-8` returns it.
- `extractSearchMeasurements()` currently parses a standalone `5-0` query as
  `fraction-prefix:5-0`.
- The product title parser consumes `5-0X6-8` as
  `dimension:5-0x6-8`, so `measurementMatches()` sees no compatible fraction
  and rejects the row before lexical scoring.
- The server fallback uses the same final matcher. Its structured SQL candidate
  anchors include `5-0` and `5 0/`, but not all width/height-side variants used
  by titles with spaces or quote marks.

## Recommended Search Contract
A standalone hyphenated measurement such as `5-0` is an ambiguous partial
measurement. It may satisfy either:

1. an exact dimension side, such as the width in `5-0X6-8` or the height in
   `3-0X5-0`; or
2. a mixed-fraction prefix, such as `5-0/...` if that form exists.

It must not be satisfied by unrelated `5` and `0` digits elsewhere in a title.
Full dimensions remain exact: `5-0 x 6-8` must not match `5-0 x 6-7`.

## Detailed Execution Plan

### Phase 1: Freeze the partial-measurement contract
1. Add the reported fixture to
   `packages/sales/src/sales-form/domain/shelf-product-search.test.ts`.
2. Add positive cases:
   - `Carrara hc 5-0` matches `...5-0X6-8...`;
   - `Carrara hc 6-8` matches the height side;
   - a partial side matches common full-dimension storage variants already
     supported by the parser;
   - `4-9` continues to match `4-9/16`.
3. Add negative cases:
   - `Carrara hc 5-1` does not match `5-0X6-8`;
   - `Carrara hc 6-7` does not match its `6-8` height;
   - `Carrara HC 5 SERIES 0 GAUGE` does not satisfy structured `5-0`;
   - a full query `5-0 x 6-8` still rejects near dimensions.
4. Add ranking coverage proving a full exact dimension outranks a result that
   only satisfies an ambiguous partial side when both are candidates.

Decision gate: support the reported hyphenated partial form in this patch.
Do not silently treat arbitrary plain digit pairs such as `5 0` as partial
dimensions until operators confirm that grammar; it has a much higher numeric
collision risk.

### Phase 2: Represent standalone hyphen pairs honestly
1. In
   `packages/sales/src/sales-form/domain/shelf-product-search.ts`, rename the
   query-only internal measurement from `fraction-prefix:` to a neutral form
   such as `hyphen-prefix:` or `partial-measurement:`.
2. Keep compiled product measurements authoritative and structured as full
   `dimension:` and `fraction:` values.
3. Add a small helper that extracts exact dimension sides from compiled values:
   - `dimension:5-0x6-8` -> `5-0`, `6-8`;
   - `dimension:3x8` -> `3`, `8` only when the query grammar produces a
     compatible structured token.
4. Change `measurementMatches()` so a partial measurement succeeds when:
   - a compiled fraction equals or begins with that mixed-number prefix; or
   - either compiled dimension side equals the query value.
5. Keep partial matches penalized by one ranking point. Do not promote a
   partial side to the same confidence as an exact full dimension.
6. Preserve the existing AND behavior across search groups: `Carrara`, `hc`,
   and the partial size must all match their title/category/measurement fields.

Validation gate: all existing deep-search tests must remain unchanged and pass;
the new test must fail before this phase and pass after it.

### Phase 3: Preserve API fallback recall
1. Update `shelfProductSearchCandidateTitleAnchorGroups()` for an ambiguous
   partial measurement to emit bounded, context-aware anchors for both meanings:
   - fraction forms such as `5-0` and `5 0/`;
   - width-side dimension forms such as `5-0x`, `5-0 x`, `5 0x`, and `5 0 x`;
   - height-side forms such as `x5-0`, `x 5-0`, `x5 0`, and `x 5 0`.
2. Include quote-mark variants only if the existing dimension parser accepts
   them as the same side representation. Keep anchor generation centralized
   beside measurement parsing.
3. Do not use independent numeric `contains 5` / `contains 0` clauses as the
   structured authority. They may remain coarse recall inputs, but the shared
   in-memory matcher must make the final decision.
4. Add an API query test in
   `apps/api/src/db/queries/new-sales-form.test.ts` using the exact Carrara
   fixture and `Carrara hc 5-0`.
5. Add a spaced-format API fixture such as `5 0X6 8` so the new structured
   candidate stage proves it can retrieve the product before final ranking.
6. Retain the existing visibility filter, selected hydration, 250 structured
   candidate cap, 601-row merged cap, and category enrichment unchanged.

Validation gate: the typed API fallback must return the same ordered ids as the
compiled client index for the partial-dimension fixture and collision set.

### Phase 4: Verify every consuming surface without UI forks
1. Confirm Shelf V2 dashboard/dealership uses the fixed compiled matcher through
   `sales-form-workflow-panel.tsx`; no component change should be required.
2. Confirm Shelf V1 continues using the same matcher through
   `shelf-inputs.tsx`.
3. Confirm mobile/non-index consumers receive the fixed server fallback.
4. Add or extend source/parity coverage showing all three paths import the same
   search authority rather than introducing local special cases.
5. Keep the input, deferred computation, bounded dropdown scrolling, selected
   hydration, category subtitles, and product-edit cache invalidation unchanged.

### Phase 5: Focused validation and rollout
1. Run focused domain tests for the matcher and anchor generator.
2. Run the focused new-sales-form API query tests, including the 1,000 numeric
   collision recall case.
3. Run Shelf V1/V2 source and UI regressions.
4. Run the Sales package typecheck plus the narrowest API typecheck covering the
   changed query helper; run scoped Biome and `git diff --check`.
5. Perform authenticated browser QA with these queries:
   - `Carrara hc 5-0`;
   - `Carrara hc 6-8`;
   - `Carrara hc 5-0 x 6-8`;
   - `Carrara hc 5-1` as a negative case;
   - `frame door 4-9 3 0 x 8 0` as the original regression guard.
6. Confirm the intended Carrara item appears, remains selectable, shows the
   correct category tree and pricing, and generates no request per keystroke in
   the cached web path.
7. Record result count and client search timing against the existing synthetic
   5,000-product benchmark. This change should remain a no-migration patch.

## Expected Files
- `packages/sales/src/sales-form/domain/shelf-product-search.ts`
- `packages/sales/src/sales-form/domain/shelf-product-search.test.ts`
- `apps/api/src/db/queries/new-sales-form.test.ts`
- `packages/sales/src/sales-form/ui/workflow/shelf-inputs.test.ts` only if a
  cross-surface regression is missing
- `.brain/features/sales-form-system-hardening.md`
- `.brain/progress.md`

## Risks And Mitigations
- **False positives from numeric fragments:** require an exact structured side
  match; never satisfy `5-0` with independent digits.
- **Fraction regression:** keep the existing fraction-prefix path as one branch
  of the ambiguous constraint and retain `4-9`/`4-9/16` tests.
- **API/client divergence:** use the shared matcher for final ranking and add
  ordered-id parity fixtures.
- **Candidate under-recall for spaced titles:** add dimension-context anchors
  and a spaced storage fixture before changing candidate caps.
- **Ranking churn:** assign partial measurements a fixed penalty and preserve
  all existing tier/tie-break rules.
- **Overengineering:** do not add fuzzy matching, a database column, full-text
  search, or a new UI search implementation for this fix.
