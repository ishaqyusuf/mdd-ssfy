# ADR-052: Multi-Tenant Company Boundary And Shared Sales Configuration

## Status
Proposed

## Date
2026-08-08

## Context

GND is currently an operational product for one company. It has an
`Organization` model and planned active-office scoping, but that plan explicitly
defines Organization as an internal office, not an independent customer/legal
tenant. Most users, customers, inventory, payments, documents, configuration,
jobs, and settings have no authoritative tenant ownership.

The product is to be sold to other independent companies. Each company needs
isolated data, subscriptions, enabled modules, branding, domains, sender
identity, documents, pricing, staff, offices, and provider connections. The
existing Sales Form configuration and downstream sales/inventory/production
logic are valuable shared intellectual property, but GND commercial prices and
company-specific data must not be distributed to tenants.

## Decision

### Tenant And Office

Introduce `Tenant` as the top-level company, billing, security, retention, and
data-ownership boundary. Keep `Organization` as an office/location and require
it to belong to one tenant.

Global people identities may have multiple `TenantMembership` records. A
session operates in one verified tenant and office at a time. Dealer, customer,
storefront, and mobile-worker identities remain domain actors and do not become
tenant authority by implication.

### Deployment And Data Topology

Use one maintained codebase and an initially pooled database/application
topology. Stamp and scope all tenant-owned data through trusted server context.
Use tenant-aware repositories, compound identities, negative isolation tests,
tenant-prefixed caches/jobs/files/events, and least-privilege provider
connections. After the proposed Neon/Postgres migration, add row-level security
to selected high-risk tenant tables as defense in depth.

Dedicated database/deployment topology may be offered later for enterprise
contracts, but normal product behavior cannot depend on per-tenant forks or
environment variables.

### Sales Configuration

Maintain one immutable, versioned platform Sales configuration template that
owns safe structural identities and compatibility rules. Each tenant pins a
template revision and owns a versioned overlay for visibility, presentation,
ordering, defaults, requirements, allowed custom components, and publication.

Tenants own all price books, customer profiles, coefficients, taxes, currencies,
and effective dates. Starter template publication excludes GND prices, costs,
supplier information, and other confidential commercial fields. Saved sales
snapshot tenant configuration and pricing evidence for historical reproduction.

Template upgrades are opt-in/published through a diff and conflict workflow;
they do not mutate live tenant configuration silently.

### Features And Billing

Use a code-defined feature registry, versioned sellable plans, and persisted
tenant entitlements. The server projection is enforced at API, job, mobile,
export, public, and UI boundaries. Feature disablement preserves data under the
module retention/export contract.

Keep SaaS subscription billing separate from operational sale/customer
payments. Stripe Billing is the initial candidate for platform subscriptions.
Existing Square behavior remains an operational payment domain and may become
tenant-connectable only through a separately reviewed OAuth/provider-account
design.

### Domains, Email, And Documents

Resolve tenant identity from a verified platform/custom hostname or a signed
tenant-bound public token before application behavior. Domain ownership is
globally unique, proof-of-control based, auditable, revocable, and cache purged
before reuse.

Separate platform security/billing email from tenant operational email. Tenant
sender domains and webhook outcomes are tenant scoped. Brand and legal metadata
are resolved at document/email render time from a versioned tenant snapshot.
Stored documents, PDF snapshots, paths, signed links, retention, and quotas all
carry tenant ownership.

## Consequences

### Positive

- Independent companies can safely use one maintained product.
- Offices, dealers, and tenants have distinct meanings and permission models.
- Shared Sales Form improvements can reach every tenant without copying data or
  code, while tenant pricing and customization remain independent.
- Versioned configuration and sale snapshots preserve historical documents and
  totals.
- Coherent modules and entitlements support commercial packaging without
  uncontrolled code forks.
- Platform subscription accounting cannot be confused with tenant customer
  payments.

### Negative

- Tenant ownership touches nearly every schema, query, mutation, job, cache,
  export, document, public link, and support workflow.
- The existing GND dataset requires a large, reconciled backfill and some
  globally unique identifiers must become tenant-scoped.
- A pooled topology creates noisy-neighbor and missing-predicate risk, requiring
  layered controls, quotas, tests, and later enterprise isolation options.
- Versioned Sales template overlays and upgrade conflicts add product/admin
  complexity.
- The database-provider migration and tenant migration must be sequenced and
  validated as separate high-risk programs.

## Rejected Alternatives

- Reuse `Organization` as tenant: rejected because it already means internal
  office, existing relations are incomplete, and legal tenant versus office
  permissions/lifecycle would remain ambiguous.
- Treat every dealer as a tenant: rejected because dealership is a business
  relationship/portal within the current sales domain and does not own all
  required company data or administration.
- Clone the deployment/database for every customer: rejected for the default
  product because releases, fixes, support, configuration, and cost would drift.
  Retain only as a later enterprise option.
- Copy the full GND Sales configuration into every tenant: rejected because
  copies drift and may leak prices/costs. Use immutable base revisions plus
  tenant overlays.
- Let tenants directly edit platform compatibility rules: rejected because it
  can corrupt inventory, production, calculations, and cross-surface behavior.
  Reviewed extensions use stable custom-component mappings.
- Gate features only in navigation: rejected because API, jobs, mobile, public
  links, and exports would remain accessible.
- Use existing Square records for SaaS subscriptions: rejected because software
  billing and tenant customer commerce require separate ledgers and provider
  ownership.
- Trust `x-tenant-domain` or client-supplied `tenantId`: rejected because client
  context is forgeable.

## Implementation Constraints

- This ADR remains Proposed until the client approves the product/company
  boundary, target launch markets, database sequence, payment provider, module
  catalog, and commercial scope.
- No public tenant onboarding precedes a complete ownership inventory and
  two-tenant isolation fixture.
- No domain is enabled until its write stamping, backfill, read scoping,
  job/cache/export/document paths, and negative tests pass.
- No GND pricing/cost/supplier data enters the published starter template.
- No irreversible lockout/deletion occurs from billing status alone.
- The existing office-scoping plan must be revised to nest offices beneath
  tenant membership instead of becoming a competing top-level authority.

## Related Records

- `.brain/plans/2026-08-08-feature-multi-tenant-saas-commercialization.md`
- `.brain/features/multi-tenant-saas-platform.md`
- `.brain/plans/2026-07-29-feature-office-organization-management-and-scoping.md`
- `.brain/plans/2026-08-04-planetscale-to-neon-postgres-migration.md`
- `.brain/decisions/ADR-017-storefront-shared-sales-configuration.md`
- `.brain/decisions/ADR-029-storefront-profile-pricing-and-promotions.md`
