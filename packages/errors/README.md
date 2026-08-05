# GND error system

`@gnd/errors` is the runtime-neutral error contract used by API routes, server
actions, web apps, jobs, and mobile. It separates internal diagnostics from the
small error envelope that is safe to show to a user.

## Throw a known domain failure

```ts
import { AppError } from "@gnd/errors";

throw new AppError({
  code: "PROVIDER_UNAVAILABLE",
  cause: providerError,
  operation: "documents.send",
  publicMessage: "Document delivery is temporarily unavailable.",
});
```

Keep the original error in `cause` so Sentry retains its stack. Never put
customer data, request payloads, tokens, or SQL details in `publicMessage`.

## Present an unknown failure

```ts
import { getErrorPresentation, getUserErrorMessage } from "@gnd/errors";

const message = getUserErrorMessage(error);
const { title, description, reference, retryable } =
  getErrorPresentation(error);
```

These helpers understand the API's `data.appError` envelope. They must be used
instead of rendering an arbitrary `error.message` from a provider, fetch call,
or server action.

## Report a handled failure

```ts
import { buildErrorReport } from "@gnd/observability";

const report = buildErrorReport(error, {
  operation: "orders.create",
  requestId,
  runtime: "api",
  source: "rest",
});

if (report.classified.reportable) {
  Sentry.captureException(report.reportableError, report.captureContext);
}
```

The report builder removes metadata keys likely to contain sensitive data and
adds stable category, code, operation, request, retry, and reference tags.

## Run a database transaction

```ts
import { runDbTransaction } from "@gnd/db/transactions";

await runDbTransaction(
  {
    client: db,
    operation: "orders.create",
    profile: "standard",
  },
  async (tx) => {
    // Database work only. Keep network and file operations outside.
  },
);
```

Use `short`, `standard`, or `workflow`; do not add an unreviewed timeout inline.
Enable `retryOnWriteConflict` only when rerunning the whole callback is safe.
The shared Prisma client applies the `standard` profile to legacy interactive
transactions, so they no longer inherit Prisma's five-second execution default.

## Boundary behavior

- Prisma `P2028`, `P2024`, and `P2034` are reportable and retryable.
- Expected authentication, validation, permission, not-found, and ordinary
  conflict errors should be thrown as `AppError` values and do not consume
  Sentry quota. Untyped transport messages are never shown directly;
  technical-looking messages are reported so an infrastructure failure cannot
  hide behind an expected status code.
- Unknown and technical messages are replaced with professional copy.
- The API error reference sent to the client is also attached to the Sentry
  event, allowing support to correlate a report without exposing internals.
