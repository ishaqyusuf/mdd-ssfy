import type {
  ShelfProductOption,
  ShelfRowDraft,
  WorkflowComponentRecord,
  WorkflowRouteData,
  WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import {
  buildShelfProductRowPatch,
  buildInitialWorkflowShelfPatch,
  buildWorkflowServiceRowsContext,
  buildWorkflowServiceRowsPatch,
  createShelfProductDraft,
  isServiceItem,
  readSalesFormObjectMetadata,
  selectWorkflowRootComponent,
} from "@gnd/sales/sales-form-core";
import type {
  InvoiceCustomer,
  InvoiceCustomerProfile,
  InvoiceSelectableItem,
  InvoiceTaxProfile,
  NewSalesFormExtraCost,
  NewSalesFormLineItem,
  NewSalesFormMeta,
  NewSalesFormMobileRecord,
  NewSalesFormType,
} from "./types";
import { calculateInvoiceSummary } from "./lib/calculate-summary";

export const invoiceMobileWorkflowRouteData: WorkflowRouteData = {
  rootStepUid: "mobile-item-type",
  stepsByUid: {
    "mobile-item-type": {
      id: 100,
      uid: "mobile-item-type",
      title: "Item Type",
    },
    "mobile-door-style": {
      id: 101,
      uid: "mobile-door-style",
      title: "Door",
    },
    "mobile-moulding-style": {
      id: 102,
      uid: "mobile-moulding-style",
      title: "Moulding",
    },
    "mobile-line-item": {
      id: 103,
      uid: "mobile-line-item",
      title: "Line Item",
    },
    "mobile-shelf-line": {
      id: 104,
      uid: "mobile-shelf-line",
      title: "Shelf",
    },
  },
  stepsById: {
    100: "mobile-item-type",
    101: "mobile-door-style",
    102: "mobile-moulding-style",
    103: "mobile-line-item",
    104: "mobile-shelf-line",
  },
  composedRouter: {
    "workflow-door-package": {
      routeSequence: [
        { uid: "mobile-door-style" },
        { uid: "mobile-line-item" },
      ],
    },
    "workflow-moulding-package": {
      routeSequence: [
        { uid: "mobile-moulding-style" },
        { uid: "mobile-line-item" },
      ],
    },
    "workflow-shelf-items": {
      routeSequence: [{ uid: "mobile-shelf-line" }],
    },
    "workflow-service-items": {
      routeSequence: [{ uid: "mobile-line-item" }],
    },
  },
};

export const invoiceCustomers: InvoiceCustomer[] = [
  {
    id: 101,
    profileId: 1,
    name: "Acme Builders",
    businessName: "Acme Builders",
    contact: "David Chen",
    phone: "(555) 123-4567",
    email: "accounts@acmebuilders.com",
    billingAddressId: 9001,
    shippingAddressId: 9002,
    billingAddress: "1400 Market St, Dallas, TX 75201",
    shippingAddress: "2810 Jobsite Rd, Plano, TX 75024",
    paymentTerm: "Net 30",
    taxCode: "TX-7.5",
  },
  {
    id: 102,
    profileId: 2,
    name: "Northline Homes",
    businessName: "Northline Homes",
    contact: "Maya Patel",
    phone: "(555) 232-0011",
    email: "orders@northlinehomes.com",
    billingAddressId: 9011,
    shippingAddressId: 9012,
    billingAddress: "800 Commerce Dr, Austin, TX 78701",
    shippingAddress: "77 Framing Way, Round Rock, TX 78664",
    paymentTerm: "Net 15",
    taxCode: "TX-7.5",
  },
  {
    id: 103,
    profileId: null,
    name: "Sterling Renovations",
    businessName: "Sterling Renovations",
    contact: "Luis Romero",
    phone: "(555) 810-4420",
    email: "billing@sterlingreno.com",
    billingAddressId: 9021,
    shippingAddressId: 9022,
    billingAddress: "42 Oak Ave, Houston, TX 77002",
    shippingAddress: "930 Remodel Ln, Katy, TX 77494",
    paymentTerm: "Due on Receipt",
    taxCode: "TX-7.5",
  },
];

export const invoiceCustomerProfiles: InvoiceCustomerProfile[] = [
  {
    id: 1,
    title: "Builder",
    coefficient: 1,
    meta: { netTerm: "Net 30" },
  },
  {
    id: 2,
    title: "Preferred Builder",
    coefficient: 0.92,
    meta: { netTerm: "Net 15" },
  },
];

export const invoiceTaxProfiles: InvoiceTaxProfile[] = [
  {
    taxCode: "TX-7.5",
    title: "Texas Standard",
    percentage: 7.5,
  },
  {
    taxCode: "TX-8.25",
    title: "Texas Metro",
    percentage: 8.25,
  },
];

export const invoiceSelectableItems: InvoiceSelectableItem[] = [
  {
    uid: "workflow-door-package",
    source: "workflow",
    componentId: 1101,
    componentUid: "workflow-door-package",
    title: "Door",
    sku: "WF-DOOR-PKG",
    category: "Components",
    unitPrice: 0,
    basePrice: 0,
    salesPrice: 0,
    taxxable: true,
    status: "Configure",
  },
  {
    uid: "workflow-moulding-package",
    source: "workflow",
    componentId: 1102,
    componentUid: "workflow-moulding-package",
    title: "Moulding",
    sku: "WF-MLD-PKG",
    category: "Components",
    unitPrice: 0,
    basePrice: 0,
    salesPrice: 0,
    taxxable: true,
    status: "Configure",
  },
  {
    uid: "workflow-shelf-items",
    source: "workflow",
    componentId: 1103,
    componentUid: "workflow-shelf-items",
    title: "Shelf Items",
    sku: "WF-SHELF",
    category: "Components",
    unitPrice: 0,
    basePrice: 0,
    salesPrice: 0,
    taxxable: true,
    status: "Configure",
  },
  {
    uid: "workflow-service-items",
    source: "workflow",
    componentId: 1104,
    componentUid: "workflow-service-items",
    title: "Services",
    sku: "WF-SERVICE",
    category: "Components",
    unitPrice: 125,
    basePrice: 125,
    salesPrice: 125,
    taxxable: false,
    status: "Configure",
  },
  {
    uid: "prod-door-rh",
    source: "shelf",
    productId: 501,
    title: "Interior Door - RH",
    sku: "DR-INT-RH",
    category: "Doors",
    categoryId: 21,
    parentCategoryId: 2,
    categoryIds: [2, 21],
    unitPrice: 420,
    basePrice: 420,
    salesPrice: 420,
    taxxable: true,
    status: "Available",
  },
  {
    uid: "prod-ext-slab",
    source: "shelf",
    productId: 502,
    title: "Exterior Door Slab",
    sku: "DR-EXT-SLAB",
    category: "Doors",
    categoryId: 22,
    parentCategoryId: 2,
    categoryIds: [2, 22],
    unitPrice: 685,
    basePrice: 685,
    salesPrice: 685,
    taxxable: true,
    status: "Low stock",
  },
  {
    uid: "prod-casing",
    source: "shelf",
    productId: 610,
    title: "Casing Package",
    sku: "MLD-CAS-07",
    category: "Moulding",
    categoryId: 31,
    parentCategoryId: 3,
    categoryIds: [3, 31],
    unitPrice: 86.5,
    basePrice: 86.5,
    salesPrice: 86.5,
    taxxable: true,
    status: "Available",
  },
  {
    uid: "prod-hinge",
    source: "shelf",
    productId: 720,
    title: "Hinge Set",
    sku: "HDW-HINGE-03",
    category: "Hardware",
    categoryId: 41,
    parentCategoryId: 4,
    categoryIds: [4, 41],
    unitPrice: 24,
    basePrice: 24,
    salesPrice: 24,
    taxxable: true,
    status: "Available",
  },
  {
    uid: "svc-install",
    source: "service",
    title: "Install Labor",
    sku: "LAB-INSTALL",
    category: "Labor",
    unitPrice: 351.33,
    taxxable: false,
    status: "Service",
  },
];

export const invoiceWorkflowStepComponents: Record<
  string,
  WorkflowComponentRecord[]
> = {
  "mobile-item-type": [
    {
      id: 1101,
      uid: "workflow-door-package",
      title: "Door",
      salesPrice: 0,
      basePrice: 0,
    },
    {
      id: 1102,
      uid: "workflow-moulding-package",
      title: "Moulding",
      salesPrice: 0,
      basePrice: 0,
    },
    {
      id: 1103,
      uid: "workflow-shelf-items",
      title: "Shelf Items",
      salesPrice: 0,
      basePrice: 0,
    },
    {
      id: 1104,
      uid: "workflow-service-items",
      title: "Services",
      salesPrice: 125,
      basePrice: 125,
    },
  ],
  "mobile-door-style": [
    {
      id: 2101,
      uid: "door-two-panel",
      title: "Two Panel Shaker",
      salesPrice: 420,
      basePrice: 420,
    },
    {
      id: 2102,
      uid: "door-five-panel",
      title: "Five Panel Craftsman",
      salesPrice: 485,
      basePrice: 485,
    },
  ],
  "mobile-moulding-style": [
    {
      id: 2201,
      uid: "moulding-colonial",
      title: "Colonial Casing",
      salesPrice: 86.5,
      basePrice: 86.5,
    },
    {
      id: 2202,
      uid: "moulding-modern-flat",
      title: "Modern Flat Stock",
      salesPrice: 92,
      basePrice: 92,
    },
  ],
  "mobile-line-item": [
    {
      id: 2301,
      uid: "line-standard-install",
      title: "Standard Install",
      salesPrice: 125,
      basePrice: 125,
    },
    {
      id: 2302,
      uid: "line-premium-finish",
      title: "Premium Finish",
      salesPrice: 180,
      basePrice: 180,
    },
  ],
};

export const defaultInvoiceMeta: NewSalesFormMeta = {
  customerId: 101,
  customerProfileId: 1,
  billingAddressId: 9001,
  shippingAddressId: 9002,
  paymentTerm: "Net 30",
  createdAt: "2026-06-10",
  paymentDueDate: "2026-07-10",
  po: "PO-1186",
  notes: "Deliver all materials to the Plano jobsite.",
  deliveryOption: "delivery",
  paymentMethod: "Credit Card",
  taxCode: "TX-7.5",
};

export const defaultExtraCosts: NewSalesFormExtraCost[] = [
  {
    label: "Preferred builder discount",
    type: "Discount",
    amount: 125,
    taxxable: false,
  },
  {
    label: "Delivery",
    type: "Delivery",
    amount: 75,
    taxxable: true,
  },
];

export function createLineItem(
  item: InvoiceSelectableItem,
  qty: number,
  routeData?: WorkflowRouteData | null,
  profileCoefficient = 1,
): NewSalesFormLineItem {
  if (item.source === "workflow" || item.componentUid) {
    return createWorkflowLineItem(item, qty, routeData, profileCoefficient);
  }

  const baseUnitPrice = Number(
    item.basePrice ?? item.unitPrice ?? item.salesPrice ?? 0,
  );
  const shelfProduct: ShelfProductOption | null = item.productId
    ? {
        id: item.productId,
        title: item.title,
        unitPrice: baseUnitPrice,
        categoryId: item.categoryId ?? null,
        parentCategoryId: item.parentCategoryId ?? null,
        categoryPath: (item.categoryIds || []).map((id) => ({ id })),
      }
    : null;
  const shelfRow: ShelfRowDraft | null = shelfProduct
    ? buildShelfProductRowPatch({
        row: {
          ...createShelfProductDraft(),
          uid: `shelf-${item.productId}-${Date.now().toString(36)}`,
          qty,
        },
        product: shelfProduct,
        categories: [],
        profileCoefficient,
      })
    : null;
  const shelfItems = shelfRow
    ? [
        {
          ...shelfRow,
          meta: {
            ...(readSalesFormObjectMetadata(shelfRow.meta) || {}),
            sku: item.sku,
            category: item.category,
          },
        },
      ]
    : [];
  const unitPrice = shelfRow
    ? Number(shelfRow.unitPrice || 0)
    : Number(item.salesPrice ?? item.unitPrice ?? 0);
  const lineTotal = shelfRow
    ? Number(shelfRow.totalPrice || 0)
    : Number((qty * unitPrice).toFixed(2));

  return {
    uid: `${item.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: item.title,
    description: item.sku,
    qty,
    unitPrice,
    lineTotal,
    taxxable: item.taxxable,
    meta: {
      sku: item.sku,
      category: item.category,
      status: item.status,
      sourceUid: item.uid,
      shelfProductId: item.productId ?? null,
    },
    formSteps: [],
    shelfItems,
    housePackageTool: null,
  };
}

function createWorkflowLineItem(
  item: InvoiceSelectableItem,
  qty: number,
  routeData?: WorkflowRouteData | null,
  profileCoefficient = 1,
): NewSalesFormLineItem {
  const unitPrice = Number(item.salesPrice ?? item.unitPrice ?? 0);
  const lineTotal = Number((qty * unitPrice).toFixed(2));
  const component: WorkflowComponentRecord = {
    id: item.componentId ?? null,
    uid: item.componentUid || item.uid,
    title: item.title,
    salesPrice: item.salesPrice ?? item.unitPrice ?? null,
    basePrice: item.basePrice ?? item.unitPrice ?? null,
  };
  const uid = `${item.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const line = {
    uid,
    title: "New Line",
    description: item.title,
    qty,
    unitPrice,
    lineTotal,
    taxxable: item.taxxable,
    meta: {
      sku: item.title,
      category: item.category,
      sourceUid: item.uid,
      workflowComponentUid: component.uid,
    },
    formSteps: [] as WorkflowStepRecord[],
    shelfItems: [],
    housePackageTool: null,
  } satisfies NewSalesFormLineItem;
  const selected = selectWorkflowRootComponent({
    routeData: routeData || invoiceMobileWorkflowRouteData,
    line,
    component,
  });

  const selectedLine = {
    ...line,
    ...(selected?.linePatch || {}),
    title: selected?.linePatch.title || item.title,
  };
  const groupedPatch = buildInitialGroupedWorkflowLinePatch(
    selectedLine,
    profileCoefficient,
  );

  return {
    ...selectedLine,
    ...groupedPatch,
  };
}

function buildInitialGroupedWorkflowLinePatch(
  line: NewSalesFormLineItem,
  profileCoefficient: number,
): Partial<NewSalesFormLineItem> {
  const shelfPatch = buildInitialWorkflowShelfPatch(line, profileCoefficient);
  if (shelfPatch) {
    return shelfPatch.linePatch as Partial<NewSalesFormLineItem>;
  }

  if (isServiceItem(line)) {
    const serviceContext = buildWorkflowServiceRowsContext(line);
    return buildWorkflowServiceRowsPatch({
      line,
      rows: serviceContext.rows,
    }) as Partial<NewSalesFormLineItem>;
  }

  return {};
}

export function createDefaultLineItems() {
  return [createBlankWorkflowLineItem()];
}

function createBlankWorkflowLineItem(): NewSalesFormLineItem {
  return {
    uid: `workflow-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "New Line",
    description: "",
    qty: 1,
    unitPrice: 0,
    lineTotal: 0,
    taxxable: true,
    meta: {
      category: "Components",
      status: "Configure",
      workflowSeed: true,
    },
    formSteps: [
      {
        stepId: null,
        step: {
          id: null,
          uid: null,
          title: "Item Type",
        },
        meta: {},
      },
    ],
    shelfItems: [],
    housePackageTool: null,
  };
}

export function createMockNewSalesFormRecord(
  type: NewSalesFormType = "order",
): NewSalesFormMobileRecord {
  const lineItems = createDefaultLineItems();
  const taxRate = 7.5;
  const settings = {
    cccPercentage: 3.5,
  };

  return {
    type,
    salesId: null,
    slug: null,
    orderId: null,
    inventoryStatus: null,
    version: `mock-new-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    customer: invoiceCustomers[0] || null,
    form: defaultInvoiceMeta,
    lineItems,
    extraCosts: defaultExtraCosts,
    summary: calculateInvoiceSummary({
      lineItems,
      extraCosts: defaultExtraCosts,
      taxRate,
      paymentMethod: defaultInvoiceMeta.paymentMethod,
      cccPercentage: settings.cccPercentage,
    }),
    settings,
  };
}
