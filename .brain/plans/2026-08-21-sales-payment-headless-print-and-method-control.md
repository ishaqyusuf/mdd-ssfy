# Sales Payment Headless Print And Method Control

## Objective

Make post-payment printing reliable and contained inside the Make Payment
experience: after a successful payment, show `Preparing to print` in the same
payment screen, invoke the existing hidden same-page sales print viewer, and
never open a placeholder or document tab. Replace the current separate payment
method, check number, and terminal selectors with one cohesive, accessible
`SalesPaymentMethodControl` whose visible form adapts to the selected method.

## Implementation Status

Implemented on 2026-08-21. The focused payment/print suite passes 69 tests and
169 assertions; a focused TypeScript program check passes for all eight changed
implementation files, and `git diff --check` passes. Authenticated browser QA
and a disposable real-payment print were not run because they require explicit
authorization under this plan.

## Assumptions

- “Headless printing” means the existing hidden same-page viewer prepares the
  document and invokes the browser/OS print dialog without navigating or opening
  another tab. It does not mean silent physical printing without a print dialog;
  that would require a kiosk/native print agent and is outside this plan.
- Invoice plus packing slip remains one combined `invoice,packing-slip` request
  and one print-dialog invocation.
- Printing starts only after the payment is durably successful. A print failure
  must never roll back, retry, or duplicate the payment.
- If neither print option is selected, the existing payment-success close flow
  remains fast and no print state is shown.
- The payment date control remains immediately before the method control.
- Terminal availability continues to come from
  `customers.getCustomerPayPortal`; the server remains authoritative and
  revalidates terminal availability when a terminal payment is submitted.
- No database schema, migration, permission, payment API input, or Square
  settlement contract change is expected.

## Detailed Execution Plan

### 1. Lock the interaction and lifecycle contract

1. Define the post-payment screen states as:
   - `form`: editable payment form.
   - Existing payment states: `applying`, `creating`, `awaiting`, `recording`.
   - `printing`: payment succeeded; a selected document is being prepared in
     the hidden viewer.
   - `success`: payment succeeded and either printing was not requested or the
     print dialog was invoked.
   - `print_failed`: payment succeeded, but document preparation or print-dialog
     invocation failed; only print retry/close actions are available.
   - `failed`: the payment itself failed; returning to the form is safe.
2. Use this screen copy:
   - Printing title: `Preparing to print`.
   - Invoice description: `Payment recorded. Preparing the invoice.`
   - Packing description: `Payment recorded. Preparing the packing slip.`
   - Combined description: `Payment recorded. Preparing the invoice and packing slip.`
   - Print success: `Payment complete` with `The print dialog is ready.`
   - Print failure: `Payment complete` with
     `The payment was recorded, but printing needs attention.`
3. Keep the payment screen open throughout `printing`. Start its auto-close
   timer only after print readiness, never when the payment mutation first
   reports success.
4. In `print_failed`, provide `Retry print` and `Close`; do not show `Back to
   payment form`, because reapplying could duplicate a successful payment.

Dependency: none. This is the acceptance contract for later phases.

Validation: source-contract tests for every state/title/action and a review of
the direct and terminal success paths.

### 2. Make hidden printing awaitable without changing existing callers

1. Extend `SalesPrintControllerOptions` with an opt-in completion mode such as
   `awaitReady?: boolean` and optional stage callback. Existing callers retain
   their current fire-after-mount behavior.
2. When `awaitReady` is true, wrap the existing print lifecycle in a promise
   that resolves only from `onPrintReady` / `print-dialog-called` and rejects
   from `onPrintError`, access failure, or the existing 20-second timeout.
3. Keep `openSalesPrintDocument` on its current hidden-viewer branch by passing:
   - `openInNewTab: false`.
   - No `targetWindow`.
   - No call to `reserveSalesPrintWindow`.
4. Ensure all completion paths settle exactly once and clean up the hidden host
   through the existing viewer cleanup contract.
5. For Make Payment, call the controller with
   `{ showToast: false, throwOnError: true, awaitReady: true }`; the payment
   screen owns feedback, so a second global print toast must not compete with it.
6. Preserve `Re-print`, snapshot regeneration, and visible-tab behavior for
   other sales-print callers.

Dependency: Phase 1.

Affected areas:

- `apps/dashboard/src/modules/sales-print/application/use-sales-print-controller.tsx`
- Focused controller/service tests; `sales-print-service.ts` should change only
  if the completion promise cannot be implemented cleanly at controller level.

Validation: tests proving hidden viewer use, no `window.open`, readiness wait,
timeout/error rejection, exactly-once settlement, and unchanged default caller
behavior.

### 3. Replace popup-based post-payment orchestration

1. Replace `PendingPrintRequest.windowRef` with an immutable request containing
   only cloned `salesIds` and normalized print `mode`.
2. At Apply Payment submission, capture the request before mutable form state
   can reset. Do not reserve a window or start printing before payment success.
