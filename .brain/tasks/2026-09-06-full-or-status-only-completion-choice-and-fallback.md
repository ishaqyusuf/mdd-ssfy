# Task: Full-workflow or status-only completion choice and fallback

## Status
Complete — 12/12; implementation, review, automated verification, authenticated browser QA, and Production promotion complete

## Canonical Ticket
[Scratch ticket](../../.scratch/sales-pipeline-lifecycle-implementation/issues/17-full-or-status-only-completion-choice-and-fallback.md)

## Created Date
2026-09-07

## Last Updated
2026-09-07

## Production Evidence

- READY deployment `dpl_J8rgFzwLZUGYirwPMcWbzCgXeJKH` is aliased to
  `https://www.gndprodesk.com`.
- The first build failed closed before promotion on a build-time Zod
  `.omit()` incompatibility. The public status-only input now derives directly
  from its strict base schema, after which the focused matrix, Sales/API
  typechecks, and Vercel production build passed.
- Authenticated QA found and corrected a remaining exception-path distinction:
  unavailable/conflicting sales now also open the Full-workflow-default mode
  selector, while administrative provenance is retained only for a deliberate
  Status-only choice. The matrix now passes 109 tests / 380 assertions.
- Corrected deployment `dpl_8fJCigQxVcTPT6JWrFQzyvuts5Pq` passed a clean
  remote build, is READY, and now owns the Production alias.
- Production browser QA confirms both milestone actions, Full workflow default,
  visible Status only, shared Calendar, required reason, disabled submission
  before reason, and Escape cancellation without mutation. Local orders
  `09586DB` and `09584DB` prove safe follow-up cancellation and persisted
  failed-workflow-to-status-only fallback respectively.
- Exact 390×844 QA found and fixed a vertical-overflow defect in the expanded
  Status-only form. Both completion dialogs now use a dynamic-viewport maximum
  height with internal vertical scrolling. Mobile and 768×1024 tablet checks
  have no horizontal overflow; Calendar, Tab focus order, and Escape behavior
  pass.
- Final READY Production deployment `dpl_CTJRtcF9uerErnk1k2bM1Qk7V8Ua`
  completed a clean remote Next.js build and owns `https://www.gndprodesk.com`.
  No schema change or DB push was required.
