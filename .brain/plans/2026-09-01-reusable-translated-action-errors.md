# Reusable Translated Action Errors

## Objective

Extend the existing `@gnd/errors` classified error contract into a consistent,
translated, insertable error experience for Sales mutations in dialogs, sheets,
forms, and pages. Users should understand what failed, whether work started,
what they can do next, and which safe reference to give a developer—without
seeing raw exceptions or receiving only “Something went wrong.”

## Assumptions

- `@gnd/errors` remains the runtime-neutral source of error codes,
  classifications, retryability, safe public messages, and reference IDs.
- Product UI composition belongs in the dashboard app; `@gnd/ui` continues to
  provide product-agnostic Alert and interaction primitives.
- The application does not yet have a general dashboard translation runtime.
  Translation infrastructure and locale selection must therefore precede broad
  message-key rollout rather than embedding a second ad hoc translator in Sales.
- The server owns classification and diagnostic correlation. The client owns
  placement, translated presentation, focus, retry affordances, and operation
  context.
- An error view accepts an error or normalized presentation, not an entire
  mutation object. This keeps it usable with tRPC, server actions, forms, and
  background-job outcomes.

## Detailed Execution Plan

### 1. Establish the public error vocabulary

- Inventory Sales mutations, server actions, and Trigger tasks and group their
  failures into authentication, permission, validation/precondition, conflict,
  not found, network/timeout, provider, rate limit, and unexpected categories.
- Add stable domain codes where category-only copy is insufficient, beginning
  with production material review pending, fulfillment already completed,
  inventory unavailable, stale order state, and task start failure.
- Evolve `PublicError` additively with safe optional fields: `messageKey`,
  `messageParams`, `stage`, and `operation`. Keep `code`, `referenceId`,
  `retryable`, and `action` mandatory or backward compatible.
- Define stages as `preflight`, `dependency_resolution`, `job_submission`, and
  `background_execution`. Stage is how the UI distinguishes “the job did not
  start” from “the job started and later failed.”
- Never transport stack traces, SQL/provider text, customer data, or mutation
  payloads. Unknown failures retain an operation-specific fallback and a
  reference ID.

### 2. Add translation infrastructure and catalogs

- Select one dashboard-wide i18n runtime that supports server and client React,
  typed message keys, interpolation, pluralization, and locale fallback.
- Store generic error titles/actions under an errors catalog and domain copy
  under Sales operation keys. Example keys include
  `errors.permission_denied.title`, `sales.fulfillment.material_review_pending`,
  and `sales.fulfillment.job_not_started`.
- Map the server's stable `messageKey` and safe parameters to the active locale.
  Fall back in order to the English catalog, the server's safe `message`, then
  the classified unexpected-error message. Missing translations are reported
  in development and CI, never rendered as raw keys in production.
- Translate titles, descriptions, recovery actions, stage text, reference
  labels, and accessibility announcements together.

### 3. Build reusable presentation adapters and UI

- Extend `getErrorPresentation` or add a dashboard adapter that normalizes any
  tRPC error, server-action error, task result, or unknown exception into:
  `title`, `description`, `reference`, `severity`, `retryable`, `action`,
  `stage`, and optional field issues.
- Add an app-local `ActionError` component composed from `@gnd/ui/alert`.
  It should accept `error?: unknown`, `presentation?`, `operation`, `stage`,
  `onRetry`, `onRefresh`, `onSignIn`, and `onDismiss`. It must not know about a
  specific mutation library.
- Add a small `useMutationErrorPresentation` adapter for convenience. Callers
  may pass `mutation.error` to the hook and the normalized presentation to the
  component; forms can use the same component with server-action state.
- Support compact inline and full panel variants so the same behavior fits
  dialogs, sheets, forms, and page boundaries. Render near the failed action,
  preserve entered values and open surfaces, move focus to the alert when
  appropriate, and announce changes with accessible live-region semantics.
- Make toast notification optional secondary feedback. The durable inline
  message is authoritative and remains until retry, dismissal, or success.

### 4. Standardize recovery guidance

