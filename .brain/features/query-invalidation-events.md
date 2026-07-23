# Query Invalidation Events

## Status

Implemented on 2026-07-17 for the main WWW application.

## Purpose

Keep TanStack Query data fresh after successful application actions without requiring every mutation component to remember every related tRPC query key.

## Architecture

The WWW app has one client-side query-event runtime under `apps/www/src/lib/query-events/`:

- `types.ts` derives valid query, infinite-query, and mutation route strings from the `useTRPC()` proxy. Registry typos therefore fail TypeScript validation.
- `registry.ts` owns domain event-to-query-target definitions and typed tRPC mutation route-to-event mappings.
- `mutation-trigger.ts` resolves automatic route events plus optional `meta.queryEvents` after a mutation succeeds. It receives mutation result data, variables, and optional `meta.queryEventScope`.
- `transport.ts` delivers event name and serializable scope in the initiating tab and through `BroadcastChannel` to other open GND tabs in the same browser. Duplicate event names in one batch merge and deduplicate their sale references.
- `executor.ts` turns registered targets into tRPC `pathKey`, `queryKey`, or `infiniteQueryKey` values, deduplicates query keys, and invalidates active queries while leaving inactive queries stale for their next mount. Sales Overview uses an exact typed `queryKey({ orderNo, salesType })` when scope is known and the route path only as a compatibility fallback.
- `runtime.tsx` installs one listener below the app's QueryClient and tRPC providers.
- `apps/www/src/trpc/context.ts` owns the shared tRPC React context so the runtime does not create a circular dependency with the provider module.

`apps/www/src/trpc/query-client.ts` is the central success boundary. Its global `MutationCache.onSuccess` invokes and awaits `triggerMutationQueryEvents()` after successful browser mutations, so active local refetches finish before mutation completion reaches component success handlers. Toast behavior is independent and cannot prevent invalidation.

## Event Catalog

The initial catalog contains:

- Sales: order, quote, payment, production, and dispatch changes.
- Inventory: catalog, stock, inbound, allocation, and fulfillment changes.
- Jobs: job and contractor-payment changes.
- HRM: employee changes.
- Customers: customer profile and address changes.
- Shared navigation: page-tab changes.

The route registry maps 78 high-impact mutations across dispatch, inventory,
sales, customers, office/online payment processing, contractor jobs, HRM
employees, the new sales form, and page tabs.

## Calling Contract

Prefer an automatic route mapping when every success from a tRPC mutation has the same cache effect:

```ts
export const MUTATION_QUERY_EVENTS = {
	"sales.updatePriority": ["sales.order.changed"],
} as const satisfies Partial<
	Record<MutationRoute, readonly QueryEventName[]>
>;
```

Use mutation metadata for a local exception or a mutation whose effect depends on the call site:

```ts
trpc.someRouter.someMutation.mutationOptions({
	meta: {
		queryEvents: ["sales.order.changed"],
	},
});
```

`meta.queryEvents: false` opts a mutation out of its automatic route mapping. Explicit events are merged with route events and deduplicated.

Use `meta.queryEventScope` when the mutation result cannot carry the affected entity reference but the call site already knows it:

```ts
trpc.dispatch.submitDispatch.mutationOptions({
	meta: {
		queryEventScope: {
			sales: [{ salesId, orderNo, salesType: "order" }],
		},
	},
});
```

Use the domain event API for non-mutation actions or compatibility helpers:

```ts
const queryEvents = useQueryEvents();
await queryEvents.emit("sales.payment.changed", {
	sales: [{ salesId, orderNo, salesType: "order" }],
});
```

Use `useTypedQueryInvalidation()` only for a genuine one-off query refresh that should not become a domain event:

```ts
const invalidate = useTypedQueryInvalidation();
await invalidate.path("sales.productionOverview");
```

## Reliability Rules

- Events fire only after mutation success; failed mutations do not invalidate.
- Query-event failures are logged and do not turn a committed mutation into a client-visible mutation failure.
- Every emission receives a unique id. The transport suppresses duplicate delivery of the same envelope but does not collapse separate same-name events.
- Query keys are deduplicated inside one event execution.
- tRPC route traversal must use property access. The live tRPC options client is a
  JavaScript Proxy and does not support route-existence checks with the `in`
  operator.
- Exact entity scope is preferred for detail queries; aggregate query families remain broad by design.
- If any producer cannot supply scope, detail invalidation falls back to the route path so correctness is preserved.
- Event names describe committed domain facts, not UI components.
- `@gnd/events` remains the analytics event package; query invalidation events are intentionally local to WWW.

## Scope And Limitations

The current transport refreshes the initiating tab and other open GND tabs in the same browser profile. It does not synchronize other browsers/devices and does not observe database changes made by background jobs or external systems. The event envelope and subscriber boundary are transport-ready; a future authenticated server realtime adapter can feed the same runtime without changing the event registry or executor.

## Scoped Sales Coverage

