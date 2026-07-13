# Sales Control V2 Query Plan Validation

## Environment Prerequisite

- Database must be reachable from workspace runtime.
- Current local probe failed on `localhost:3306` (March 10, 2026), so run this in your connected environment.

## 1) Validate qtyControl index usage (sales filters)

Run this SQL (MySQL):

```sql
EXPLAIN FORMAT=JSON
SELECT so.id
FROM SalesOrders so
WHERE EXISTS (
  SELECT 1
  FROM SalesItemControl sic
  JOIN QtyControl qc ON qc.itemControlUid = sic.uid
  WHERE sic.salesId = so.id
    AND sic.deletedAt IS NULL
    AND qc.deletedAt IS NULL
    AND qc.type = 'prodCompleted'
    AND qc.total > 0
    AND qc.percentage = 100
);
```

Expected:
- `QtyControl` access path should use one of:
  - `QtyControl_type_deletedAt_percentage_idx`
  - `QtyControl_type_deletedAt_total_idx`

## 2) Validate qtyControl index usage (dispatch backorder)

```sql
EXPLAIN FORMAT=JSON
SELECT so.id
FROM SalesOrders so
WHERE EXISTS (
  SELECT 1
  FROM SalesItemControl sic
  JOIN QtyControl qc ON qc.itemControlUid = sic.uid
  WHERE sic.salesId = so.id
    AND sic.deletedAt IS NULL
    AND qc.deletedAt IS NULL
    AND qc.type = 'dispatchCompleted'
    AND qc.total > 0
    AND qc.percentage > 0
    AND qc.percentage < 100
);
```

Expected:
- Same `QtyControl` composite index usage as above.

## 3) Compare legacy stat filter path (control_filter_v2=0)

Use app query with:

- `CONTROL_FILTER_V2=0`
- `dispatch.status=completed`

Validate SQL plan uses `SalesStat` path and does not require `QtyControl` table.

## 4) Track plan metrics

Capture for each query:

- filtered rows
- key used
- rows examined
- cost info from JSON plan

Store results in `brain/progress.md` and only then close checklist item:
- `8) Validate query plans at production-like scale`
