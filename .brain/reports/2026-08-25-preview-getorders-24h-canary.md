# Preview `getOrders` 24-Hour Canary

## Outcome

The guarded Preview Sales Orders path is **functionally ready for the next small, reversible production rollout gate**, but it is **not ready for an unguarded full-production rollout**.

Every trustworthy Chrome sample returned the exact order correctly and finished without a persistent application or console error. Performance was uneven: one list-load slowdown was confirmed on retry, and Chrome could not expose request-level `getOrders` status or duration. The next gate should therefore remain cohort-scoped, preserve the legacy fallback, and add server-side per-procedure timing before wider promotion.

## Window and coverage

- Planned window: 2026-08-25 08:00 through 2026-08-26 07:00 Africa/Lagos.
- Recorded window: 2026-08-25 08:01:33 through 2026-08-26 07:02:14 Africa/Lagos (23 hours, 41 seconds).
- Planned scheduled attempts: 24.
- Recorded scheduled attempts: 20.
- Successful trustworthy samples: 14.
- Failed attempts: 6.
- Missing scheduled attempts: 4; no record was emitted during the scheduler gap between 01:03 and 06:55 Africa/Lagos.
- Separate manual Chrome baseline: one successful functional sample; exact search completed in about 3.54 seconds. It is excluded from scheduled-sample statistics.

The first three failures used the unauthenticated in-app browser before the monitor was corrected to Chrome. Attempts 13, 15, and 16 failed because the Chrome connector could not create a fresh grouped temporary tab. Existing user tabs were not reused or changed.

## Functional correctness

- Exact result correctness: 14/14 successful scheduled samples returned `09379PC`.
- Broad search correctness: 14/14 successful scheduled samples reached a clean `APA` result after applying the required retry policy.
- Successful-sample console/runtime errors: 0.
- Persistent 4xx/5xx or tRPC errors observed through the UI/console: 0.
- Search was cleared after every successful run.
- One transient `APA` application error occurred in the manual baseline and another in scheduled attempt 4; both recovered on retry.

## Performance

Statistics use nearest-rank p95 over the 14 successful scheduled Chrome samples. "Effective" timings use the required same-run retry when a suspected anomaly was retried.

| Measurement | Min | Average | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| List usable, initial | 7.07s | 22.50s | 44.14s | 44.14s |
| List usable, effective | 7.07s | 20.41s | 32.37s | 32.37s |
| `APA`, initial | 0.67s | 7.94s | 14.91s | 14.91s |
| `APA`, effective | 0.28s | 1.09s | 2.89s | 2.89s |
| Exact `09379PC` | 0.32s | 1.99s | 5.99s | 5.99s |

Baselines:

- Manual Chrome exact-search baseline: approximately 3.54s; anomaly threshold approximately 7.08s.
- First scheduled Chrome list-load baseline: 14.32s; list anomaly threshold 28.63s.

Confirmed anomaly:

- Attempt 6: list usability took 29.09s and the fresh-tab retry took 32.37s. Both exceeded twice the scheduled list baseline.

Unconfirmed slow observations:

- Attempt 18 initially took 44.14s to expose the list, then recovered to 11.51s on a fresh-tab retry.
- Several initial `APA` observations exceeded the manual search threshold, but every required retry recovered cleanly. Effective `APA` p95 was 2.89s.
- Repeated Chrome `Page.navigate` control timeouts occurred while the page continued loading. Consequently, some list timings include connector/navigation-control overhead and should not be treated as pure server duration.

## Request and console evidence

Chrome did not expose a trustworthy request-level `getOrders` HTTP status or resource duration during these runs. The canary therefore proves rendered behavior, exact-result correctness, and absence of visible console/runtime failures, but it does not isolate database, server-function, network, or client-render time.

Evidence:

- Structured samples: `.gstack/canary-reports/preview-getorders-hourly-canary.jsonl`
- Screenshots: `.gstack/canary-reports/screenshots/`
- Successful scheduled screenshots: 14.

No cookies, tokens, secrets, or real customer details were written to the structured report.

## Vercel cost context

Final snapshot command requested the 2026-08-19 to 2026-08-26 interval for the 2026-08-19 to 2026-09-19 billing cycle. The CLI reported an inclusive local-date period ending 2026-08-27 07:00 UTC.

- Infrastructure cost: **$5.63**.
- Daily infrastructure burn: **$0.80/day** — above the $0.50 target and the $0.75 critical threshold.
- Projected infrastructure cost: **$24.93** — above the $15 cycle target, though improved from the earlier $27.49 projection.
- Infrastructure thresholds crossed: none of $8 / $12 / $16 / $18; next threshold is $8.
- Top projects: `gndprodesk` $5.56; unattributed $0.06 infrastructure plus $12.90 subscription; `prodesk-api` $0.01.
- Top services: Function Duration $3.66; Speed Insights Data Points $0.65; Fluid Active CPU $0.61; Function Invocations $0.19; Build CPU Minutes $0.14; Fluid Provisioned Memory $0.14.

This is whole-cycle Vercel infrastructure context. It does **not** isolate `getOrders` cost.

## Rollout gate recommendation

Proceed only to a narrow, reversible production cohort with the read-model control still guarded and the legacy path available as fallback. Before widening the cohort:

1. Capture server-side `getOrders` procedure duration, status, selected path, and fallback reason so Vercel Function Duration can be tied to this endpoint.
2. Require zero correctness failures and zero persistent tRPC/5xx errors in the cohort.
3. Investigate the confirmed repeated list-load slowdown and separate navigation, server, and render time.
4. Keep the daily cost monitor active because the $0.80 daily burn remains critical and the $24.93 projection exceeds the $15 target.

The canary supports the next controlled rollout gate; it does not support broad production enablement yet.
