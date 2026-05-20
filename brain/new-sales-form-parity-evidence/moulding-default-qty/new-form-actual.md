# New Form Actual (Code Evidence)

Fresh selected moulding rows now default to `qty: 1` in the shared workflow
calculator. Persisted rows keep their stored quantity, so reopening or editing
an existing moulding group does not overwrite user-entered quantities.

Anchor:
- `packages/sales/src/sales-form/domain/workflow-calculators.ts`

Current parity status:
- Package proof passing for fresh selection and reselection behavior.
- Browser proof is still pending behind the local auth/session gate.