3. On confirmed direct or terminal payment success:
   - Atomically take the captured request once.
   - If none exists, enter `success` and use the normal close timer.
   - If it exists, enter `printing` and dispatch it through the awaitable hidden
     print path.
4. On print readiness, enter `success`, show the print-ready copy briefly, then
   close the payment surface.
5. On print failure, retain an immutable retry request and enter `print_failed`.
   Retrying must print only; it must never call `applyPayment` again.
6. On payment failure or terminal cancellation, discard the captured print
   request without any browser-window cleanup because no window exists.
7. Remove the popup-blocked branch, `Open print` recovery copy, and reserved-tab
   helpers from the Make Payment orchestration. Retain the shared visible-tab
   print capability for unrelated callers.
8. Keep `onPaymentApplied` and sales query invalidation tied to payment success,
   not print success.

Dependency: Phase 2.

Affected areas:

- `apps/dashboard/src/components/widgets/sales-payment-processor/post-payment-print.ts`
- `apps/dashboard/src/components/widgets/sales-payment-processor/post-payment-print.test.ts`
- `apps/dashboard/src/components/widgets/sales-payment-processor/types.ts`
- `apps/dashboard/src/components/widgets/sales-payment-processor/sales-payment-processor.tsx`
- `apps/dashboard/src/components/widgets/sales-payment-processor/payment-status-overlay.tsx`

Validation: direct, terminal, no-print, invoice, packing, combined, cancellation,
payment-error, print-error, retry, rerender, and double-completion tests.

### 4. Build `SalesPaymentMethodControl`

Create one controlled, payment-domain component under the payment processor
folder. Keep React Hook Form and mutation orchestration in the parent; the new
component owns only method/terminal presentation and interactions.

#### Visual states

| State | Visible control |
| --- | --- |
| Credit Card, Cash, Zelle, Wire, Payment Link, Wallet | One full-width select-shaped menu button showing the selected method. |
| Check | One `InputGroup`: left addon menu button labeled `Check` with chevron; right input placeholder `Enter check number`. |
| Terminal selected | Return to the normal single-button state, but show the selected terminal label, for example `Terminal 2443`, instead of `Terminal Payment`. |
| Terminal unavailable | Terminal submenu row shows `0 available`, is not selectable, and the existing terminal load/availability error appears below the control. |

1. Use the existing `InputGroup`, `InputGroup.Addon`, and
   `InputGroup.Button` primitives for Check so the menu trigger and input share
   one border, height, focus ring, and error state.
2. Use `DropdownMenu` for the method menu. A Radix Select cannot represent the
   required nested Terminal chooser; style the menu trigger to retain the
   current select control's visual language.
3. Render Terminal as `DropdownMenu.Sub`:
   - The root row displays `Terminal` and a compact `<n> available` count.
   - Pointer hover opens the submenu on desktop.
   - Arrow Right/Left and Enter/Space work for keyboard users.
   - Tap opens/selects on touch devices; the behavior must not be hover-only.
4. In the submenu, list available terminals first. Show offline terminals only
   as disabled rows with an `Offline` suffix or status. Mark the current device
   with the menu item indicator.
5. Selecting a terminal performs one atomic callback carrying method,
   `deviceId`, and `deviceName`. Never create an intermediate valid-looking
   `paymentMethod=terminal` state without a device.
6. Selecting a non-terminal method clears device identity, terminal session,
   terminal errors, and active terminal-flow state in the parent.
7. Preserve the typed check number while switching methods within the same
   unsent form, but sanitize submission so `checkNo` is sent only when the
   effective method is Check. Reset clears it after completion/new context.
8. Use the current operator's available `lastTerminalId` as the preferred
   terminal default; fall back to the only available terminal. If multiple are
   available and no preferred terminal resolves, do not default to a device-less
   Terminal selection.
9. Keep method-control height at 36px, full available width, and the existing
   220ms reduced-motion-aware layout transition when switching between the
   single button and Check input group.

#### Controlled component contract

The component should accept a narrow contract equivalent to:

```ts
type SalesPaymentMethodControlProps = {
  method: SalesPaymentMethods;
  checkNumber: string;
  deviceId?: string | null;
  methods: PaymentMethodOption[];
  terminals: PaymentTerminalOption[];
  disabled?: boolean;
  invalid?: boolean;
  error?: string | null;
  onMethodChange(method: SalesPaymentMethods): void;
  onCheckNumberChange(value: string): void;
  onTerminalChange(terminal: PaymentTerminalOption): void;
  onCheckNumberBlur?(): void;
};
```

Use the package's real inferred terminal/method types during implementation;
do not duplicate API response types unnecessarily.

Dependency: Phase 1; can be implemented independently of Phases 2–3.

Validation: component tests for all visual states, hover/keyboard/touch submenu
access, terminal count/status, selected-terminal label, check input validation,
disabled/wallet-only behavior, focus order, and reduced motion.

