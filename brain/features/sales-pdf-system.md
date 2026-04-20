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
│   ├── line-item-sections.ts   # generic invoice line items excluded from dyke/shelf sections
│   ├── footer.ts               # subtotal, tax, labor, extra costs, paid, due
│   └── packing.ts              # dispatch/packing qty resolution
└── constants.ts                # tax codes, office addresses, mode visibility config
```

### Template layer: `packages/pdf/src/sales-v2/`

Templates are self-contained folders registered in a central registry. Each template implements the same `PrintPage` → PDF contract. Swapping templates = picking a different registry key.

```
packages/pdf/src/sales-v2/
├── index.ts                    # barrel: SalesPdfDocument, registry types
├── document.tsx                # <Document> wrapper — selects template by id
├── registry.tsx                # SalesTemplateConfig, SalesTemplateRenderProps, getTemplate()
├── shared/
│   ├── watermark-page.tsx      # page wrapper with watermark + page numbering
│   └── utils.ts                # resolveImageSrc, colWidth, sumColSpans
├── templates/
│   ├── template-1/             # first template ("classic" invoice look)
│   │   ├── index.tsx           # Template1 — routes to mode composer
│   │   ├── blocks/             # isolated block components
│   │   │   ├── index.ts
│   │   │   ├── header-block.tsx
│   │   │   ├── door-block.tsx
│   │   │   ├── moulding-block.tsx
│   │   │   ├── service-block.tsx
│   │   │   ├── shelf-block.tsx
│   │   │   ├── line-item-block.tsx
│   │   │   ├── image-gallery-block.tsx
│   │   │   ├── footer-block.tsx
│   │   │   └── signature-block.tsx
│   │   └── modes/              # each print mode composed separately
│   │       ├── index.ts
│   │       ├── invoice.tsx     # invoice mode composer (prices + footer + signature)
│   │       ├── quote.tsx       # quote mode composer (prices + footer + signature + goodUntil)
│   │       ├── production.tsx  # production mode (no prices, no footer, no signature)
│   │       └── packing-slip.tsx # packing slip mode (no prices, packing col, signature)
│   └── template-2/            # future template (same contract)
│       └── ...
```

### Template registry pattern

```ts
// packages/pdf/src/sales-v2/registry.tsx
export interface SalesTemplateConfig {
  showImages: boolean;    // toggle image display on all blocks
}

export interface SalesTemplateRenderProps {
  page: PrintPage;
  baseUrl?: string;
  watermark?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config: SalesTemplateConfig;
}

export type SalesTemplateRenderer = (props: SalesTemplateRenderProps) => JSX.Element;

const templates: Record<string, SalesTemplateRenderer> = {
  "template-1": Template1,
  // "template-2": Template2,  ← drop in later
};

// packages/pdf/src/sales-v2/document.tsx
export function SalesPdfDocument({ pages, templateId = "template-1", config, ... }) {
  const Template = getTemplate(templateId);
  return (
    <Document>
      {pages.map((page, i) => <Template key={i} page={page} config={config} ... />)}
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
| **1** | Types + barrel export | `print/types.ts`, `print/index.ts` — ✅ DONE |
| **2** | Compose functions | `print/compose/*.ts` — pure data transformers |
| **3** | getPrintData entry | `print/get-print-data.ts` wiring compose → PrintPage[] |
| **4** | tRPC endpoint | `salesV2` procedure in `print.route.ts` |
| **5** | Template registry + template-1 | `pdf/src/sales-v2/` — ✅ DONE: blocks, modes, registry, document |
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

## Immediate follow-up scope

The next execution slice extends the shipped v2 renderer into the day-to-day sales workflow.

1. Add quick-print buttons in the sales form and in sales overview next to the preview action so printing does not depend on opening legacy paths.
2. Move sales preview onto the new template renderer so preview, quick-print, and download all share one render contract.
3. Treat current print latency as a first-class performance problem; the preferred fix path is stored-document reuse before any expensive on-demand render.

## Cache and merge rules to implement

The stored-document phase should answer these operational rules explicitly:

1. When a payment is recorded successfully, invalidate sales print cache entries that could now have stale balance, status, or payment metadata.
2. When the sales form mutates saved order data, invalidate cached print snapshots for that sales record before the next download.
3. On download/quick-print, first check whether the sales record already has a stored download link for the requested print type/template pair; if yes, reuse it instead of regenerating.
4. If no matching stored document exists, generate the PDF, upload/register it, and persist the new snapshot for future reuse.
5. Support grouped print requests where a single sales record may emit multiple print documents; each document should preserve the intended per-sales order and the final response should merge them into one PDF when the caller requested a combined print.

## Pickup packing signoff

- Packing signoff now lives on `/p/sales-invoice-v2` only, and only when the print payload is in `packing-slip` mode.
- The UI surface is a floating `Sign` control rendered by `apps/www/src/components/packing-slip-sign-fab.tsx`.
- The sign form prefills:
  - `Packed By` from the current logged-in account
  - `Received By` from the customer/shipping name
- Submitting the form:
  - uploads the signature image
  - saves signature metadata into dispatch completion note tags
  - packs all items into the delivery
  - refreshes the print view so the signed packing slip renders immediately
- Packing print rendering remains single-source-of-truth through dispatch note tags, now including `packedBy`, `dispatchRecipient`, `signature`, and `deliveryId`.

## Notes

- Templates never touch the database — they receive typed `PrintPage` props only.
- Adding a template = creating a new folder under `templates/` and registering it.
- `templateId` defaults to `"classic"` — backward compatible with no client changes.
- Image fields (`image?: string`) are first-class on `DoorRow`, `MouldingRow`, and `ShelfRow`.
- Client PDF preview should pass a fully qualified origin via `getBaseUrl()` so image rows resolve correctly in-browser; shared `resolveImageSrc()` also normalizes host-only base URLs by prefixing `https://`.
- `packages/pdf/src/utils/tw.ts` acts as the safety bridge for `react-pdf-tailwind` in Sales PDF V2: it filters blank class tokens and maps unsupported classes like `col-span-*` to plain react-pdf style objects so ports from the legacy helper stay warning-free.
- Template behavior matches the legacy print flow for customer signoff: `invoice`, `quote`, and packing modes render the signature block, while `production` intentionally omits footer/signature content.
- Product image resolution in Sales PDF V2 mirrors the new sales form: stored image keys resolve through `NEXT_PUBLIC_CLOUDINARY_BASE_URL` under the `dyke/` bucket first, while absolute/data/blob URLs pass through unchanged.
- V2 now mirrors the legacy three-bucket content split: door-like sections (doors, mouldings, HPT services), shelf sections, and generic line-item sections. Generic invoice lines are composed separately from non-HPT, non-shelf sales items and then merged into `page.sections` by line order.
- Template 1 now appends a deduplicated end-of-document image reference block that collects unique row images, renders them in a larger grid, and labels each image with its row title.
- Existing public tokenized download URLs remain stable while internals migrate.
- Shared JWT signing for tokenized sales document links now uses each token payload's own `expiry` timestamp for the JWT `exp` claim, preventing emailed quote/invoice download links from expiring after a blanket 1-hour window.
