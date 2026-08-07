# Driver Platform Revival Closeout Specification

**Status:** ready-for-agent

## Problem Statement

The revived driver platform now has protected work queues, structured dispatch
manifests, dispatch-bound inventory allocation, warehouse preparation, a
dedicated Expo Go development route, and the approved dark visual identity.
However, the remaining operational journey is not yet complete enough for
cutover.

The development account picker displays active employees but only replaces the
email in the ordinary password form. This makes accounts without the shared
development password appear usable when they are not, preventing reliable
assigned-driver validation. Packing also has separate legacy and inventory
mutation paths, so a mixed dispatch can partially update one path before the
other fails. Finally, the complete warehouse-to-driver journey still needs
repeatable Expo Go proof that starting and completing a trip consumes the exact
picked inventory once and preserves the existing proof-completion retry
contract.

Without closing these gaps, the platform can look ready while failing account
switching, leaving mixed packing partially committed, or changing shipment and
inventory state inconsistently under retries, cancellation, or stale data.

## Solution

Complete the revival through five narrow, verifiable slices:

1. Make development employee selection establish a real mobile session for the
   selected active employee, with independent client and server development
   gates.
2. Give mixed legacy/inventory packing one preflighted orchestration boundary so
   confirmation is all-or-nothing from the operator's perspective.
3. Run a reversible inventory-backed dispatch through warehouse preparation,
   assigned-driver work, trip start, proof completion, and exact allocation
   consumption in Expo Go.
4. Prove lifecycle failure behavior for shortages, stale manifests,
   cross-dispatch data, retries, cancellation, and physical-return policy.
5. Produce the device, reconciliation, rollback, and documentation evidence
   required for a controlled pilot decision.

The primary acceptance seam is one reversible local inventory-backed dispatch
journey exercised through the real Expo Go UI and protected application
contracts. State is verified at the dispatch, shipment-line, and stock-
allocation boundaries before and after each operator action. Focused contract
and domain tests support that seam for cases that are unsafe or impractical to
drive manually.

## User Stories

1. As a developer, I want to select any eligible development employee and enter
   the app as that employee, so that I can validate role- and assignment-specific
   behavior without knowing individual passwords.
2. As a security owner, I want development impersonation unavailable in preview
   and production, so that convenience tooling cannot become an authentication
   bypass.
3. As an active employee, I want a development session to reflect my real roles
   and permissions, so that test behavior matches the account being exercised.
4. As an inactive or access-revoked employee, I want development quick access to
   reject my account, so that test tooling preserves account eligibility rules.
5. As a driver, I want my assigned queue to contain only my dispatches, so that
   customer and operational information is not exposed across drivers.
6. As a warehouse operator, I want the packing screen to distinguish target,
   packed, and remaining quantities, so that an unpicked item never appears
   packed.
7. As a warehouse operator, I want packing controls to remain reachable above
   the persistent footer, so that I can complete work on supported phone and
   tablet layouts.
8. As a warehouse operator, I want one confirmation for a mixed dispatch, so
   that I do not need to understand separate legacy and inventory engines.
9. As a warehouse operator, I want the entire mixed packing request preflighted
   before writes, so that a shortage cannot leave only part of the dispatch
   packed.
10. As a warehouse operator, I want an actionable error when a mixed packing
    request cannot commit, so that I know what must be corrected.
11. As an inventory operator, I want exact approved quantities bound to one
    dispatch before picking, so that split deliveries cannot claim each other's
    stock.
12. As an inventory operator, I want oversized approved allocations split
    safely, so that only the current dispatch quantity moves through the
    lifecycle.
13. As a driver, I want Start Trip disabled until every required inventory-
    backed line is ready to load, so that the truck does not leave with
    incomplete material.
14. As a driver, I want Start Trip enabled immediately after the warehouse has
    picked the exact required quantity, so that verified work is not blocked by
    stale UI state.
15. As a driver, I want an explicit reason when a trip is not ready, so that I
    can contact the correct warehouse or office owner.
