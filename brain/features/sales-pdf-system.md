# Sales PDF System

## Goal

Build a clean, isolated sales PDF system with zero legacy dependencies, typed data contracts, and a registry-driven template architecture that makes it trivial to add/swap invoice templates.

---

## V2 Architecture — Multi-Template Design

### Data layer: `packages/sales/src/print/`

One shared data pipeline produces typed `PrintPage` payloads. Templates never touch the database.

```
packages/sales/src/print/
├── index.ts                    # public barrel: getPrintData, types
├── types.ts                    # PrintPage, PrintSection, DoorRow, ShelfRow, etc.
├── schema.ts                   # zod input schema for the print endpoint
├── query.ts                    # isolated Prisma select (only what print needs)
├── get-print-data.ts           # db → PrintPage[] (main entry)
├── compose/
│   ├── meta.ts                 # invoice title, dates, rep, PO, status, payment stamp
│   ├── addresses.ts            # billing/shipping address block
│   ├── door-sections.ts        # HPT → DoorSection with image, configs, rows
│   ├── moulding-sections.ts    # moulding items → MouldingSection with image, rows
│   ├── service-sections.ts     # service items → ServiceSection
│   ├── shelf-sections.ts       # shelf items → ShelfSection with image, rows
│   ├── line-items.ts           # legacy non-dyke line items
│   ├── footer.ts               # subtotal, tax, labor, extra costs, paid, due
│   └── packing.ts              # dispatch/packing qty resolution
└── constants.ts                # tax codes, office addresses, mode visibility config
```

### Template layer: `packages/pdf/src/sales/`

Templates are self-contained folders registered in a central registry. Each template implements the same `PrintPage` → PDF contract. Swapping templates = picking a different registry key.

```
packages/pdf/src/sales/
├── index.ts                    # template registry + SalesPdfDocument wrapper
├── types.ts                    # TemplateRenderer interface
├── fonts.ts                    # shared Font.register (Inter family)
├── shared/
│   ├── table.tsx               # reusable table-row, table-cell, image-cell primitives
│   ├── watermark-page.tsx      # page wrapper with watermark + page numbering
│   └── utils.ts                # resolveImageSrc, width helpers
├── templates/
│   ├── classic/                # current invoice look
│   │   ├── index.tsx           # ClassicTemplate — renders PrintPage
│   │   ├── header.tsx
│   │   ├── section-doors.tsx
│   │   ├── section-mouldings.tsx
│   │   ├── section-shelves.tsx
│   │   ├── section-services.tsx
│   │   ├── section-line-items.tsx
│   │   └── footer.tsx
│   └── modern/                 # future alternate template (same contract)
│       ├── index.tsx
│       └── ...
```

### Template registry pattern

```ts
// packages/pdf/src/sales/types.ts
export interface SalesTemplateProps {
  page: PrintPage;
  baseUrl?: string;
  watermark?: string;
}
export type SalesTemplateRenderer = (props: SalesTemplateProps) => JSX.Element;

// packages/pdf/src/sales/index.ts
import { ClassicTemplate } from "./templates/classic";

const templates: Record<string, SalesTemplateRenderer> = {
  classic: ClassicTemplate,
  // modern: ModernTemplate,  ← drop in later
};

export function SalesPdfDocument({ pages, templateId = "classic", baseUrl, watermark }) {
  const Template = templates[templateId] ?? templates.classic;
  return (
    <Document>
      {pages.map((page, i) => <Template key={i} page={page} baseUrl={baseUrl} watermark={watermark} />)}
    </Document>
  );
}
```

### API layer

```
apps/api/src/trpc/routers/print.route.ts
  └── salesV2 procedure
       input: { token, preview?, templateId? }
       → validates token
       → calls getPrintData(db, tokenPayload)
       → returns { pages: PrintPage[], title, templateId }
```

### Client layer

```
apps/www/src/components/print-sales-v2.tsx     # uses SalesPdfDocument
apps/www/src/app/(public)/p/sales-invoice-v2/  # new route (legacy route untouched)
```

---

## Type contract

```ts
type PrintMode = "invoice" | "quote" | "production" | "packing-slip" | "order-packing";

interface PrintPage {
  meta: PageMeta;
  billing: AddressBlock;
  shipping: AddressBlock;
  sections: PrintSection[];       // ordered by lineIndex
  footer: FooterData | null;      // null for production/packing
  config: PrintModeConfig;        // controls column/section visibility
}

interface PageMeta {
  title: string;
  salesNo: string;
  date: string;
  rep?: string;
  po?: string;
  status: "paid" | "pending";
  balanceDue?: string;
  dueDate?: string;
  total: string;
  paymentDate?: string;
}

type PrintSection =
  | DoorSection
  | MouldingSection
  | ServiceSection
  | ShelfSection
  | LineItemSection;

// Each section has `kind` discriminator, `index`, `title`, typed rows with optional `image`
```

---

## Execution phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **1** | Types + Prisma query | `print/types.ts`, `print/schema.ts`, `print/query.ts` |
| **2** | Compose functions | `print/compose/*.ts` — pure data transformers |
| **3** | getPrintData entry | `print/get-print-data.ts` wiring compose → PrintPage[] |
| **4** | tRPC endpoint | `salesV2` procedure in `print.route.ts` |
| **5** | Template registry + classic template | `pdf/src/sales/` with shared primitives + classic template |
| **6** | Client wiring | `print-sales-v2.tsx` + v2 page route |

---

## What stays untouched

- `print-legacy-format.ts` — existing `trpc.print.sales`
- `invoice-print-data.ts` — existing `trpc.sales.printInvoice`
- All current PDF components in `packages/pdf/src/components/`
- Public page at `(public)/p/sales-invoice/page.tsx`

---

## Stored-document pipeline (future phase)

Once the v2 print system is stable:

1. `StoredDocument` stores generic file metadata and owner linkage.
2. `SalesDocumentSnapshot` stores sales-specific PDF generation/version lifecycle.
3. `packages/documents` owns provider-agnostic document registration helpers.
4. `packages/sales/src/pdf-system` owns invalidation and current-PDF resolution rules.
5. Async job renders PDF → uploads via shared document platform → links to snapshot.
6. Download/email flows resolve stored document instead of rendering on demand.

## Notes

- Templates never touch the database — they receive typed `PrintPage` props only.
- Adding a template = creating a new folder under `templates/` and registering it.
- `templateId` defaults to `"classic"` — backward compatible with no client changes.
- Image fields (`image?: string`) are first-class on `DoorRow`, `MouldingRow`, and `ShelfRow`.
- Existing public tokenized download URLs remain stable while internals migrate.
