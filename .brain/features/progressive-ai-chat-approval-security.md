# Progressive AI Chat Approval Security

## Status

Implemented on 2026-09-13 by T17.

## Behavior

- Read and draft tools may execute directly after current actor, scope, row, and field authorization.
- Artifact, write, external-send, and destructive tools require an expiring server-created proposal and an explicit browser confirmation.
- The model can discover and execute only direct tools. A trusted read result may emit a strictly validated UI action that asks the server to create a proposal; approval tokens never enter model context or persisted chat parts.
- The confirmation receipt shows the registered action title, effect, exact validated parameters, server-derived change summary, and target revision.
- Approval rechecks the current actor, business preflight, and target revision before atomically claiming the proposal. Document handlers receive the approved revision instead of any caller-supplied replacement.
- Proposal and parent-run states change in one transaction. Known handler envelopes are classified as succeeded, conflict, denied, or failed; thrown or abandoned executions become `unknown` and are never automatically repeated.
- Replays return the persisted outcome only after current authorization and row visibility pass again. Revoked users receive status metadata without the protected review or result.
- Client request identity is bound to the exact proposal fingerprint. Reusing a request UUID with different tool input fails as a conflict.

## User Experience

- PDF status results expose a trusted `Generate PDF` action when no current artifact exists and a revision-bound `Cancel PDF generation` action while a queued or running job remains cancellable.
- Selecting the action opens a review dialog with Decline and Confirm controls.
- Saved write/action recipes use the same exact-review contract and always create a fresh proposal.
- The development-only Assistant preview demonstrates the flow with synthetic data and performs no live generation.

## Validation

- Full Assistant API/dashboard matrix: 242 tests, 1,018 assertions.
- Focused formatter/static checks pass for all T17 files.
- API typecheck reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` nullability error.
- Dashboard typecheck completes with the larger heap and reports the existing repository-wide baseline; filtered output contains no touched Assistant file diagnostic.
- The additive migration was generated but could not be applied because the configured local MySQL endpoint at `127.0.0.1:3307` was unreachable from Prisma.
- Authenticated in-app browser verification used the development-only synthetic preview and captured the exact review dialog without generating a PDF or invoking a provider.
