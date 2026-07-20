# Storefront E-commerce Replacement Audit

## Purpose

Review the current `apps/site` storefront and its supporting API, sales,
inventory, customer, payment, and admin surfaces; identify what is production
ready, what is prototype-only, and what must be added for it to replace
`gndmillwork.com` as a standard e-commerce business.

## Target Outcome

GND customers can browse published final-product offers, configure them through
a simplified projection of the same Dyke sales steps used by office sales, keep
a cart, complete secure checkout, and obtain reliable order, payment,
fulfillment, delivery, and document information. Authorized staff manage the
shared sales configuration, inventory, shelf items, customers, and orders from
their existing workspaces, with Super Admin-granted storefront visibility and
operational permissions.

## Executive Assessment

The current storefront is a useful visual and data-access prototype, but it is
not production-ready and must not replace `gndmillwork.com` in its current
state.

The strongest reusable foundations are:

- the Next.js `apps/site` route shell and shared UI package;
- the inventory/category/variant/image models;
- the internal inventory product editor and publish status controls;
- the existing `SalesOrders`, customer, address, payment, inventory,
  production, dispatch, documents, notifications, email, and Square domains;
- the shared `@gnd/sales` workflow panel, route engine, mutation engine,
  door/HPT, moulding, shelf-item, pricing, grouping, and save contracts already
  used to move office and mobile/dealer sales toward parity;
- the Dyke `sales-settings` route graph and inventory-to-Dyke compatibility
  mappings;
- real storefront product/category reads and the beginning of a database cart;
- existing storefront transactional email templates;
- an unused `FeaturedProduct` schema that can seed merchandising.

The largest blockers are:

- a public API surface that exposes high-impact inventory/admin mutations;
- public cart/account/order mutations that trust caller-supplied ownership,
  prices, totals, and identifiers;
- customer-facing prices sourced from inventory `costPrice`;
- an empty checkout submit handler and no completed payment/order transaction;
- customer account and order-history pages backed by mock browser storage;
- hard-coded homepage, navigation, footer, promotions, policies, and service
  claims;
- incomplete search, filter, sort, stock, favorites, review, contact, and custom
  quote behavior;
- no storefront exposure/presentation policy inside the existing Dyke,
  inventory, shelf-item, and sales settings authoring paths;
- a storefront product builder that partially reconstructs inventory
  subcomponents instead of consuming the shared sales-form workflow;
- missing routes and broken links;
- a failing site typecheck and obsolete lint command;
- no storefront-focused automated test suite or production release pipeline.

## Readiness Scorecard

| Capability | Current state | Assessment |
| --- | --- | --- |
| Homepage | Hard-coded hero/services; DB categories; empty featured-products block | Prototype |
| Shared product/configuration authoring | Dyke sales settings, route graph, steps, components, inventory, and shelf item management exist | Strong foundation, not storefront-enabled |
| Admin storefront exposure | No unified visibility/default/label/order/publish policy on existing sales definitions | Missing |
| Admin sections/content | No page/section/navigation/policy publishing controls | Missing, but separate from product configuration |
| Catalog search | Reads published inventory but most search/filter/sort inputs are ignored | Partial |
| Product detail | Reads inventory/variants and renders a configurator | Partial |
| Customer pricing | Displays `costPrice`; client supplies cart prices | Unsafe |
| Stock availability | Product overview returns `inStock: false`; add-to-cart remains enabled | Missing/unsafe |
| Cart | Database add/list/count/quantity exists | Partial/unsafe |
| Remove cart item | UI handler is empty | Missing |
| Guest-to-account cart merge | Query can combine guest/user rows but ownership is caller-controlled | Unsafe/incomplete |
| Signup/verification | DB-backed flow and email-task calls exist | Partial |
| Login | NextAuth exists, but storefront does not enforce customer-only identity | Unsafe/incomplete |
| Password recovery | UI links to a missing route | Missing |
| Address book | Billing-address creation exists | Partial/unsafe |
| Checkout | UI exists, submit handler is empty | Non-functional |
| Payment | No completed storefront payment flow | Missing |
| Tax/shipping | Both are hard-coded to zero in cart estimate | Missing |
| Order creation | A server helper writes a basic `SalesOrders` record | Partial/unsafe |
| Customer orders | Mock Zustand/localStorage data | Prototype |
| Order tracking/invoices | Mock buttons/data | Prototype |
| Fulfillment integration | Existing internal domains are available but storefront order handoff is undefined | Missing |
| Contact form | No submit handler | Non-functional |
| Custom quote | Simulated delay and console logging only | Non-functional |
| Reviews/favorites | Models/UI hints exist; actions and queries are incomplete | Missing |
| Legal/policies | Terms page exists; privacy/return links have no routes | Partial |
| SEO/discovery | Sparse metadata; no sitemap, robots, structured product data, redirect plan | Missing |
| Accessibility/performance | No defined storefront gates or automated checks | Missing |
| Test/release confidence | Site typecheck fails; lint command fails; no storefront test suite | Blocked |

