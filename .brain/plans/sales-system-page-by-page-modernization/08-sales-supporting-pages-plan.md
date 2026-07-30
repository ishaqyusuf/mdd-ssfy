# Plan: Sales Supporting Pages Modernization

## Type
Multi-Page Feature Modernization

## Status
Deferred - Activate Only After Sequence 07 Acceptance

## Sequence
08

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Align reports, products, inbounds, communications, and dealer/partner pages
with the accepted sales page contracts without treating them as one large
implementation batch.

## Activation Gate
- Sequence 07 is accepted.
- The operator explicitly activates Sequence 08.
- Each supporting page is activated and reviewed independently in the order
  recorded below.

## Included Page Groups

### S1 - Reports
- `/sales-book/reports`
- `/product-report`
- `/sales-book/top-selling-products`
- Keep dashboard, customizable reports, and product analysis boundaries clear.
- Reports reuse canonical projections and active filter context.

### S2 - Products
- `/sales-book/shelf-items` and related product-report surfaces.
- Clarify the sales-facing catalog boundary versus the inventory application.
- Preserve category, pricing, visibility, and product-management permissions.

### S3 - Inbounds
- `/sales-book/inbounds`
- `/sales-book/inbound-management`
- Align receiving/demand exceptions with accepted production/packing contracts.
- Preserve inventory authority for inbound status.

### S4 - Communications
- `/sales-book/emails`
- Evolve toward a searchable customer/order communication and document-delivery
  ledger with status, attachments, retry, tags, and detail-on-demand.
- Preserve secure sales document messaging and audit history.

### S5 - Dealers And Partner Accounts
- `/sales-book/dealers`
- Keep customer, dealer ownership, recruitment suppression, invitation, and
  privacy boundaries intact.
- Reuse the accepted Customer Overview patterns where appropriate.

## Shared Execution Rule
S1–S5 are separate monitored subplans inside Sequence 08. Complete and accept
one before editing the next. If any group becomes large, create a numbered
subfolder or child plan before implementation.

## Incremental Phases Per Page Group

### Sx.0 - Baseline
- Record route, data, filters, actions, permissions, responsive behavior,
  exports, deep links, and current feature ownership.

### Sx.1 - Page Shell
- Apply accepted header, toolbar, loading, empty/error, and mobile contracts.
- Preserve domain behavior.

### Sx.2 - Table Or Primary Workspace
- Approve default information, views, filters, and actions.
- Keep server pagination and domain ownership.

### Sx.3 - Detail And Actions
- Use URL-owned sheets/details where they improve continuity.
- Validate permissions, cross-feature links, documents, and invalidation.

### Sx.4 - Cleanup And Acceptance
- Remove only proven duplicate UI/contracts.
- Record focused tests, browser proof, Brain evidence, and operator acceptance.

## Navigation Direction
After S1–S5 are accepted, review the supporting Sales navigation:
- Keep page destinations.
- Remove create actions, deleted views, experimental routes, and internal modes
  from sidebar sublinks.
- Do not change global navigation before page destinations and permission
  behavior are settled.

## Data And Permission Direction
- Reports use canonical, bounded projections.
- Products and inbounds preserve inventory ownership.
- Communications preserve message/document access and audit history.
- Dealers preserve customer privacy, ownership, and invitation permissions.
- No supporting page may bypass office scope.

## Likely File Areas
- Sales reports routes/components/generators
- Product report, top-selling products, and shelf-item routes/tables
- Inbounds and inbound-management routes/tables
- Sales email ledger, messaging, document, and retry components
- Dealers route/table and dealership/customer APIs
- `apps/dashboard/src/components/sidebar-links.ts` only after page acceptance

## Validation
- Per-page migration-parity and permission tests
- Report totals/export fixtures
- Inventory ownership and inbound-status tests
- Message/document delivery and resend tests
- Dealer privacy/invitation tests
- Authenticated desktop/mobile proof for every S1–S5 page

## Non-Goals
- One PR or batch for all supporting pages
- Moving inventory ownership into Sales
- Replacing canonical reports without parity
- Rebuilding customer/dealer privacy rules

## TODO
- Confirm the S1–S5 execution order when Sequence 08 activates.
- Decide whether Product Report remains separate after product-page evidence.
- Decide whether Communications needs table/grid switching.

## Completion Gate
Every S1–S5 page group requires independent acceptance before Sequence 08 is
complete or Sequence 09 can be activated.
