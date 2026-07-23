# Sales PDF System

## Goal

Build a clean, isolated sales PDF system with zero legacy dependencies, typed data contracts, and a registry-driven template architecture that makes it trivial to add/swap invoice templates.

---

## V2 Architecture — Multi-Template Design

### Data layer: `packages/sales/src/print/`

One shared data pipeline produces typed `PrintPage` payloads. Templates never touch the database.

The print query projects only the `DealerSales` fields used by dealer pricing
(`dealerSalesPercentage` and `dueAmount`) instead of loading every scalar
column. This keeps invoice and quote generation compatible while additive
dealership schema changes are being rolled out and prevents unrelated
client/schema drift from breaking sales documents.

The print data layer owns C.C.C/payment footer semantics. `composeFooter` and `composeMeta` use a shared payment footer state helper. Customer-facing print footers use a compact summary: unpaid card estimates show `Order Due Amount`, `Estimated Card Fee`, and `Total if Paying by Card`; paid and partially paid records show `Order Total`, optional aggregated `Card Fees`, `Total Paid`, and principal-only `Balance Due`. `Total Paid` combines principal applied to the order with only safely matched recorded card fees; it never infers historical fees from the selected payment method. HTML preview and both PDF templates render the shared `PrintPage` payload and do not calculate payment totals themselves. Internal sales overview `costLines` retain their detailed accounting labels and continue to use the shared payment state helper.

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
│   ├── payment-footer-state.ts # C.C.C/payment footer state and recorded charge extraction
│   └── packing.ts              # dispatch/packing qty resolution
└── constants.ts                # tax codes, office addresses, mode visibility config
```

### Template layer: `packages/pdf/src/sales-v2/`

Templates are self-contained folders registered in a central registry. Each template now implements the same shared `PrintPage` contract twice:

- `html` renderer for browser preview
- `pdf` renderer for download/export

Swapping templates still means picking a different registry key, but preview and download now stay on the same template id.

```
packages/pdf/src/sales-v2/
├── index.ts                    # barrel: SalesPdfDocument, SalesHtmlDocument, registry types
├── document.tsx                # <Document> wrapper — selects template.pdf by id
├── html-document.tsx           # HTML wrapper — selects template.html by id
├── registry.tsx                # SalesTemplateConfig, SalesTemplateRenderProps, getTemplate()
├── shared/
│   ├── watermark-page.tsx      # page wrapper with watermark + page numbering
│   ├── html-template.tsx       # shared HTML preview building blocks
│   └── utils.ts                # resolveImageSrc, colWidth, sumColSpans
├── templates/
│   ├── template-1/             # first template ("classic" invoice look)
│   │   ├── index.tsx           # Template1 — routes to mode composer
│   │   ├── html.tsx            # Template1Html — routes to shared HTML renderer
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
│       ├── index.tsx
│       ├── html.tsx
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

export type SalesPdfTemplateRenderer = (props: SalesTemplateRenderProps) => JSX.Element;
export type SalesHtmlTemplateRenderer = (props: SalesTemplateRenderProps) => JSX.Element;

const templates = {
  "template-1": {
    html: Template1Html,
    pdf: Template1,
  },
  "template-2": {
    html: Template2Html,
    pdf: Template2,
  },
};

// packages/pdf/src/sales-v2/document.tsx
export function SalesPdfDocument({ pages, templateId = "template-1", config, ... }) {
  const template = getTemplate(templateId);
  return (
    <Document>
      {pages.map((page, i) => <template.pdf key={i} page={page} config={config} ... />)}
    </Document>
  );
}

// packages/pdf/src/sales-v2/html-document.tsx
export function SalesHtmlDocument({ pages, templateId = "template-1", config, ... }) {
  const template = getTemplate(templateId);
  return pages.map((page, i) => <template.html key={i} page={page} config={config} ... />);
}
```

### API layer

```
apps/api/src/trpc/routers/print.route.ts
  └── salesV2 procedure
       input: { token?, accessToken?, preview?, templateId? }
       → validates signed token or snapshot access token
       → resolves shared print payload
       → returns preview metadata plus { pages: PrintPage[], title, templateId, downloadUrl, previewUrl }
