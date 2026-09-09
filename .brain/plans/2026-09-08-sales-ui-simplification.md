# Sales UI simplification

Status: Complete. User authorized all seven areas and Brain maintenance.

## Execution contract

Follow Midday invoice details/actions: concise primary facts, grouped actions,
and supporting information on demand. Reuse existing GND sections, menu,
collapsible and progress primitives. No new routes, stores, queries, schema,
permission rules, completion commands or workspace eligibility changes are needed.
The Completed display filter groups the two completion codes.
The existing sheet/controller, URL state, forms, filters, pagination, bulk
actions and invalidation remain their respective owners; rebuilding them is
omitted because this is a presentation simplification.

- [x] Operations: two rows only; each completed stage shows Completed/100% green.
- [x] Financial summary: Total/Paid/Balance due once; expandable breakdown,
  explicit payable amount when fees differ, existing payment entry preserved.
- [x] Special Order: compact disclosure for applicable orders; preserve
  classification access in Order actions when the summary is hidden.
- [x] More menu: Send, Print, Order actions, admin Troubleshooting groups.
- [x] Material review: concise issue/action, supporting evidence/history on demand.
- [x] Page copy: remove implementation descriptions and obvious metric subtitles.
- [x] Shared operational status vocabulary: Completed/green for both completion
  paths; retain stored states and audit provenance, stage independence.
- [x] Focused regression tests, UI verification, typecheck and conformance audit.
- [x] Update feature/API presentation docs, ADR and progress with evidence.

## Acceptance

Verify completed/partial/mixed stages, zero quantities, quotes, ordinary and
Special Orders, partial/paid/refunded/card-fee invoices, menu actions and
permission visibility, material-review read-only/error/history states. Confirm
no changes to business quantities, stored codes or audit events. UI check on
the existing local app, including desktop/mobile and order 09596PC if available.

## References

Compared Midday invoice-details.tsx and GND General V2 view model, operations,
financial composer/rail, Special Order controls, sales menu and Production V2.
Additional relevant Midday menu/sheet patterns are inspected during execution.

## Checkpoint

Implemented all seven presentation slices. General V2's duplicate footer menu
is retired; its Delete/Copy/Move and quote actions remain in the sticky action
bar. Special Order classification is available in Order actions. Completed
orders also display non-required stages as complete; required unfinished stages
remain independent. Materialized list reads refresh label/tone from canonical
metadata without rewriting stored evidence.

Focused initial matrix: 84 tests/271 assertions pass. Follow-up API projection
and view model matrix: 42 tests/119 assertions pass. Browser on 09596PC confirms
both 100% emerald bars, compact Special Order row, fee-aware invoice summary,
grouped menus and working Special Order dialog. Full root typecheck stopped at
existing packages/errors NodeNext extension errors via settings; dashboard's
first check exhausted default Node heap, retry with 6GB in progress. Final
render/regression, responsive checks and conformance audit remain.

## Final validation and conformance

- 176 tests / 590 Bun assertions pass across 15 focused Sales/API/Dashboard
  files; four financial render tests / 20 assertions pass separately (180 total).
- Sales and API typechecks pass. Root typecheck stops on existing NodeNext
  extension diagnostics in packages/errors via settings. Dashboard with 6GB
  heap completes with its repository-wide baseline (1,540 diagnostics); changed
  runtime paths have no reported diagnostics. Existing test matcher declarations
  and unrelated customer/address and sales-form errors remain outside this task.
- Local browser: 09596PC shows two full emerald bars with zero remaining
  indicator translation; 390x844 and desktop verified. Mobile sheet width and
  scroll width both 390; sticky actions and Pay stay accessible while scrolling.
- Invoice breakdown opens/closes; fee-inclusive due stays visible. Special Order
  disclosure/management works. 09601PC omits the summary row but Order actions
  still exposes enrollment; no enrollment, message or payment was submitted.
- 09502PC shows collapsed material attention, opens the review queue/detail,
  and displays one concise stale/conflict notice with expandable raw evidence.
  Decision controls and read-only inbound needs remain; no review was submitted.
- Ordinary sales metric subtitles disappear after reload. Calendar render tests
  and shared label/filter tests verify completion parity; audit code untouched.
- Browser logged existing development server EPIPE diagnostics during reload;
  tested screens loaded and interactions completed. No proxy restart or change.
- Conformance: Midday invoice summary/detail and grouped action patterns reused;
  GND section/controller, tab loading, query invalidation, URL state and existing
  forms retained. Route/table/API redesign omitted as unrelated. Removing the
  duplicate V2 footer and retaining its actions in the sticky bar is intentional.
- Brain feature/API docs and decision record updated. No deployment, schema,
  secrets, operational data or completion audit mutation.
