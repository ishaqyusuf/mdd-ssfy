# Sales Document Readiness — 20 Order Audit

## Run

- Generated: 2026-09-01T21:53:25.327Z
- Dataset: local MySQL `gnd-prisma2`
- Mode: read-only
- Command: `bun run sales-document:readiness-audit --limit 20`
- Evaluated: 20 historical Sales orders
- Reference included: database id `23288`, order `08574PC`

## Result

| Classification | Orders |
| --- | ---: |
| Ready | 10 |
| Repair required, zero subtotal delta | 10 |
| Financial review | 0 |
| Manual review | 0 |

Every evaluated order had candidate subtotal, tax, grand total, and amount due equal to its saved values. The audit did not write or repair any record.

`08574PC` classified as `repair_required` with five `sync_door_group_totals` operations. Saved and candidate subtotal were both `$9,335.27`; subtotal, tax, grand-total, and amount-due differences were all `$0.00`. The proposed operation does not write the saved `$653.47` tax, `$9,988.74` grand total, payment records, or balance.

## Order detail

| Order | DB id | Status | Operations | Saved subtotal | Candidate subtotal | Difference |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| 08574PC | 23288 | repair_required | 5 | $9,335.27 | $9,335.27 | $0.00 |
| 09539AD-hx01 | 26849 | ready | 0 | $2,155.90 | $2,155.90 | $0.00 |
| 09539AD | 26848 | ready | 0 | $2,155.90 | $2,155.90 | $0.00 |
| 09538AD-hx02 | 26847 | repair_required | 1 | $1,460.76 | $1,460.76 | $0.00 |
| 09538AD-hx01 | 26846 | repair_required | 1 | $1,280.12 | $1,280.12 | $0.00 |
| 09538AD | 26845 | ready | 0 | $1,460.76 | $1,460.76 | $0.00 |
| 03600DB-hx03 | 26844 | repair_required | 1 | $717.00 | $717.00 | $0.00 |
| 03600DB-hx02 | 26843 | repair_required | 1 | $848.00 | $848.00 | $0.00 |
| 03600DB-hx01 | 26842 | repair_required | 1 | $848.00 | $848.00 | $0.00 |
| 03599DB-hx03 | 26840 | repair_required | 2 | $1,225.00 | $1,225.00 | $0.00 |
| 03599DB-hx02 | 26839 | repair_required | 2 | $1,225.00 | $1,225.00 | $0.00 |
| 03600DB | 26841 | ready | 0 | $717.00 | $717.00 | $0.00 |
| 03599DB-hx01 | 26838 | repair_required | 2 | $1,285.00 | $1,285.00 | $0.00 |
| 09537AD-hx02 | 26836 | ready | 0 | $14.77 | $14.77 | $0.00 |
| 09537AD-hx01 | 26835 | ready | 0 | $14.77 | $14.77 | $0.00 |
| 09537AD | 26834 | ready | 0 | $14.77 | $14.77 | $0.00 |
| 03599DB | 26837 | ready | 0 | $1,225.00 | $1,225.00 | $0.00 |
| 03523PC-hx13 | 26833 | repair_required | 6 | $4,417.75 | $4,417.75 | $0.00 |
| 09536DB-hx01 | 26832 | ready | 0 | $13.87 | $13.87 | $0.00 |
| 09536DB | 26831 | ready | 0 | $13.87 | $13.87 | $0.00 |

## Interpretation

The sample confirms the motivating failure is structural rather than a price change. It also shows that copied history records are a frequent source of stale non-zero parent summaries; those are safe candidates for the same confirmation flow only because the active rows reproduce the saved subtotal exactly. No bulk repair is authorized or performed by this audit.
