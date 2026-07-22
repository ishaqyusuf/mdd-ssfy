# Feature: Storefront E-commerce Replacement

## Purpose

Replace `gndmillwork.com` with a customer-facing e-commerce surface over GND's
existing office sales configuration, inventory, and order domains. Customers
receive a simplified guided configuration journey, while authorized staff keep
managing the shared definitions from the existing sales, Dyke, inventory, shelf
item, customer, and permission workspaces.

## Canonical Terms

- **Storefront**: the customer-facing e-commerce application in
  `apps/storefront`.
- **Storefront Admin**: permission-gated merchant operations in `apps/www`.
- **Dyke Sales Configuration**: the shared office-authored step graph,
  components, dependencies, routes, and pricing behavior used by the sales
  form.
- **Storefront Offer**: a published customer-facing entry into an existing Dyke
  root configuration, with public content and a permitted subset of steps and
  components.
- **Storefront Configuration Policy**: public visibility, label, order,
  default, required, and skip rules applied to existing Dyke definitions.
- **Customer Configuration**: the lossless, valid sales-line selection snapshot
  produced by the shared sales-form engine through the storefront.
- **Merchandising section**: an admin-configured, ordered, publishable storefront
  block such as a hero, category grid, product collection, promotion, FAQ, or
  rich-text section.
- **Storefront order**: a standard Sales Order created through the storefront,
  marked with a storefront sales channel, and processed by the canonical
  payment, inventory, production, dispatch, document, and notification systems.
- **Customer order status**: a stable customer-facing projection of canonical
  payment and operational events.

## Current State

- `apps/storefront` now provides database-backed home, category, search, product
  configuration, cart, wishlist, authentication, checkout, account, order,
  invoice, contact, custom-quote, CMS page, sitemap, and robots surfaces.
- The public site uses a dedicated allowlisted storefront tRPC endpoint.
  Customer identity is session-derived, guest ownership uses a signed
  HttpOnly cookie, and the server owns configuration validation and pricing.
- Doors, mouldings, and shelf items are projected from the canonical Dyke
  sales-form route. Storefront policy controls publication, presentation,
  visible steps, hidden defaults, ordering, and automatic selection without
  redefining canonical compatibility or price.
- Checkout reprices every line, calculates configured delivery/tax/card
  charges, uses an idempotent Square flow, and promotes the cart into one
  canonical `SalesOrders` record with `salesChannel = "storefront"`.
- The internal Storefront workspace provides separate permission-gated
  Categories, Catalog, Carts & Wishlists, Orders, Inquiries, Pages & Sections,
  and Settings routes. Catalog availability is paged and card-based rather
  than hydrating the complete component catalog. Its dashboard navigation link
  is marked `WIP` while the release gates below remain open.
- Lifecycle cleanup and order-confirmation email run as background jobs.

## Product Direction

- The storefront reuses the same sales-form route engine, configuration
  relationships, pricing helpers, and save semantics as office sales.
- Admins expose existing root configurations, steps, components, inventory, and
  shelf items to the storefront from their current management surfaces; they do
  not maintain a parallel storefront product system.
- Customer pages simplify the office form through storefront visibility,
  labels, defaults, ordering, and skip rules while retaining valid Dyke
  relationships.
- Admins separately control merchandising content such as page copy, media,
  navigation, sections, promotions, and policies without redefining product
  configuration.
- The server owns customer identity, cart ownership, product validity, prices,
  tax, shipping, discounts, payment, and order transitions.
- Carts preserve the same normalized sales-line configuration, and checkout
  promotes it into the standard office Sales Orders workflow with a storefront
  channel.
- Super Admin-granted permissions control who can publish storefront offers,
  manage merchandising, inspect customer carts/wishlists, and operate
  storefront-origin orders.
- Legacy content is curated, migrated, and redirected rather than copied
  blindly.

## Plan and Evidence

- Detailed audit:
  `.brain/reports/2026-07-20-storefront-ecommerce-replacement-audit.md`
- Wayfinder map:
  `.scratch/storefront-ecommerce-replacement/map.md`

## Implementation Notes

- Availability policy supports `IN_STOCK`, `MADE_TO_ORDER`, and `BACKORDER`,
  lead-time ranges, a customer message, and browse-only offers. This policy is
  not a hard inventory reservation.
- Cart lines preserve the normalized canonical configuration, configuration
  version, server pricing snapshot, Dyke root identity, and specialized
  door/HPT, moulding, or shelf rows required for standard sales persistence.
- Staff cart/order/inquiry access is separately permissioned and audited.
- Public catalog and admin queries are bounded and soft-delete aware.
- Production must configure a durable storefront guest signing secret and
  Square/auth/email environment settings.
- The Vercel `gnd-storefront` project root is `apps/storefront`, matching the
  rename from the former `apps/site` workspace.