## Critical Findings

### 1. Public API and authorization boundary

`apps/site` is typed against and calls the full shared application router.
Numerous inventory operations are declared as `publicProcedure`, including save,
delete, reset, import, category, product-kind, variant price, and variant status
mutations. The public task-trigger route also accepts arbitrary task names and
payloads.

The storefront needs a dedicated allowlisted router. Internal inventory,
administration, task, sales, and operational routers must not be reachable from
the public commerce surface merely because they share a monorepo.

### 2. Object ownership and identity are caller-controlled

Storefront mutations accept `userId`, `authId`, `customerId`, `billingId`, and
cart `lineId` values from the browser. Reads and writes do not consistently
derive the customer from the authenticated session or verify that guest/cart
records belong to the caller.

All authenticated ownership must come from server session context. Guest cart
ownership must use an opaque, server-managed cookie/session and every cart
mutation must scope by owner.

### 3. Money and product validity are caller-controlled

The product list maps inventory `costPrice` into the public price. Add-to-cart
accepts caller-supplied line and component prices. Checkout accepts caller-
supplied subtotal, total, line unit cost, and line total.

The server must resolve an online sell price from the canonical pricing domain,
validate the exact product/variant/configuration, calculate tax, discount,
shipping, and total with decimal money helpers, and reject stale or unavailable
configurations.

### 4. Checkout is not functional

The checkout form's submit handler is empty and never invokes the mutation.
The existing server helper only creates a basic `SalesOrders` row. It does not
provide a secure payment transaction, server-side repricing, inventory
validation/reservation, durable shipping data, cart conversion/cleanup,
idempotency, confirmation, or failure recovery.

### 5. Customer account/order information is mock data

Account, order list, order detail, tracking, invoice, reorder, and status
timeline behavior use persisted Zustand demo data and a mock user store rather
than the database and canonical sales/fulfillment domains.

### 6. The current storefront does not yet consume the canonical sales configuration

The repository already has a reusable sales-form domain: configured routes,
step selection, redirection, visibility, door/HPT size and supplier behavior,
moulding grouping, shelf rows, pricing, save normalization, and inventory sync.
The storefront prototype instead uses a narrower inventory-subcomponent builder
and page-local filter state.

The storefront must become a restrictive third sales-form surface, not grow a
parallel configuration engine. A public adapter should consume customer-safe
Dyke/inventory projections and shared pure workflow rules while hiding internal
editing, cost, supplier, override, and operational controls.

### 7. Merchant exposure and content control are incomplete

Admins can edit inventory products and set publish status, images, variants,
and a `primaryStoreFront` flag. The schema also contains featured-product
fields and a `FeaturedProduct` model, but no complete merchandising queries or
admin workflow consumes them.

There is no coherent policy for selecting a Dyke root configuration as a
Storefront Offer or for exposing, renaming, ordering, defaulting, requiring, or
skipping its steps/components for customers. These controls should be added to
the existing sales settings, Dyke, inventory, and shelf-item authoring paths
rather than creating a second storefront product back office.

Homepage hero text/images, section layout, category copy, service claims,
navigation, footer, promotions, contact details, and policies also remain
hard-coded. Those are merchandising concerns and may use structured content
publishing without owning product configuration.

### 8. Catalog behavior is incomplete

The query schema advertises text, price, tag, attribute, stock, pagination, and
sorting behavior, but the active query applies mainly published/product-kind/
price/category/subcategory filters. Search text, price bounds, stock, tags,
attributes, and sort are mostly commented out or disconnected. The search input
does not write its deferred value to query state.

Product stock is returned as false and the add-to-cart action is still enabled.
Ratings/reviews are null, favorites have no action, related products are not
implemented, and product details lack a merchant-owned specification/SEO
contract.

### 9. Broken and incomplete public routes

Links exist for `/about`, `/forgot-password`, `/privacy-policy`,
`/return-policy`, `/services/installation`, `/services/design`,
`/services/consultation`, and `/warranty`, but those routes are absent.
Navigation uses a mix of obsolete `category` parameters and the active
`categorySlug`/`subCategorySlug` contract.

