# Resolve assigned child IDs without weakening save consistency

Date: 2026-09-09
Status: Accepted for local implementation

Approved adjustments may contain newly added child rows without database IDs. The worker previously persisted those rows but retained missing IDs in its commercial snapshot, blocking the next edit despite equal commercial values.

The worker writes assigned/reused child IDs into the snapshot inside the same transaction as relational projection. For older snapshots, the save guard permits missing IDs to match only a unique semantic identity inside the same uniquely identified parent item. Known IDs are never remapped. All existing commercial comparisons still apply; ambiguous matches remain blocked. Normal save persists the reconciled canonical record. We do not infer missing financial charges from totals.

Save persistence and post-save refresh have separate outcomes. A committed save remains saved when statistics/other follow-up fails. Internal refresh failures are explicitly reportable with a safe public reason and shared Sentry reference.

Consequences: ordinary users need no repair prompt for an unambiguous missing-ID case. Genuine data discrepancies remain visible. Worker and API/dashboard must be deployed together; no automatic production backfill is introduced.