```

### Client layer

```
apps/www/src/components/print-sales-v2.tsx            # legacy/fallback PDF viewer
apps/www/src/components/sales-document-preview-page.tsx # HTML preview with actions
apps/www/src/app/(public)/p/sales-document-v2/        # signed HTML preview route
```

2026-07-16 browser proof: `/sales-book/orders` batch selection of five orders used `Print > PDF > Order & Packing` and produced `~/Downloads/Sales_Print_10_.pdf`; after root auth hydration was fixed, the same selected batch used `Print > PDF > Order`, showed `PDF download started`, and produced `~/Downloads/Sales_Print_4_.pdf` with no new browser console errors.

2026-07-16 filtered batch proof: applying `q=cimera`, `invoice=pending`, and `sales.rep=Pablo Cruz` returned active orders `08682PC`, `08680PC`, and `08472PC`; the batch `Print > PDF > Order` UI path reached `PDF download started`, but the in-app browser did not persist a fresh blob download, so the same sales PDF route/rendering path was used to save `~/Downloads/Sales_Print_Cimera_Pablo_Cruz_pending.pdf`. PDF text extraction confirmed all three order numbers, `CIMERA`, and `Pablo Cruz`.

2026-07-22 follow-up: PDF downloads from the HTML sales-document preview now use the
same-origin blob-fetch path as the sales-menu controller instead of opening a
synthetic new tab. The download URL preserves the canonical print mode (including
`quote`) and fetches with credentials plus `no-store`, so public quote previews
surface a real response failure instead of silently losing the download. Focused
sales-print service, print-data, query, and PDF renderer coverage passes 42 tests /
154 assertions.

2026-07-23 browser proof: authenticated quote `03341LM` rendered through the
HTML preview and the preview PDF action fetched
`/api/download/sales-v2?...&mode=quote` with HTTP 200. Chrome persisted
`Quote_03341-LM.pdf` as a valid one-page, 33,984-byte PDF. The representative
batch path selected orders `08894LM`, then `08893LM`, used
`Print > PDF > Order`, and persisted `Sales_Print_2_ (3).pdf` as a valid
two-page, 127,468-byte PDF. Text extraction and rendered-page inspection
confirmed page order `08894-LM`, then `08893-LM`, with readable, unclipped
invoice tables and totals. This closes the quote-download and representative
batch artifact release gate.

2026-07-22 follow-up: the Sales Overview quick-actions bar now exposes a direct
V2 Print action for the current order or quote. It reuses the shared
`useSalesPrintController`, resolves `invoice` versus `quote` from the overview
record, and disables/relabels the action while access and print preparation are
in flight. The existing More menu remains available for packing, production, and
combined print variants.

The PDF follow-up implementation is now complete in code: the HTML preview path
uses the V2 template renderer, access resolution deduplicates concurrent requests,
single-order stored print data is reused until source/config invalidation, and
batch requests resolve each order through that cache before flattening pages in
the requested order into one merged PDF. Focused cache coverage verifies a hit
plus generated miss in the same batch and preserves `INV-10`, then `INV-11` page
ordering. The 2026-07-23 browser proof above closes the quote-download and
representative batch-artifact release gate.

Batch cache resolution also deduplicates repeated sales IDs while preserving
first-seen order, avoiding duplicate pages and duplicate generation work when a
selection source accidentally repeats an order.

---

## Type contract

```ts
type PrintMode =
  "invoice" | "quote" | "production" | "packing-slip" | "order-packing";

