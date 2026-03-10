# New Form Actual (Code Evidence)

State resilience is now partially implemented in `new-sales-form`:
- autosave default enabled (`editor.autosaveEnabled: true`)
- local recovery snapshot persisted to `localStorage`
- restore/dismiss banner shown when local snapshot differs from server payload

Anchors:
- `apps/www/src/components/forms/new-sales-form/store.ts`
- `apps/www/src/components/forms/new-sales-form/local-recovery.ts`
- `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`

Current parity status:
- Local recovery path exists and prevents silent state loss on refresh/idle reload.
- Remaining validation still needed: long-idle runtime repro with network disruption and restore consistency checks.
