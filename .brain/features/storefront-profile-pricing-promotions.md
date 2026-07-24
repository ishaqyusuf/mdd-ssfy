# Feature: Storefront Customer Profile Pricing and Promotions

## Purpose

Let the storefront calculate customer-specific prices with the same customer
profile coefficient used by office Sales, then layer scheduled, targeted
storefront promotions over that result. Shoppers receive familiar e-commerce
sale presentation without creating a second product or base-pricing system.

## Pricing Profile Resolution

The server resolves one pricing profile for every storefront request:

1. A signed-in customer's active, global assigned `CustomerTypes` profile.
2. The active global profile selected in Storefront Settings as
   `defaultCustomerProfileId`.
3. No profile, which preserves canonical Dyke Sales pricing.

Dealer-owned and soft-deleted profiles are never eligible. The resolved
profile ID, title, coefficient, update timestamp, and resolution source are
captured in the private pricing snapshot. Public responses never expose the
coefficient.

## Promotion Model

`StorefrontPromotion` owns storefront-only campaign copy, percentage,
priority, schedule, publication state, and target mode. Normalized target
tables support:

- everyone or selected customers/customer profiles;
- every published offer or selected categories/offers.

Campaign times are stored in UTC. Administration presents and accepts business
time in `America/New_York`. Eligibility uses an inclusive start and exclusive
end. A missing end means the campaign remains active until archived.

Only one campaign applies to a line. Eligible campaigns are ordered by:

1. highest percentage;
2. highest priority;
3. newest start;
4. stable campaign ID.

Promotions do not stack.

## Money and Checkout Contract

1. Canonical Dyke component/base pricing is resolved.
2. The resolved customer profile coefficient is applied with the shared Sales
   pricing helper.
3. The selected promotion percentage is applied once to the complete
   profile-adjusted line total with decimal-safe money helpers.

Cart snapshots retain list total, discount, final total, profile identity, and
campaign identity. Guest lines are first moved losslessly, then identical lines
are consolidated only after the merged quantity passes canonical repricing.
Checkout reprices again and rejects a stale profile, campaign, list price, or
final price as `PRICE_CHANGED`.

The checkout summary exposes merchandise, promotion discount, discounted
subtotal, shipping, tax/card charges, and final total. The canonical Sales
Order receives the resolved profile ID, fixed campaign discount adjustments,
and private storefront pricing evidence in Sales metadata. Existing Sales,
payment, inventory, production, and fulfillment workflows remain canonical.

## Administration

- Storefront Settings selects the guest/default customer profile and warns if
  a previously configured profile is no longer available.
- `/storefront/promotions` lists Draft, Scheduled, Active, Expired, and
  Archived campaigns.
- The promotion sheet edits public copy, badge/banner, percentage, priority,
  Eastern schedule, audience targets, and product targets.
- Draft save, publish, and archive operations are permission checked and
  audited.

## Shopper Presentation

- Eligible campaign banners appear above the storefront header.
- Featured, category, and search cards display the campaign badge and savings
  copy.
- Product configuration options and configured totals display accessible
  list/sale prices when a reliable server price exists.
- Cart, order summary, and checkout show crossed-out list totals, discounts,
  sale totals, and savings.

## Permissions and Privacy

- Campaign list/detail/options require `viewStorefront`.
- Campaign save and default-profile settings require `editStorefront`.
- Campaign publish/archive require `publishStorefront`.
- Public APIs return only title, badge, banner, percentage, and final/list
  prices needed for presentation. Customer/profile target lists, priority,
  coefficients, and internal names remain private.

## Verification

- Shared pricing and promotion domain: 7 tests.
- Promotion input contract: 3 tests.
- Existing product-aware shipping regression: 5 tests.
- Storefront projection/configuration regression: 10 tests.
- Total focused result: 25 tests, 71 assertions, 0 failures.
- `@gnd/sales`, `@gnd/api`, and `@gnd/storefront` typechecks pass.
- Storefront Next.js/Turbopack production build passes all routes.
- Focused Biome checks pass for the new domain, API, admin, and card modules.
- The broad `@gnd/www` typecheck retains more than 500 unrelated existing
  diagnostics; filtered output contains no changed storefront admin files.
- Review follow-up preserved archived campaigns in the default admin list,
  lazily loads editor target options, moved target lookups out of the router,
  retained door-size sale metadata, applied profile pricing to shelf items,
  bounded active campaigns without silently dropping a possible winner, and
  centralized checkout pricing fingerprints.
- Local browser QA rendered the admin Promotions workspace and a disposable
  25%-off campaign on the storefront announcement, featured cards, and search
  cards without browser console errors. The disposable campaign was removed.

## Database Rollout

`bun run db:generate` and local `prisma db push` pass. Normal migration
generation remains blocked by the pre-existing
`20260722180000_master_password_usage_audit` shadow-history defect, which
alters `MasterPasswordLoginAudit` before its create migration is present in the
configured migration chain. No production database was changed. The promotion
schema must be applied through the approved deployment workflow after that
existing migration-history issue is reconciled.
