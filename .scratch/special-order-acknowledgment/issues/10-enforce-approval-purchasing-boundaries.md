# 10 — Enforce Approval At Purchasing Boundaries

**What to build:** Introduce one server-authoritative Special Order enforcement contract and use it across every purchasing path so the configured mode consistently warns or blocks new procurement commitments while preserving safe recovery operations.

**Blocked by:** 01 — Special Order Declaration And Lifecycle Foundation; 02 — Super Admin Policy And Sales Settings; 04 — Approve With Acknowledgment And Signature.

**Status:** complete

- [x] One shared domain decision evaluates declaration, current revision, Current Approval, enforcement mode, and purchasing operation category.
- [x] Warning Only permits purchasing while returning consistent warning metadata and recording deduplicated would-block observability.
- [x] Block Purchasing & Production and Block All Operations reject new purchasing commitments for governed orders without Current Approval.
- [x] Current Approval, Not Required, and legacy/unmanaged orders continue through purchasing when other permissions and business rules allow.
- [x] Viewing, editing, cancellation, release, rollback, reconciliation, error recovery, and recording receipt of goods already ordered remain available.
- [x] Every authoritative manual, automated, batch, and background purchasing entry point invokes the same enforcement contract.
- [x] Blocked callers receive a stable approval-required result containing safe order identity, state, active mode, and recommended Sales action.
- [x] UI affordances explain warnings and blocks, but direct API/job invocation cannot bypass enforcement.
- [x] Existing operational permissions remain required and there is no employee override of the configured policy.
- [x] Matrix tests cover every purchasing entry point, all three modes, all approval states, legacy compatibility, exceptions, idempotent observability, and bypass attempts.

## Implementation progress (2026-08-13)

- The shared server decision and purchasing commitment gates are implemented with mode/state/legacy/exception tests, deduplicated telemetry, and a passing entry-point source contract.
- Final acceptance completed direct-bypass and purchasing UI checks.