16. As a driver, I want the due date, customer stop, address readiness, item
    facts, and inventory readiness visible before departure, so that I can
    verify the load.
17. As a driver, I want completion proof to remain resumable after upload or
    network interruption, so that I do not create duplicate deliveries.
18. As a driver, I want the same completion request to replay success safely, so
    that retrying a timed-out request does not consume inventory twice.
19. As a fulfillment manager, I want completion to consume only picked
    allocations bound to the current dispatch, so that inventory evidence
    matches the physical trip.
20. As a fulfillment manager, I want shipment compatibility rows and inventory
    state to agree after completion, so that existing documents and reporting
    remain trustworthy.
21. As a fulfillment manager, I want stale manifest revisions to block start or
    completion, so that edited orders are reviewed before execution.
22. As a fulfillment manager, I want cross-dispatch allocation references
    rejected, so that one trip cannot move another trip's stock.
23. As a fulfillment manager, I want shortage and backorder states to remain
    non-destructive, so that failed preparation does not manufacture readiness.
24. As a dispatcher, I want cancelling unpicked work to release active
    reservations, so that available stock is not stranded.
25. As a warehouse manager, I want picked stock to require explicit physical-
    return confirmation before release, so that loaded material is not silently
    made available.
26. As an auditor, I want reconciliation to prove that delivered component
    quantity equals consumed dispatch-bound quantity, so that inventory drift is
    detectable.
27. As an auditor, I want completed dispatches to have no active reserved or
    picked allocations, so that terminal work cannot retain operational stock.
28. As a tester, I want a reversible local fixture with deterministic before and
    after snapshots, so that the full journey can be repeated without manual
    database repair.
29. As a tester, I want phone and tablet Expo Go proof, so that fixed footers,
    scrolling, modals, and touch targets work across the intended layouts.
30. As a tester, I want weak-network, background/restore, and completion retry
    checks, so that the field workflow behaves safely outside ideal conditions.
31. As a product owner, I want a client-ready recording and reconciliation
    report, so that the pilot decision is based on demonstrated behavior.
32. As an operator, I want a documented rollback switch and decision threshold,
    so that the pilot can stop without corrupting completed inventory history.
33. As a future engineer, I want current Brain records and tickets to agree with
    the actual implementation state, so that completed and remaining work are
    not confused.

## Implementation Decisions

- Keep ordinary password authentication unchanged. Development employee
  selection uses a separate mobile-session operation rather than copying an
  employee email into the password form.
- Enforce development quick access twice: the selector is compiled only into an
  Expo development runtime, and the session operation rejects requests unless
  the server process is running in development.
- Resolve the selected employee server-side from an opaque stable identity and
  apply the same active, non-deleted, non-revoked internal-account criteria used
  by ordinary mobile authentication.
- Return the ordinary mobile session shape after development selection. The
  rest of the app must not carry a special mock profile or bypass permission and
  assignment checks.
- Do not expose passwords, password hashes, master credentials, reusable email
  tokens, or privileged secrets through the employee-list contract.
- Keep the employee list minimal: stable identity, display name, email, and one
  role label for development selection only.
- Preserve the current canonical trip header and shipment compatibility rows
  during cutover. Inventory allocation remains the authority for stock
  readiness and lifecycle state.
- Replace client-sequenced mixed packing with one server-owned orchestration
  boundary. The operation validates the entire selection, manifest freshness,
  permissions, legacy eligibility, and inventory availability before any
  durable state change.
- Commit legacy packing compatibility and inventory reserve/pick effects in one
  transaction where their storage boundaries permit it. If an unavoidable
  external side effect exists, persist an idempotent checkpoint and expose a
  deterministic resume result instead of silently returning partial success.
- Preserve per-line execution mode. Inventory, legacy, and review-required lines
  remain explicit; missing inventory identity never becomes available stock.
- Treat packed quantity as completed packing evidence and target quantity as
  requested work. UI projections must never use one value for both meanings.
- Continue binding exact allocation quantities to one dispatch. Split an
  oversized approved allocation only under the guarded orchestration.