- The storefront app's server-side tRPC client must use the storefront origin
  for `/api/storefront/trpc`, not the shared `NEXT_PUBLIC_APP_URL` when that
  value points at the internal `apps/www` host. Server prefetches preserve the
  current request host and forwarded headers so local portless/proxy rendering
  returns JSON instead of the main app's HTML 404.
- Storefront homepage prefetches are awaited before hydration so the server and
  first client render share the same content, category, and featured-offer
  query state. This prevents empty catalog responses from hydrating as
  skeleton markup on the server and empty-state markup on the client.
- The homepage hero uses one shared photo-led component for both the fallback
  and CMS-authored home-page paths. CMS title, body, image, and primary action
  remain configurable, while the fallback uses a locally bundled architectural
  door photograph, a primary catalog action, a subordinate custom-project
  action, and a compact product-family rail.
- Product-detail compatibility is intentional: the canonical historical
  `/product/[categorySlug]/[productSlug]` route keeps the image-led presentation
  and option-button variant picker without exposing an office-style table.
  Product identity controls such as Door Type are locked and rendered as badges
  below the description. Item Type is the first selectable control and switches
  the canonical sales route, so pre-hung and slab-only products expose only the
  steps configured for that route. `/products/[productSlug]` redirects here.
- Door dimensions render as priced buttons. Selecting a dimension updates the
  displayed sales price, and routes that require handling expose persistent
  left/right controls. Component add-ons remain one-open-at-a-time accordions;
  their options render as image cards with server-calculated prices.
- A selected door whose size candidates have no configured price keeps its
  required storefront door schedule with empty size arrays. The product page
  keeps the Size section visible, labels the sizes and price as unavailable,
  hides handling, and disables cart and wishlist actions until a priced size
  exists. Explicitly configured zero-dollar prices remain valid sizes.
- Product media supports one primary image plus a bounded merchandising gallery
  stored in the source component's storefront overlay metadata. The admin item
  sheet edits the gallery without changing the canonical Dyke product image.
- Catalog cards expose `Open in storefront` from their context menu only when
  the component, offer, and category are all published. The action remains
  visible but disabled for offline or otherwise unpublished components.
- A canonical offer's source product is always applied as a hidden default. It
  must not appear as another customer-selectable option on its own product
  page; only compatible variants and add-on components are exposed.
- Configuration preview accepts incomplete selections and returns
  `complete: false` until every currently visible required step is selected.
  Hidden and selection-waived steps are not required. Canonical components for
  all route steps are loaded in one bounded query, and the browser keys preview
  effects by semantic request content so an unchanged page does not poll.
- Guest cart traffic uses the dedicated `/api/storefront/trpc` endpoint.
  Customer checkout also recognizes the existing chunked secure NextAuth
  session cookie without exposing the internal application router.
- Storefront order review is intentionally mandatory in-app for the explicitly
  assigned sales rep, even when the local notification-channel seed or the
  rep's general channel preference is absent. Email remains independently
  governed by the configured email transport.

## Verification

- Storefront migration `20260720130000_storefront_ecommerce_replacement`
  applied with all 102 repository migrations to isolated MySQL database
  `gnd_storefront_verify`.
- The user confirmed the storefront schema was safely pushed to both
  development and production on 2026-07-20. No reset was performed by this
  implementation session.
- Focused storefront/catalog/notification tests: 18 passed, 0 failed.
- Browser QA against the isolated database: responsive homepage 200, guest
  cart 200, contact page 200, inquiry submission 200, and no browser console
  errors after fixes.
- Broad workspace typechecks remain blocked by unrelated existing Prisma,
  inventory, document, and duplicate React-type baseline failures. Focused
  storefront diagnostic filtering is clean except the jobs test compiler's
  existing lack of `bun:test` declarations.
- The production storefront bundle compiled successfully. Next.js then stopped
  during its workspace TypeScript gate on the pre-existing
  `apps/api/src/db/queries/inbound-receiving.ts` readonly dispatch-status tuple
  incompatibility; no storefront diagnostic was reported.
- Local browser regression on 2026-07-21: `https://gnd-storefront.localhost/`
  reloads with the homepage hero visible and no `Unexpected token '<'`,
  redacted tRPC, `Data failed`, or hydration mismatch errors after the
  storefront SSR tRPC origin and awaited-homepage-prefetch fixes. Direct
  storefront tRPC route smoke returns JSON for public content and catalog
  requests.
- Hero browser regression on 2026-07-22: an isolated local preview rendered the
  shared hero at 1440x1000 and 375x812 with the local image loaded, both actions
  visible, no console errors, and no mobile horizontal overflow (`375px`
  scroll/client width). Full homepage regression remains blocked by the
  unrelated existing missing `normalizeTerminalDeviceId` export in
  `@gnd/square`, which makes the storefront API route compile return `500`.