- Permission: explain that the account cannot perform the named action and
  suggest contacting an administrator; do not offer a blind retry.
- Validation/precondition: explain the business blocker and link or focus the
  field/review that must be resolved.
- Conflict/stale state: ask the user to refresh the order, then retry against
  current data.
- Network, provider, or transaction timeout: preserve the form/modal and offer
  retry when the operation is idempotent.
- Job submission failure: state that no job started and retrying is safe.
- Background execution failure: state that a job did start, show its terminal
  status/reference, and avoid a duplicate retry unless its task contract is
  idempotent.
- Unexpected: name the attempted operation, give a reference ID, and offer the
  safest supported action without exposing technical details.

### 5. Harden server and job boundaries

- Replace raw Sales boundary errors with `AppError` codes and safe domain copy;
  retain the original exception as `cause` for diagnostics.
- Ensure tRPC and server-action boundaries serialize the same `appError`
  envelope. Preserve the reference ID across classification, API transport,
  Sentry, task triggering, and task result storage.
- Define a typed task-failure result or durable failure ledger for background
  Sales jobs. Include safe code, stage, retryability, operation, order/task ID,
  and reference—not raw worker output.
- Tag observability with operation, stage, code, task run ID, and reference so a
  developer can search the exact failure the user reports.

### 6. Roll out through Sales in controlled slices

1. Use one-click Production Completed/Fulfilled as the pilot and replace its
   local Alert assembly with `ActionError` once the reusable API exists.
2. Adopt it in Sales create/edit forms, payment actions, assignment dialogs,
   cancellation dialogs, dispatch sheets, and inventory/material review flows.
3. Add background-task terminal failures to task/job surfaces and link the same
   reference shown in the initiating modal.
4. Search for raw `error.message` rendering and generic destructive toasts in
   Sales, migrate each boundary, and add an adoption test or lint rule.
5. Expand to other modules only after the Sales catalog, telemetry, and support
   workflow are stable.

### 7. Verification and acceptance criteria

- Unit-test every code/stage/action mapping, safe fallback, locale fallback,
  parameter interpolation, and reference preservation.
- Component-test modal, sheet, form, and page variants for focus, live-region
  announcements, retry visibility, dismissal, and retained user input.
- Contract-test tRPC, server actions, and Trigger task failure serialization.
- Add Sales end-to-end cases for permission denied, material review pending,
  stale conflict, timeout before job start, and terminal background failure.
- CI must fail for missing required translation keys or attempts to render raw
  exception messages in migrated Sales surfaces.
- Acceptance requires: a user can state the failed action and next step; support
  can correlate the visible reference; the UI correctly states whether a job
  started; and no technical or sensitive diagnostic reaches the browser.

## Skills List Used

- `diagnosing-bugs`: isolated synchronous resolver, transactional packing, and
  cross-order projection failures with regression tests before repair.
- `midday`: kept Sales domain logic in shared packages and dashboard composition
  at the app boundary.
- `vercel-react-best-practices`: kept error state local to the action surface and
  avoided coupling reusable UI to the mutation client.
- `agency-engineering` with the frontend developer specialist: shaped the
  insertable component API, accessibility requirements, and rollout sequence.
- `plan`: structured the implementation plan with explicit assumptions, phases,
  acceptance criteria, and risks.

## Risks and Mitigations

- Adding message keys can break older clients. Make fields additive and retain
  the current safe `message` until all clients support keys.
- Server and client translations can drift. Generate typed keys from one catalog
  and validate coverage in CI.
- Over-specific domain copy can expose data. Allow only reviewed parameters and
  keep sensitive diagnostics in `cause`/observability.
- Retrying can duplicate work. Show retry only when the boundary marks the
  operation retryable and its idempotency contract is verified.
- A generic component can become a policy dumping ground. Keep classification
  in `@gnd/errors`, domain mapping in Sales adapters/catalogs, and rendering in
  the dashboard component.
- Legacy cross-order submission links can distort other persisted statistics.
  Add a read-only reconciliation report, quantify mismatches, and approve a
  separately audited backfill before mutating historical ownership.
