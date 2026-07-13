# New Sales Form Production Cutover Handoff

Date: 2026-03-10  
Scope: old sales form vs `new-sales-form` parity closure and production rollout.

## 1. Readiness Summary

- Parity matrix status: closed for scoped rows (`PASS` across matrix).
- Current regression gate: `54 pass, 0 fail` (sales-form package domain/costing + API parity tests).
- Canonical logic location: `packages/sales/src/sales-form/*`.
- UI adapters: `apps/www/src/components/forms/new-sales-form/*`.
- API persistence/recalc: `apps/api/src/db/queries/new-sales-form.ts`.

## 2. Pre-Production Risk Checks

1. Data integrity checks (staging)
- Save/get for mixed orders (door + service + moulding + shelf) must preserve:
  - `formSteps`
  - `shelfItems`
  - `housePackageTool` and `doors`
  - `meta.serviceRows`
  - `meta.mouldingRows`
- Version conflict behavior must reject stale saves.

2. Financial checks (golden scenarios)
- Validate totals for:
  - Discount + percentage discount
  - Taxable/non-taxable custom costs
  - Credit card surcharge path
  - Service taxability toggle path
  - Derived labor from grouped rows
- Confirm no drift between UI summary and API summary on same payload.

3. Workflow checks (UI behavior)
- Root route composition and hidden-step auto-advance.
- Multi-select (door/moulding/weatherstrip) toggle behavior.
- HPT supplier-size pricing and route-config behavior (`noHandle`, `hasSwing`).
- Service remove-to-zero and shelf row recalculation.

4. Operational checks
- Autosave latency and conflict UX on slow network.
- Form load/save under realistic order sizes.
- Error-path UX (network failure, conflict, invalid payload).

## 3. Rollout Plan

1. Stage and verify
- Deploy to staging.
- Execute golden scenario checklist (finance + grouped workflows + routing).
- Compare 10-20 real historical orders: old-form vs new-form outputs.

2. Controlled production launch
- Gate by feature flag (org/site or role-based).
- Start with internal/super-admin users.
- Expand to pilot group after 24-48h stable monitoring.

3. Full enablement
- Enable for all target users once:
  - no high-severity defects
  - no summary drift incidents
  - no persistence integrity issues

4. Post-launch stabilization window
- Keep old form accessible behind admin override during stabilization.
- Monitor daily for first 7 days, then weekly.

## 4. Monitoring and Alerting

Track these signals after launch:
- Save failures rate
- Version conflict rate
- Average save latency
- API recalc errors
- Manual finance corrections requested by users
- Support tickets tagged `new-sales-form`

Trigger escalation if any threshold breaches:
- Error rate spikes above baseline
- Repeated summary mismatch reports
- Data integrity mismatch in persisted grouped rows

## 5. Rollback Plan

1. Immediate containment
- Disable new form feature flag.
- Route users back to old form.

2. Data safety
- Keep created/edited records; do not delete.
- Snapshot affected sales IDs and timestamps for audit.

3. Incident triage
- Classify issue type:
  - pricing drift
  - persistence mismatch
  - routing/step behavior
  - UI interaction defect
- Patch in `packages/sales` first; keep app-layer fixes adapter-focused.

4. Re-enable criteria
- Add regression test reproducing incident.
- Green gate on full test bundle.
- Re-run staging golden scenarios for affected flows.

## 6. Immediate Next Actions

1. Add a one-click staging checklist runbook for QA/ops.
2. Implement/confirm feature-flag switch for new form exposure.
3. Schedule pilot rollout window with finance + sales operations sign-off.
4. Define on-call owner for first-week stabilization.