interface PrintPage {
  meta: PageMeta;
  billing: AddressBlock;
  shipping: AddressBlock;
  sections: PrintSection[]; // ordered by lineIndex
  footer: FooterData | null; // null for production/packing
  config: PrintModeConfig; // controls column/section visibility
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

| Phase | Scope                          | Deliverable                                                      |
| ----- | ------------------------------ | ---------------------------------------------------------------- |
| **1** | Types + barrel export          | `print/types.ts`, `print/index.ts` — ✅ DONE                     |
| **2** | Compose functions              | `print/compose/*.ts` — pure data transformers                    |
| **3** | getPrintData entry             | `print/get-print-data.ts` wiring compose → PrintPage[]           |
| **4** | tRPC endpoint                  | `salesV2` procedure in `print.route.ts`                          |
| **5** | Template registry + template-1 | `pdf/src/sales-v2/` — ✅ DONE: blocks, modes, registry, document |
| **6** | Client wiring                  | `print-sales-v2.tsx` + v2 page route                             |

---

## Legacy cleanup

- `trpc.print.sales` and `trpc.sales.printInvoice` have been retired; `trpc.print.salesV2` is the supported sales print data endpoint.
- Legacy sales PDF data/rendering modules were removed:
  - `packages/sales/src/print-legacy-format.ts`
  - `packages/sales/src/sales-template/invoice-print-data.ts`
  - `packages/sales/src/templates/pdf/*`
  - `packages/pdf/src/sales/*`
  - `packages/pdf/src/components/sales-print-*`
- `@gnd/pdf` no longer exports `./sales`; sales print consumers should import `@gnd/pdf/sales-v2`.
- `/api/download/sales` remains only as a compatibility redirect to `/api/download/sales-v2`, preserving existing token query strings for older links.
- `/p/sales-invoice` remains a compatibility route shell that renders the v2 print viewer.

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

1. Move sales overview preview actions onto the new signed HTML preview route.
2. Move packing-list preview onto the HTML preview route and keep packing-sign on that surface.
3. Keep PDF generation for export/download while treating HTML preview as the default preview experience.

## Cache and merge rules to implement

The stored-document phase should answer these operational rules explicitly:

1. When a payment is recorded successfully, invalidate sales print cache entries that could now have stale balance, status, or payment metadata.
2. When the sales form mutates saved order data, invalidate cached print snapshots for that sales record before the next download.
3. On download/quick-print, first check whether the sales record already has a stored download link for the requested print type/template pair; if yes, reuse it instead of regenerating.
4. If no matching stored document exists, generate the PDF, upload/register it, and persist the new snapshot for future reuse.
5. Support grouped print requests where a single sales record may emit multiple print documents; each document should preserve the intended per-sales order and the final response should merge them into one PDF when the caller requested a combined print.

## Pickup packing signoff

- Packing signoff now lives on `/p/sales-document-v2` for packing-slip preview payloads.
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
- Adding a template = creating a new folder under `templates/`, wiring both `html` and `pdf`, and registering the pair.
- `templateId` defaults to `"template-2"` on current preview/download entrypoints.
- Image fields (`image?: string`) are first-class on `DoorRow`, `MouldingRow`, and `ShelfRow`.
- Client PDF preview should pass a fully qualified origin via `getBaseUrl()` so image rows resolve correctly in-browser; shared `resolveImageSrc()` also normalizes host-only base URLs by prefixing `https://`.
- `packages/pdf/src/utils/tw.ts` acts as the safety bridge for `react-pdf-tailwind` in Sales PDF V2: it filters blank class tokens and maps unsupported classes like `col-span-*` to plain react-pdf style objects so ports from the legacy helper stay warning-free.
- Template behavior matches the legacy print flow for customer signoff: `invoice`, `quote`, and packing modes render the signature block, while `production` intentionally omits footer/signature content.
- Product image resolution in Sales PDF V2 mirrors the new sales form: stored image keys resolve through `NEXT_PUBLIC_CLOUDINARY_BASE_URL` under the `dyke/` bucket first, while absolute/data/blob URLs pass through unchanged.
- V2 now mirrors the legacy three-bucket content split: door-like sections (doors, mouldings, HPT services), shelf sections, and generic line-item sections. Generic invoice lines are composed separately from non-HPT, non-shelf sales items and then merged into `page.sections` by line order.
- Template 1 now appends a deduplicated end-of-document image reference block that collects unique row images, renders them in a larger grid, and labels each image with its row title.
- Existing public tokenized download URLs remain stable while preview URLs now target the HTML route.
- Shared JWT signing for tokenized sales document links now uses each token payload's own `expiry` timestamp for the JWT `exp` claim, preventing emailed quote/invoice download links from expiring after a blanket 1-hour window.
- The Sales Report customer-statement dialog now uses restarted `tables-2/customer-statement-report` and `tables-2/customer-statement-lines` surfaces for report recipients and statement line selection. The table migration preserves statement send, PDF download, include-invoices, customer email update, and existing customer statement query behavior while adding compact table-core rows, table-owned scroll, persisted settings, draggable/resizable columns, and content-tailored widths.
- Generated sales PDFs now embed a QR code that points to the signed HTML preview URL for that document snapshot.
- Sales PDF template config now resolves `HEADLINE_FIRST_PAGE = true` by default. PDF headers containing logo, document metadata, customer billing/shipping, and company address render only on the first physical page unless `config.headlineFirstPage` is explicitly set to `false`; template-1, template-2, and customer-statement embedded invoice rendering all share this default. Stored print viewer loads request `fresh=true` so the opened print page bypasses stale snapshot PDFs and reflects template changes immediately.
- Sales PDF section rendering now paginates visual section chunks inside the template layer. Section titles, table headers, and the first row stay together; long sections split into page-broken chunks that repeat the section title and table header on continuation pages. Door continuations omit repeated configuration/detail rows so the continued table starts compactly.
- Template 2 relies on explicit section chunk breaks rather than whole-chunk `minPresenceAhead`, with a `170` point first-page header estimate. This avoids over-reserving page space while preserving clean section lead-ins; the current invoice shape fits Garage Door, Interior Pre-Hung, and Door Slabs Only on page 1, then starts Bifold on page 2 with its title and table header.
- Sales PDF pagination now supports `pageBreakMode` / `PAGE_BREAK_MODE` policies: `header` is the default dense mode and allows a next section to start in remaining space when title + table header + one row fit; `section` keeps a whole section together when it can fit on a fresh page; `fullHeader` repeats door configuration/detail rows on continuation chunks. The mode is accepted by sales print viewer/download query params, tRPC print query inputs, and renderer config. Non-default modes bypass stored snapshot reuse so direct downloads render with the requested pagination policy instead of serving a stale/default snapshot.
- `/settings/sales` is the Super Admin sales-document configuration surface. It persists `sales-settings.meta.print` with `templateId`, `pageBreakMode`, `showImages`, and `headlineFirstPage`, and provides a live PDF preview against a selected recent order before save. Client print actions resolve these defaults server-side, propagate the complete renderer config through viewer, HTML-preview, and download URLs, and generate a new single-order snapshot when the current snapshot's stored renderer config differs. Existing payment-review and sales-form keys in `sales-settings.meta` are preserved.
- 2026-07-22: HTML sales previews render all door-section text in uppercase, including the section title, configuration details, headers, and row values, while preserving the existing casing of non-door sections.

- 2026-07-22: The Sales menu share action no longer embeds a fixed phone
  recipient. It uses the browser native share sheet when available and falls
  back to an unaddressed WhatsApp composer so the operator deliberately picks
  the recipient. The generated signed sales URL and message remain unchanged.
- 2026-07-23: Audited quote/order delivery replaces the ad hoc share action.
  Email, WhatsApp, and SMS use the composed sales document flow; direct-message
  bodies contain stable reusable `/sh/<slug>` links for the signed PDF and any
  available payment or quote-acceptance action. Direct-message delivery stops
  if a secure PDF link cannot be generated.
