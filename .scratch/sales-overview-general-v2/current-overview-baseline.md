# Sales Overview General V2 — Current Endpoint Baseline

Date: 2026-08-21

## Method

- Read-only calls to the canonical `getSaleOverview` query against the local
  `gnd-mysql` container.
- One warm-up call followed by seven measured warm calls per order.
- Prisma query events counted database operations.
- `JSON.stringify` byte length measured the returned query DTO before tRPC
  transport framing.
- Benchmark script:
  `.scratch/sales-overview-general-v2/benchmark-current-overview.ts`.

## Results

| Order | Median | P95 | Queries | Payload | Root keys |
| --- | ---: | ---: | ---: | ---: | ---: |
| `09397LM` | 14.54 ms | 24.20 ms | 25 | 7,184 B | 55 |
| `09388PC` | 15.31 ms | 26.41 ms | 24 | 6,447 B | 55 |

## Interpretation

- Local warm latency and serialized response size are modest for these two
  representative orders.
- Database query fan-out is the clear inefficiency: one General open performs
  24–25 queries before any independent tab query runs.
- The first narrow-projection optimization should therefore reduce relational
  loads inside the canonical overview endpoint and preserve one client query.
- Adding a second V2-only client request would duplicate identity/header/action
  data and is not supported by this evidence.
- The candidate projection must retain canonical customer/address, P.O., sales
  rep, Special Order, payment/C.C.C., status, delivery-date, document-readiness,
  and inventory-inbound evidence. Product/configuration rows are not required
  by General V2 and are the first relation family to exclude conditionally.

## Accepted Candidate

The candidate excludes Product/configuration items, Sales Profile,
delivery-item counts, and legacy control enrichment while preserving the
General dependencies above.

| Order | Baseline queries | Candidate queries | Baseline median | Candidate median | Baseline payload | Candidate payload |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `09397LM` | 25 | 15 | 14.54 ms | 10.01 ms | 7,184 B | 5,433 B |
| `09388PC` | 24 | 14 | 15.31 ms | 8.67 ms | 6,447 B | 5,520 B |

The candidate was promoted behind the same `sales.getSaleOverview` endpoint and
is selected only after the caller resolves to General V2. V1 retains its
compatibility projection.

## Next Gate

Complete authenticated Super Admin settings-switch, responsive, keyboard, and
action-parity acceptance before office cutover.