### 5. Integrate form state and remove separate controls

1. Replace the current Payment Method `Select`, separate Check input row, and
   separate Terminal selector row with `SalesPaymentMethodControl`.
2. Keep `PaymentDateControl` immediately before the new component in the fixed
   action row.
3. Route field behavior through explicit parent handlers:
   - `selectMethod` clears irrelevant errors/session state.
   - `selectTerminal` sets `paymentMethod`, `deviceId`, and `deviceName`
     together and clears terminal field errors.
   - Check input updates `checkNo` and exposes the existing required-field
     error through the shared group border and message.
4. Update `selectedPaymentMethodLabel` so Terminal resolves to the selected
   device label in the payment breakdown and success overlay.
5. Sanitize the mutation payload: only Check sends trimmed `checkNo`; only
   Terminal sends `deviceId`/`deviceName`/terminal session data.
6. Preserve wallet-only behavior by disabling the method trigger and displaying
   Wallet without exposing irrelevant Check/Terminal inputs.

Dependency: Phase 4.

Validation: form schema tests plus source/component integration tests proving
no second terminal selector or second check row remains.

### 6. End-to-end validation matrix

1. Run focused tests for:
   - print frame and sales print service/controller;
   - post-payment orchestration;
   - payment method control;
   - payment processor form schema/utilities;
   - direct and terminal payment processor regressions.
2. Run targeted Biome, `@gnd/sales` typecheck, and filtered API/Dashboard
   typecheck checks for touched files. Document unrelated repository baseline
   diagnostics rather than treating them as feature failures.
3. Authenticated browser QA without submitting a payment:
   - Normal-method menu layout.
   - Check group/input and method switching.
   - Terminal hover submenu, keyboard navigation, touch-equivalent selection,
     count, offline rows, and selected device label.
   - Payment date remains immediately left of the adaptive control.
4. Use mocked print completion/error integration to verify the in-screen
   `Preparing to print`, success, failure, retry, and no-new-tab behavior.
5. Perform one real local disposable payment/print acceptance only with explicit
   user approval at execution time. Assert one payment application, one hidden
   print host, one print-dialog call, zero new tabs, and safe retry after a
   forced print failure.
6. Repeat the UI matrix in the sheet and legacy dialog presentations and at
   narrow/desktop widths.

Dependency: Phases 2–5.

Release gate: do not remove the old post-payment recovery tests until the new
hidden-viewer failure/retry and exactly-once payment assertions pass.

### 7. Documentation and rollout

1. Update the Sales Payment, Sales Overview, Sales PDF, API contract (only if a
   public contract changes), and Progress Brain files with the final behavior
   and validation evidence.
2. Supersede the July reserved-tab post-payment bug record with a note linking
   to the hidden-viewer implementation; retain it as historical context.
3. No ADR is expected because the plan adopts the already-established hidden
   sales-print architecture. Add one only if implementation introduces a native
   silent-print agent or changes document authority.

Dependency: completed validation.

## Skills List Used

- `plan` — structured the request into executable phases with dependencies,
  validation gates, affected areas, and risks.
- `agency-design` / `UI Designer` — defined the adaptive control's visual,
  interaction, responsive, motion, and WCAG-AA accessibility contract.
- `Project Brain integration` — aligned the plan with the existing payment,
  Sales Overview, hidden sales-print viewer, and July post-payment history.

## Risks and Mitigations

- **The screen reports success before printing actually begins.** Add an
  opt-in await-ready controller contract and drive the screen from readiness or
  error callbacks, not from hidden-viewer mount.
- **The payment screen closes while the hidden viewer is still loading.** Do
  not start the close timer until the print lifecycle is terminal.
- **A print retry duplicates the payment.** Store a print-only retry request and
  expose no route from `print_failed` back to Apply Payment.
- **Rerenders dispatch printing twice.** Atomically take the immutable request
  once and test duplicate completion events.
- **Popup logic survives in a fallback branch.** Explicitly pass no target
  window and assert that `window.open`/`openLink` are not called.
- **A browser blocks programmatic printing.** Surface `print_failed` with a
  user-gesture `Retry print`; retain manual sale-menu print as the final
  recovery path without changing payment status.
- **Terminal is inaccessible to keyboard or touch users.** Use Radix submenu
  semantics with pointer, arrow-key, Enter/Space, and tap acceptance tests.
- **Terminal selection becomes temporarily invalid.** Commit method and device
  identity atomically from a submenu leaf; never select the submenu root.
- **Offline or stale hardware is shown as usable.** Display server-observed
  status, disable unavailable leaves, and preserve submission-time server
  readiness validation.
- **Stale Check or Terminal fields leak into another method.** Preserve Check
  text only as local draft convenience, but sanitize the mutation payload and
  clear terminal state on every non-terminal selection.
- **The adaptive group causes layout jumps.** Keep one fixed-height slot, use
  layout animation only for width/content changes, and respect reduced motion.
