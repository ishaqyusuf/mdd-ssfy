# Database Relationships

## Purpose
Tracks important cross-model relationships and ownership patterns.

## Current Notes
- Sales shipment relationship for the inventory cutover:
  - `SalesOrders` -> `OrderDelivery` is the shipment/dispatch header relationship.
  - `OrderDelivery` -> `OrderItemDelivery` is the shipment line relationship.
  - `OrderItemDelivery.orderItemId` points to the legacy sales line.
  - `OrderItemDelivery.meta.lineItemId` should point to inventory `LineItem.id` for inventory-origin shipment writes.
  - `LineItemComponents` -> `StockAllocation` remains the inventory-side component reservation/pick/consume relationship.
  - Completed shipment reporting should read `OrderDelivery` / `OrderItemDelivery`; inventory stock consumption reporting should read `StockAllocation.status = consumed` and reconcile the two.
- Web bug reporting relationships:
  - `BugReport.createdById` points to `Users.id` for the submitting employee; the API hydrates submitter details manually instead of adding new `Users` relation fields.
  - `BugReport.statusUpdatedById` points to `Users.id` for the Super Admin who last changed status; this is also hydrated manually.
  - `BugReport.recordingDocumentId` points to `StoredDocument.id` for the Vercel Blob recording metadata.
  - `StoredDocument.ownerType = "bug_report"` and `StoredDocument.ownerId = BugReport.id` are the document-platform ownership convention for recordings.
  - `BugReport` -> `BugReportFollowUp` is a Prisma relation with cascade delete for report thread messages.
- Sales email delivery relationships:
  - `SalesEmailAttempt.senderId` points to `Users.id` through `Users.sentSalesEmailAttempts` for the actor who initiated the send
  - `SalesEmailAttempt.salesRepId` points to `Users.id` through `Users.salesRepEmailAttempts` for the sales rep attached to the underlying sale when known
  - `SalesEmailAttempt.originalAttemptId` is a self-relation used by Super Admin resend attempts so retry rows can be traced back to the failed/skipped source row without mutating original evidence
  - related sales ids/order numbers are stored as JSON/text snapshots (`salesIds`, `salesNos`, `salesIdsText`, `salesNosText`) rather than new sales ledger join tables in v1
- Background task diagnostics relationships:
  - `TaskRunDiagnostic.actorId` points to `Users.id` through `Users.taskRunDiagnosticsStarted` for the signed-in actor who started the task when known
  - `TaskRunDiagnostic.reviewedById` points to `Users.id` through `Users.taskRunDiagnosticsReviewed` for the Super Admin who marks a diagnostic reviewed
  - task context uses snapshots (`actorName`, `actorEmail`, `entityType`, `entityId`, `entityLabel`) so diagnostics remain readable even if related domain records change later
  - generic task diagnostics do not introduce joins to sales, inventory, notification, or email domain tables in v1; use `entityType`/`entityId` plus domain-specific ledgers such as `SalesEmailAttempt` for deeper investigation

## TODO
- Document major relationships for sales, payments, resolution, documents, customers, and dispatch flows.