- Product-page browser regression on 2026-07-21: the Carrara test offer renders
  a four-image gallery, an `HC Molded` identity badge, canonical Item Type
  buttons, and no product table. Interior pre-hung exposes route-specific door
  configuration, height, bore, priced size buttons, and handing; Door Slabs Only
  reconfigures to slab height/size plus the Bore add-on and omits handing.
  Selecting `1-6 x 6-8` preserves the selection through a Left hand choice and
  displays `$47.50`. The admin Carrara context menu enables `Open in storefront`,
  while an offline moulding exposes the same item disabled.
- Product-page browser regression on 2026-07-22: the unpriced Birkdale offer
  keeps the Size section visible with `Sizes are not available for this
  product.`, shows unavailable pricing/availability, omits Handing, and disables
  cart and wishlist. A fully configured Carrara path still renders priced size
  buttons and enables cart/wishlist; both checks completed without browser
  console errors. Focused storefront configuration coverage passes 10 tests / 16
  assertions, including unpriced, positive-price, and zero-dollar size cases.
- Full local sandbox rehearsal on 2026-07-21 created customer order
  `08897CST`, assigned Laura Ruth Godoy, produced the reviewed Square payment
  link, completed a Square sandbox payment, persisted the online payment,
  reduced amount due to `$0.00`, generated the invoice, displayed Payment
  received in the customer account, and displayed PAID in Storefront Orders.
  The Storefront Orders handoff opens the same configured order in the office
  sales editor with its door schedule and totals intact.
  The rep review activity is persisted unread for the assigned employee.
  Local `SKIP_EMAIL=1` recorded email attempts as skipped, so provider
  delivery was not claimed.
- Vercel preview deployment `dpl_9d1gkWTDKzuEdCP4wgvi2tnzXqTw` reached
  `READY` on 2026-07-22 at
  `https://gnd-storefront-dejeiq01a-gndprodesk.vercel.app`. The remote build
  generated Prisma Client 6.19.2, compiled the storefront with Next.js
  16.2.10/Turbopack, and generated all static routes. Protected-preview smoke
  checks returned HTTP 200 for `/`, `/robots.txt`, `/sitemap.xml`, `/login`,
  and `/verify`; the sitemap returned `application/xml`. The stale storefront
  `DATABASE_URL` was synchronized from the `www` Vercel project across
  Development, Preview, and Production without recording its value. Production
  aliases were not promoted or changed. A non-blocking Turbopack NFT tracing
  warning remains in the internal API/dev-logger dependency path.

## Status

Implemented, migration-verified, schema-deployed, and locally rehearsed through
Square sandbox settlement. Traffic cutover remains release-gated on approved
production content and policy copy, real Square/email credentials, and a
physical fulfillment rehearsal. A healthy protected Vercel preview now exists;
production promotion remains intentionally gated.

## Custom millwork intake and office handoff (2026-07-22)

- `/custom` is a four-step project brief for project category, site, scope,
  timing/budget, contact preference, and up to five private reference files.
- The customer receives a stable `CMW-*` reference. Submission persists a
  `DRAFT` first, verifies any private Vercel Blob uploads, then atomically moves
  the inquiry to `NEW`. A configured storefront sales rep is assigned when
  eligible; otherwise the office inbox shows it as unassigned.
- Private files use `STOREFRONT_INQUIRY_BLOB_READ_WRITE_TOKEN` (falling back to
  `BLOB_READ_WRITE_TOKEN`) and are never returned as public blob URLs. Authorized
  employees download them through a permission-checked `www` proxy route. The
  upload endpoint atomically caps authorization at five files and rejects tokens
  after the draft is submitted.
- The office `/storefront/inquiries` workspace provides summary counts, search,
  owner/status filters, structured brief and attachment review, assignment,
  status transitions, internal notes, customer matching/linking, and activity.
- Quote creation requires both `editStorefrontOrders` and canonical
  `editOrders`. It creates one Draft through the existing Sales form save path,
  assigns the inquiry rep, records storefront inquiry origin metadata, and links
  the canonical Sales quote back to the inquiry. A retry reconciles an
  origin-tagged Sales quote before creating anything, closing the crash window
  between Sales persistence and inquiry linkage.
- Customer and sales-rep notifications are best effort. Notification transport
  failures are recorded in inquiry activity and cannot make a committed customer
  submission fail. Recipient selection uses `viewStorefrontOrders`, transactional
  emails carry stable provider idempotency keys, and existing in-app recipients
  are checked before retry writes.
- Unsubmitted drafts and their private blob prefixes are cleaned after 24 hours.
  If private Blob cleanup is unavailable or fails, the database draft is retained
  so a later run still has the cleanup prefix.
- Browser verification submitted `CMW-IXPC1FJXSK` with no console errors and
  verified its `NEW` state, structured brief, assignment activity, office list,
  detail, and summary reads. Follow-up persistence regression coverage verifies
  the upload cap, system-owned statuses, quote recovery, notification idempotency
  options, and cleanup fail-closed behavior.
- Prisma migration creation is currently blocked by the unrelated existing
  `20260722180000_master_password_usage_audit` shadow-database failure. The new
  additive schema was pushed to local `gnd-prisma2` for integration testing;
  production was not changed.