### 10. Replacement content is stale and inconsistent

The existing site contains outdated promotions, dates, placeholder contact
details, a misspelled shipping URL, and $0.00 product presentation. The new
site also contains hard-coded claims that require business validation, such as
free delivery within 50 miles, five-year warranty, 30-day returns, and expert
installation.

Content migration must be curated rather than copied verbatim.

### 11. Quality gates are not green

`bun --filter @gnd/site typecheck` fails with many site-local module, type,
mutation-input, and inferred-output errors in addition to shared-repo baseline
errors. `bun --filter @gnd/site lint` fails because `next lint` is no longer a
valid command in the current Next.js toolchain. No focused storefront tests
were found.

## Detailed Fix and Feature Plan

### Phase 0 — Secure the platform boundary

1. Create a storefront-only API router containing only required catalog,
   customer, cart, checkout, content, and order endpoints.
2. Convert internal inventory/admin/task mutations to authenticated,
   permission-checked procedures.
3. Derive authenticated customer/user ownership from the server session; never
   accept ownership IDs as authority from the browser.
4. Introduce server-managed guest-cart identity, signed/secure cookies, cart
   ownership checks, login merge, expiry, and cleanup.
5. Add rate limits, abuse controls, safe error contracts, audit logging, and
   authorization regression tests for all public mutations.
6. Enforce customer-only storefront login and prevent employee/admin sessions
   from being treated as customer accounts without an explicit impersonation
   workflow.

### Phase 1 — Reuse the shared sales configuration safely

1. Add `storefront` as a first-class, restrictive surface in the shared
   sales-form contracts and capability model.
2. Reuse the shared route engine, selection/mutation engine, door/HPT,
   moulding, shelf, grouping, decimal pricing, and normalized save contracts.
3. Build a public storefront data-source adapter that projects only allowed
   route, step, component, inventory, image, availability, and sell-price data.
4. Define a `Storefront Offer` as a published customer-facing entry into an
   existing configured Dyke root component, not as a separate configuration
   product.
5. Define Storefront Configuration Policy fields for visibility, public label
   and help, display order, default choice, requirement, allowed skip, public
   image/content, and page association.
6. Keep compatibility, redirects, dependencies, variants, supplier pricing,
   and inventory identity canonical in the existing Dyke/inventory domain.
7. Add parity fixtures proving identical selections produce equivalent
   normalized sales lines and totals in office and storefront surfaces.
8. Resolve customer-facing prices from canonical sales pricing, never supplier
   cost, and calculate all totals server-side.
9. Add explicit stock/made-to-order/backorder/lead-time and fulfillment rules
   plus readiness diagnostics before an offer can be published.

### Phase 2 — Add storefront controls to existing admin workflows

1. Extend the existing sales form settings route editor so authorized users can
   publish root configurations as Storefront Offers and apply customer-facing
   step policy without changing the office route.
2. Extend existing Dyke component and inventory product forms with storefront
   visibility, public title/description/images, sort/default/readiness, and
   preview controls.
3. Extend the existing shelf-item manager with storefront availability and
   customer-safe content controls.
4. Add permission scopes for publishing offers, managing merchandising,
   viewing customer carts/wishlists, and viewing/operating storefront orders;
   Super Admin grants these through the existing role/employee permission
   system.
5. Add storefront cart/wishlist/customer context to existing customer and sales
   workspaces instead of creating a separate operational order system.
6. Implement structured merchandising section types rather than arbitrary HTML:
   hero, announcement, category grid, product collection, promotional banner,
   trust/service cards, rich text, CTA, testimonials, contact/location, FAQ,
   newsletter, and custom-quote CTA.
7. Support draft, preview, publish, schedule, unpublish, ordering, device image
   variants, audience/placement rules, version history, and audit trail.
8. Keep internal costs, supplier choices, admin overrides, and operational
   controls out of all public projections.
9. Activate the existing featured-product schema or replace it with a single
   canonical collection/placement model; do not keep parallel unused systems.
10. Add preview links that render draft offers/content without exposing them
    publicly.

### Phase 3 — Complete browse and product discovery

1. Render browseable final-product pages from published Storefront Offers,
   starting from configured roots such as doors, moulding, and shelf items.
2. On each offer page, seed the shared route with its root selection and guide
   the customer through only the permitted public steps, automatically applying
   hidden defaults and skipping unnecessary office-only specification.
3. Preserve the existing useful product-page behavior where choosing a door
   loads compatible combinations, but move that behavior onto the shared route
   and pricing engine.