- Keep Start Trip server-authoritative. The client may present the reason, but it
  cannot override dispatch readiness with stale local state.
- Preserve request-scoped, resumable proof completion. Inventory consumption is
  part of canonical finalization and occurs only once for a successful request.
- Use the existing explicit physical-return confirmation policy for picked stock
  during cancellation. No closeout work may weaken that boundary.
- Keep the validation fixture local-only, dry-run-first, and reversible. A
  rollback restores captured allocation state and removes only records created
  for the fixture.
- Do not perform production mutation, production data synchronization, cohort
  enablement, or legacy removal as part of these tickets.
- Keep the approved near-black, charcoal, neutral-text, and green semantic theme
  centralized; closeout work must not introduce screen-specific palette forks.

## Testing Decisions

- The highest acceptance seam is the real Expo Go operator journey backed by a
  reversible local inventory dispatch. It verifies authentication, protected
  queue reads, warehouse packing, readiness, trip start, proof completion, and
  persisted inventory outcomes together.
- The journey records state snapshots before warehouse confirmation, after
  pick/readiness, after Start Trip, after completion, and after a retry of the
  same completion request.
- Good tests assert externally observable behavior and durable state, not helper
  names or internal call order.
- Authentication coverage proves development success for a selected active
  employee and rejection in non-development environments, for revoked/deleted
  accounts, and for malformed or unknown identities.
- Permission coverage proves unauthenticated rejection, assigned-driver success,
  cross-driver rejection, warehouse-operator scope, and manager scope.
- Packing coverage proves inventory-only, legacy-only, and mixed selections;
  shortage and stale-revision failures must leave both execution modes
  unchanged.
- Lifecycle coverage proves reserve, pick, start, consume, release, physical-
  return confirmation, cross-dispatch rejection, terminal-state rejection, and
  exact-quantity allocation splitting.
- Completion coverage proves successful first execution, same-request replay,
  competing-request conflict, resumed proof upload, and absence of duplicate
  shipment, allocation, payment-review, document, or activity effects.
- Reconciliation coverage proves no negative stock, no double consumption, no
  completed dispatch with active reserved/picked rows, and agreement between
  shipment quantities and inventory fulfillment.
- Mobile presentation coverage proves truthful packed progress, readiness copy,
  accessible controls, route/deep-link behavior, stale/offline action gating,
  keyboard safety, fixed-footer clearance, and theme tokens.
- Device evidence covers the supported Android phone viewport and a tablet or
  landscape-class viewport, including cold start, warm cache, refresh,
  background/restore, modal interaction, weak network, and retry.
- Existing work-queue, manifest-normalization, dispatch-permission,
  fulfillment-transition, proof-completion, preview-security, and theme tests
  are extended rather than duplicated behind new seams.

## Out of Scope

- Replacing the canonical trip or shipment compatibility models.
- Retiring legacy dispatch packing or historical shipment records.
- Broad inventory correctness repair unrelated to the selected dispatch.
- Production data backfill, production synchronization, or production fixture
  creation.
- Native modules that require a custom development client when Expo Go can
  exercise the required behavior.
- iOS rollout proof unless it is separately authorized.
- New routing, maps, navigation optimization, customer messaging, payment
  collection, or driver payroll features.
- A new theme or visual redesign beyond preserving the approved semantic dark
  identity and fixing closeout usability defects.
- Automatic release of picked stock without physical-return confirmation.

## Further Notes

- The warehouse portion of the local inventory fixture has already demonstrated
  a truthful transition from unpacked and inventory-review state to packed and
  ready-to-load state in Expo Go.
- That proof exposed the remaining account-selection defect before the assigned
  driver could start the trip: the selector changed the email but retained a
  password belonging to another development account.
- The implementation frontier contains two tickets that can start immediately:
  genuine development employee login and atomic mixed packing.
- Inventory completion evidence must be captured before any claim that the
  driver-platform revival or inventory cutover is complete.
- Child tickets are published under this local tracker in dependency order and
  carry `ready-for-agent` status.