- Manual payment review returns the reviewed payment's order reference and emits a scoped `sales.payment.changed`.
- Office/customer portal `applyPayment` returns and uses its `appliedSales` result; a terminal session that has not applied payment emits no sales event, while the completed terminal response retains its scoped event.
- Public online checkout verification returns `appliedSales` after `COMPLETED` settlement and emits no event while `PENDING`.
- Inventory dispatch assign/pack/fulfill/release, partial shipment, and fulfillment-hold responses attach the affected sale reference.
- New-form draft autosaves and final saves derive the order/quote event family from the returned document type. Legacy sales saves, priority/payment-method edits, sales-rep transfer, copy/move, production events, fulfillment task intents, and dispatch helpers carry sale scope when available. Move scope includes both the deleted source and created target sale.
- Production events refresh the current worker task/filter queues, legacy/v2 production lists, dashboards, overview, Sales Orders aggregates, and the exact affected Sales Overview. Fulfillment task completion uses the fulfillment event family, which also owns inventory, dispatch, packing, and production query families.
- Payment events still path-invalidate Sales Orders lists/summaries, dashboards, accounting reads, filters, and page tabs. Only Sales Overview detail invalidation is narrowed.

## Customer Coverage

- `customers.createCustomer` and `customers.createCustomerAddress` map to
  `customer.changed`.
- The event refreshes customer search, directory, overview, filter, and
  new-sales-form customer-resolution queries.
- Customer information is projected into many sales. Until customer mutations
  carry every affected sale reference, the event intentionally path-invalidates
  Sales Overview details so all visible customer projections refresh.

### Live Proxy Regression Fix

On 2026-07-23, the executor was corrected after customer edits exposed that its
route guard used the `in` operator. Plain-object test doubles accepted that
lookup, but the real tRPC options Proxy reports dynamic routes as absent, so
event execution stopped before invalidating any query. The executor now traverses
the typed route through property access, and focused coverage executes
`customer.changed` against a real `createTRPCOptionsProxy` instance. Mutation
completion also awaits local event listeners so the customer editor cannot close
ahead of the active Sales Overview refetch.

## Extension Checklist

When adding a mutation:

1. Decide which domain fact changed.
2. Reuse an existing event or add one event with the complete dependent query family.
3. Add the typed mutation route mapping when the effect is universal; otherwise add `meta.queryEvents` at the call site.
4. Add or update registry tests.
5. Include the affected entity reference in mutation output or `meta.queryEventScope` for detail precision.
6. Remove redundant component-local `invalidateQueries()` calls after behavior is covered.

Do not add raw string query keys, broad `queryClient.clear()`, or whole-cache invalidation.

## Validation

- Focused query-event, sales facade, task-effect, stats-reset, payment-response, payment-review, inventory-route, and payment-review-domain suite: 57 tests / 182 assertions passed.
- Checkout query coverage: 4 tests / 18 assertions passed with the required test encryption key.
- Focused Biome check: passed for all new runtime files and touched query-client/facade/metadata files.
- Filtered `@gnd/www` TypeScript pass: no diagnostics in the query-event runtime, provider wiring, mutation client, metadata declaration, tests, or sales facade. The broad app typecheck remains blocked by unrelated existing repository errors.
- No visual/browser QA was required because this change adds no visual surface; behavior is exercised at the cache/event boundary.

### Sales Payment Review Follow-up

On 2026-07-18, the Sales Orders `markLatestPaymentReviewed` action was moved fully behind its automatic `sales.payment.changed` mutation-route event. The row component no longer repeats local Sales Orders or page-tab invalidation. The event refreshes the orders list, order summaries, payment/accounting reads, payment dashboards, and Sales Orders saved-page-tab list/default/count data. The row action label is `Reviewed`.

- Focused query-event, page-tab, sales facade, and payment-review suite: 27 tests / 56 assertions passed.
- The executor regression test verifies `sales.payment.changed` invalidates `sales.getOrders`, `sales.getOrdersSummary`, and `pageTabs.list`.
- Focused Biome and scoped `git diff --check` passed.
- Filtered `@gnd/www` TypeScript output contained no diagnostics for the touched payment-review/query-event files; the broad app typecheck remains blocked by unrelated existing repository errors.
- Static UI coverage confirms both row and batch payment-review actions use `Reviewed`. The user requested that browser mutation testing be skipped, so no payment record was changed during validation.

### Batch Sales Payment Review Follow-up

On 2026-07-22, multi-order payment review moved from parallel calls to `sales.markLatestPaymentReviewed` onto the dedicated `sales.markPaymentsReviewed` mutation. The batch call opts out of its automatic mutation event so the caller can await one coalesced `sales.payment.changed` event containing all successfully reviewed order references. This creates a deterministic completion boundary: active Sales Orders, summary, accounting, overview, and page-tab queries finish invalidating before the selection is cleared and the menu closes. Zero-success batches do not emit a change event.

- The mutation route remains registered to `sales.payment.changed` for any future ordinary caller that does not opt into the batch's explicit awaited event.
- Focused payment-domain, query-event, and Sales Orders review coverage passed with 38 tests / 81 assertions.
- Authorized local browser QA proved one UI batch action reviewed two selected payments together. The local Next runtime became unresponsive immediately afterward, so same-page DOM evidence was not captured; exact payment fields and temporary auth records were restored. The orchestration regression test verifies the awaited event completes before selection/menu cleanup, which is the behavior that removes the manual-refresh race.
- Dedicated orchestration coverage proves one batch request, one scoped invalidation, that the operation remains pending until invalidation completes, and that selection/menu callbacks happen afterward.