4. Render homepage, navigation, footer, contact details, policies, and
   merchandising sections from published admin configuration.
5. Make catalog/search server-rendered or streamed with bounded queries and
   stable loading/error/empty states.
6. Implement real text search, category hierarchy, attributes, price range,
   stock/fulfillment filters, sorting, and cursor/page navigation.
7. Preserve filter state in shareable URLs and align all navigation parameters.
8. Implement customer-safe product detail with image gallery, variants,
   configuration dependencies, quantity bounds, sell price, availability,
   lead time, fulfillment options, specifications, downloadable documents,
   related products, and structured data.
9. Add no-index behavior for invalid/private/draft pages, canonical URLs,
   sitemap entries, and redirects for legacy product/category URLs.
10. Defer reviews, comparison, recently viewed, and recommendations
   until the purchase path is stable unless the business marks them launch
   requirements. Wishlist remains in scope because staff must be able to inspect
   customer carts and saved intent.

### Phase 4 — Complete cart and customer identity

1. Define one canonical Commerce Cart that preserves the normalized sales-form
   line, Dyke step selections, door/HPT rows, moulding rows, shelf rows,
   inventory identities, pricing snapshot, and customer-safe presentation.
2. Replace the dual local/database cart behavior with that server-owned cart
   and a small optimistic client projection.
3. Implement add, update quantity, remove, clear, validation, unavailable-item
   warning, save-for-later, and configuration edit.
4. Merge guest cart into customer cart atomically at login/signup and define
   duplicate-line merge semantics.
5. Reprice and revalidate carts on open and before checkout, showing actionable
   price/stock changes.
6. Add coupon/promotion support only after the promotion ownership and stacking
   policy are defined.
7. Add a wishlist/saved-configuration state using the same customer ownership
   and configuration contract rather than a second line format.
8. Complete signup, verification, login, password reset, session expiry,
   address book, account profile, and account deletion/privacy requests.

### Phase 5 — Complete secure checkout and payment

1. Make checkout available to guests and accounts unless the business chooses
   account-required checkout explicitly.
2. Collect/contact-validate shipping and billing addresses and offer eligible
   local pickup/delivery/shipping methods.
3. Calculate tax and delivery/shipping server-side from canonical policy.
4. Create an idempotent checkout session that snapshots validated lines and
   totals, then launches Square or another approved payment method.
5. Promote the validated cart through the standard sales save/orchestration
   path so it creates the same `SalesOrders`, `SalesOrderItems`, Dyke step/HPT/
   moulding/shelf relationships, and inventory sync inputs as an office sale.
6. Mark the standard order with a storefront sales channel and apply defined
   rep/team assignment and review policy; do not create a parallel order table.
7. Convert the cart only through the authoritative payment/order state machine;
   safely handle pending, failed, cancelled, duplicate, and retried callbacks.
8. Clear/lock the cart only after the correct order transition.
9. Send confirmation/receipt emails and show a durable confirmation page with
   order number, payment status, fulfillment method, next step, and support
   path.
10. Add fraud/velocity controls, webhook verification, idempotency keys,
   reconciliation, refund/cancellation boundaries, and payment audit evidence.

### Phase 6 — Complete customer order self-service

1. Replace mock order state with customer-scoped database queries.
2. Show order list/detail, payment state, line configuration snapshot, totals,
   addresses, documents, production/fulfillment status, delivery/pickup status,
   and support contact.
3. Translate internal statuses into a stable customer-facing timeline without
   exposing operational noise.
4. Provide invoice/receipt downloads from the canonical document system.
5. Support tracking links, pickup-ready instructions, cancellation windows,
   return requests, damage reports, reorder, and review requests according to
   policy.
6. Send order confirmation, status, production/ready, shipping, delivery,
   cancellation, refund, abandoned-cart, and post-delivery messages through
   auditable notification workflows.
7. Add permission-scoped staff views of customer carts, wishlists, and
   storefront activity to existing customer/sales surfaces.

### Phase 7 — Integrate internal operations

1. Ensure the standard sales save pipeline creates a storefront-channel order
   and queues the existing sales-to-inventory synchronization.
2. Preserve the configured product/variant/component snapshot so later catalog
   edits cannot alter an order.
3. Add a Storefront source badge/filter and customer/order context to internal
   workspaces.
4. Define stock reservation, inbound/backorder, production readiness, partial
   shipment, cancellation, refund, and return effects.
5. Ensure customer-visible status derives from canonical operational events.
6. Add admin order actions with role permissions, audit log, notification
   side-effects, and reversal rules.

