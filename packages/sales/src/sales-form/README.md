# Sales Form Package Contract

The shared sales form package owns the portable form record, pricing, workflow
mutation, and workflow UI behavior used by dealership and the internal `www`
sales form.

## Stable Entry Point

Import public sales-form APIs from:

```ts
import { SalesFormWorkflowPanel } from "@gnd/sales/sales-form";
```

Do not import deep workflow files from app code unless the file is explicitly
exported through `src/sales-form/index.ts`.

## Workflow Panel Boundary

`SalesFormWorkflowPanel` is intentionally app-data-source driven. Apps provide
query hooks through `SalesFormWorkflowDataSource` instead of the package
importing tRPC, app env, or app auth.

Required hooks:

- `useStepRouting`
- `useStepComponents`

Optional hooks:

- `useRootComponents`
- `useDoorComponents`
- `useCustomerProfiles`
- `useShelfCategories`
- `useShelfProducts`
- `useDoorSuppliers`
- `resolveImageSrc`

If a hook is absent, the package keeps the workflow usable where possible and
omits host-only functionality.

## App-Owned Slots

The package provides defaults for flat lines, Door/HPT sizing and review,
shelf rows, moulding rows, and service rows. Host slots should be reserved for
privileged or app-specific surfaces:

- component edit and upload
- redirect editing
- section override authoring
- door size variant authoring
- supplier creation/deletion
- app-specific calculators or admin modals

Unwired admin actions must not render. The package component menu only shows
admin entries when the host passes actual handlers.

`www` can now supply component-level admin actions through
`slots.componentActions`. Use this for privileged behavior that must remain
host-owned, including component pricing/edit, image upload, redirect changes,
section overrides, and selected-component deletion. The package supplies the
workflow context, while the host owns dialogs, uploads, mutations, and final
line patches.

## Regression Gate

Run the focused migration gate before and after workflow migration slices:

```sh
bun run test:new-sales-form-migration
```

This runs shared sales workflow/domain/composer tests, dealer persistence tests,
dealership typecheck, and a watched-file `www` package-panel typecheck signal.

The `www` signal tolerates unrelated baseline typecheck failures only when the
output does not mention the package-panel migration files. Treat any watched
file mention as a regression.
