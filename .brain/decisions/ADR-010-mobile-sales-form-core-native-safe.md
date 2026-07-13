# ADR-010: Mobile Sales Form Core Must Stay Native-Safe

## Status
Accepted

## Date
2026-06-18

## Context
The Expo mobile invoice form imports `@gnd/sales/sales-form-core` for shared sales-form behavior. A shelf helper export temporarily pointed from that mobile-facing barrel to `sales-form/ui/workflow/shelf-inputs.tsx`, which is a web-only React component using `@gnd/ui`. Metro then attempted to bundle the web UI package into Android and failed resolving `@gnd/ui/icons`.

Mobile must not consume `@gnd/ui` or shared website UI components. Cross-surface sales logic can be shared only through native-safe TypeScript modules that contain domain, pricing, normalization, selection, or patch helpers without web component dependencies.

## Decision
- `@gnd/sales/sales-form-core` is the mobile-safe sales-form entrypoint and must not export from web UI TSX modules or modules importing `@gnd/ui`.
- Shared helper logic needed by both web and mobile must live in pure `.ts` modules.
- Web React components may import those pure helpers, but pure helpers must not import web components or `@gnd/ui`.
- Mobile Expo code may import `@gnd/sales/sales-form-core` and app-local native UI only.

## Consequences
- Website workflow components remain free to use `@gnd/ui`, but they cannot be the source of helpers exported through the mobile-safe core barrel.
- Future mobile parity work should first ask whether a needed helper is pure. If it is trapped in a web TSX file, extract the helper into a pure module before exporting it.
- Lightweight import smoke checks on `sales-form-core` are useful after changing the barrel export surface.
- `packages/sales/src/sales-form-core.native-safety.test.ts` enforces this boundary by walking the barrel's relative dependency graph and rejecting TSX modules or `@gnd/ui` imports.
- `apps/expo-app/src/features/sales/invoice-form/native-ui-boundary.test.ts` adds a second guard at the Expo source boundary, rejecting direct mobile imports from the web UI package.