### Phase 8 — Content, service, and legacy-site parity

1. Rebuild or redirect legacy Home, Shop, Interior Doors, Prehung, Bifold, Door
   Slab, Moldings, Base, Casing, Crown, Hardware, Shipping & Delivery, Contact,
   Account, Terms, Privacy, and Returns routes.
2. Add functional contact and custom-quote intake with files, spam protection,
   durable storage, internal assignment/status, confirmation, and follow-up.
3. Add shipping/pickup, warranty, return/refund, privacy/cookie, terms, and
   accessibility policies owned by admin content.
4. Add newsletter consent and unsubscribe flows only with a compliant audience
   and delivery provider.
5. Validate all business claims and remove stale dates, placeholder data, and
   unsupported payment/shipping promises.
6. Migrate product/category content and media with an import report, duplicates
   review, redirects, and SEO preservation.

### Phase 9 — Non-functional and release gates

1. Restore a clean site-local typecheck, replace obsolete lint configuration,
   and add focused unit/contract/integration tests.
2. Add browser tests for browse -> configure -> cart -> login/guest -> checkout
   -> payment -> confirmation -> account/order status.
3. Add authorization, price tampering, cart ownership, webhook replay,
   idempotency, oversell, tax/shipping, cancellation/refund, and admin publishing
   tests.
4. Meet WCAG 2.1 AA, keyboard, screen-reader, contrast, focus, form-error, and
   reduced-motion requirements.
5. Set Core Web Vitals/image/bundle/query budgets and add production analytics,
   conversion events, search-zero-result events, error monitoring, audit logs,
   and checkout alerts.
6. Add sitemap, robots, canonical metadata, product/breadcrumb structured data,
   Open Graph images, redirect validation, and 404 monitoring.
7. Run content QA, device/browser matrix, sandbox payment drills, email/document
   snapshots, load tests, security review, backup/restore drill, and launch
   rollback rehearsal.
8. Cut over DNS only after a release candidate passes the full gate; retain a
   reversible rollback and monitor revenue/error/payment signals closely.

## Recommended Delivery Order

1. Security and API isolation.
2. Storefront adapter/capability profile for the shared sales-form engine.
3. Storefront exposure policy embedded in existing Dyke, sales settings,
   inventory, and shelf-item authoring.
4. Door, moulding, and shelf-item parity fixtures plus public offer pages.
5. Canonical sales-configuration cart, wishlist, and customer identity.
6. Server-authoritative checkout/payment promoted through standard sales save.
7. Customer order self-service and staff cart/order visibility.
8. Existing inventory/production/fulfillment status bridge.
9. Content/service/legal/SEO migration.
10. Full QA, migration rehearsal, staged launch, and rollback.

## Launch Definition

The replacement is launchable only when:

- an unauthorized visitor cannot invoke internal/admin mutations;
- displayed and charged prices come from the same canonical server calculation;
- a complete sandbox checkout creates exactly one paid/pending order and no
  duplicate payment/order records;
- every order is visible both to the customer and authorized internal staff;
- production/fulfillment/delivery events update customer-facing status;
- authorized admins can publish/unpublish Storefront Offers and control public
  steps/components from existing sales/inventory workspaces without defining a
  duplicate product configuration;
- a storefront-configured door, moulding line, and shelf line each create the
  same standard office sales relationships as their office-form equivalent;
- all required policies, contact/custom quote flows, emails, receipts, and
  redirects work;
- storefront-specific typecheck, lint, test, browser, accessibility, security,
  and performance gates pass;
- migration, DNS cutover, monitoring, and rollback have been rehearsed.

## Validation Evidence

- Read repository Brain architecture, engineering, feature, API, database, and
  task context relevant to storefront, inventory, customers, checkout, and
  sales.
- Reviewed `apps/site`, storefront/shopping API routes, storefront sales-domain
  helpers, inventory schema/admin editor, customer/auth models, and build
  configuration.
- Traced the office sales route graph, shared sales-form workflow contracts,
  door/HPT, moulding, shelf-item, pricing, save, and sales-to-inventory paths;
  confirmed these are the appropriate storefront configuration foundation.
- Reviewed the live `gndmillwork.com` home, shop, category, shipping, contact,
  terms, privacy, return, and product surfaces on 2026-07-20.
- `bun --filter @gnd/site typecheck` failed with storefront-local and shared
  baseline errors.
- `bun --filter @gnd/site lint` failed because `next lint` is treated as an
  invalid project directory by the current Next.js CLI.
- No focused storefront test suite was found.
