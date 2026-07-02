import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import {
  IMPORT_RUN_SOURCES,
  IMPORT_STRATEGIES,
  INVENTORY_STATUS,
  STOCK_MODES,
} from "./constants";

export const INVENTORY_PRODUCT_KINDS = ["inventory", "component"] as const;
export const inventoryProductKindSchema = z.enum(INVENTORY_PRODUCT_KINDS);
export type InventoryProductKind = z.infer<typeof inventoryProductKindSchema>;
export const INVENTORY_IMPORT_SCOPES = ["active", "all"] as const;
export const inventoryImportScopeSchema = z.enum(INVENTORY_IMPORT_SCOPES);
export type InventoryImportScope = z.infer<typeof inventoryImportScopeSchema>;

export const inventoryImportSchema = z
  .object({
    q: z.string().optional().nullable(),
    scope: inventoryImportScopeSchema.optional().default("active"),
  })
  .extend(paginationSchema.shape);
export type InventoryImport = z.infer<typeof inventoryImportSchema>;

export const inventoryImportRunSchema = z.object({
  categoryId: z.number().optional().nullable(),
  scope: inventoryImportScopeSchema.optional().default("active"),
  strategy: z.enum(IMPORT_STRATEGIES).optional().default("optimized"),
  compare: z.boolean().optional().default(false),
  reset: z.boolean().optional().default(false),
  source: z.enum(IMPORT_RUN_SOURCES).optional().default("manual"),
});
export type InventoryImportRun = z.infer<typeof inventoryImportRunSchema>;

export const inventoryListSchema = z
  .object({
    categoryId: z.number().nullable().optional(),
    productKind: inventoryProductKindSchema.nullable().optional(),
    showCustom: z
      .preprocess((value) => (value == null ? false : value), z.boolean())
      .optional()
      .default(false),
    subCategoryInvId: z.number().nullable().optional(),
    subCategoryId: z.number().nullable().optional(),
    ids: z.array(z.number()).optional(),
    variantIds: z.array(z.number()).optional(),
  })
  .extend(paginationSchema.shape);
export type InventoryList = z.infer<typeof inventoryListSchema>;

export const inventoryCategoriesSchema = z
  .object({
    title: z.string().optional().nullable(),
    productKind: inventoryProductKindSchema.nullable().optional(),
  })
  .extend(paginationSchema.shape);
export type InventoryCategories = z.infer<typeof inventoryCategoriesSchema>;

export const inventoryProductKindReviewSchema = z
  .object({})
  .extend(paginationSchema.shape);
export type InventoryProductKindReview = z.infer<
  typeof inventoryProductKindReviewSchema
>;

export const stockAllocationReviewSchema = z
  .object({
    saleId: z.number().optional().nullable(),
    inventoryId: z.number().optional().nullable(),
    inventoryVariantId: z.number().optional().nullable(),
    status: z
      .array(
        z.enum([
          "pending_review",
          "approved",
          "reserved",
          "picked",
          "consumed",
          "released",
          "cancelled",
        ]),
      )
      .optional()
      .nullable(),
  })
  .extend(paginationSchema.shape);
export type StockAllocationReview = z.infer<typeof stockAllocationReviewSchema>;

const positiveIntegerIdSchema = z.number().int().positive();

export const approveStockAllocationSchema = z.object({
  allocationId: positiveIntegerIdSchema,
  approvedQty: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
});
export type ApproveStockAllocation = z.infer<
  typeof approveStockAllocationSchema
>;

export const rejectStockAllocationSchema = z.object({
  allocationId: positiveIntegerIdSchema,
  notes: z.string().optional().nullable(),
});
export type RejectStockAllocation = z.infer<typeof rejectStockAllocationSchema>;

export const bulkApproveStockAllocationSchema = z.object({
  allocationIds: z.array(positiveIntegerIdSchema).min(1),
  authorName: z.string().optional().nullable(),
});
export type BulkApproveStockAllocation = z.infer<
  typeof bulkApproveStockAllocationSchema
>;

export const inboundIssueTypeSchema = z.enum([
  "damaged",
  "missing",
  "wrong_item",
  "over_received",
  "quality_hold",
]);
export const inboundIssueStatusSchema = z.enum([
  "open",
  "supplier_notified",
  "replacement_pending",
  "resolved",
  "cancelled",
]);
export const inboundIssueResolutionTypeSchema = z.enum([
  "return_to_supplier",
  "replacement_requested",
  "credit_requested",
  "write_off",
  "accepted_with_adjustment",
]);

export const inventoryFormSchema = z.object({
  mode: z.string().optional().nullable(),
  product: z.object({
    description: z.string().optional().nullable(),
    name: z.string(),
    categoryId: z.number(),
    id: z.number().optional().nullable(),
    defaultSupplierId: z.number().optional().nullable(),
    productKind: inventoryProductKindSchema.default("inventory"),
    status: z.enum(INVENTORY_STATUS),
    stockMonitor: z.boolean().optional().default(false),
    primaryStoreFront: z.boolean().optional().default(false),
  }),
  suppliers: z
    .array(
      z.object({
        id: z.number().optional().nullable(),
        uid: z.string().optional().nullable(),
        name: z.string(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  supplierVariants: z
    .array(
      z.object({
        id: z.number().optional().nullable(),
        supplierId: z.number(),
        inventoryVariantId: z.number().optional().nullable(),
        variantUid: z.string().optional().nullable(),
        supplierSku: z.string().optional().nullable(),
        costPrice: z.number().optional().nullable(),
        salesPrice: z.number().optional().nullable(),
        minOrderQty: z.number().optional().nullable(),
        leadTimeDays: z.number().optional().nullable(),
        preferred: z.boolean().optional().default(false),
        active: z.boolean().optional().default(true),
      }),
    )
    .optional()
    .nullable(),
  subCategories: z.array(
    z.object({
      categoryId: z.number().optional().nullable(),
      valueIds: z.array(z.string()).optional().nullable(),
    }),
  ),
  subComponents: z.array(
    z.object({
      id: z.number().optional().nullable(),
      parentId: z.number(),
      defaultInventoryId: z.number().optional().nullable(),
      inventoryCategoryId: z.number(),
      index: z.number().default(0).optional().nullable(),
      status: z.enum(INVENTORY_STATUS).default("draft").optional().nullable(),
    }),
  ),
  images: z
    .array(
      z.object({
        altText: z.string().optional().nullable(),
        id: z.number(),
        imageGalleryId: z.number(),
        position: z.number(),
      }),
    )
    .optional()
    .nullable(),
  category: z
    .object({
      id: z.number(),
      enablePricing: z.boolean().optional().nullable(),
    })
    .optional()
    .nullable(),
  variants: z
    .array(
      z.object({
        sku: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
        price: z.number().optional().nullable(),
        cost: z.number().optional().nullable(),
        stock: z.number().optional().nullable(),
        lowStockAlert: z.number().optional().nullable(),
        attributes: z.array(
          z.object({
            id: z.number(),
            attributeId: z.number(),
            attributeInventoryId: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .nullable(),
});
export type InventoryForm = z.infer<typeof inventoryFormSchema>;

export const updateSubComponentSchema =
  inventoryFormSchema.shape.subComponents.element;
export type UpdateSubComponent = z.infer<typeof updateSubComponentSchema>;

export const getInventoryCategoriesSchema = z.object({
  productKind: inventoryProductKindSchema.nullable().optional(),
});
export type GetInventoryCategories = z.infer<
  typeof getInventoryCategoriesSchema
>;

export const variantFormSchema = z.object({
  id: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  oldPrice: z.number().optional().nullable(),
  pricingId: z.number().optional().nullable(),
  priceHistoryId: z.number().optional().nullable(),
  priceUpdateType: z.enum(["edit", "change"]).optional().nullable(),
  priceUpdateSource: z
    .enum(["manual update", "inbound stock", "bulk update"])
    .optional()
    .nullable(),
  changeReason: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  lowStockAlert: z.number().optional().nullable(),
  inventoryId: z.number(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(INVENTORY_STATUS).optional().nullable(),
  attributes: z
    .array(
      z.object({
        inventoryId: z.number(),
        attributeId: z.number(),
      }),
    )
    .optional()
    .nullable(),
});
export type VariantForm = z.infer<typeof variantFormSchema>;

export const inboundItemIssueFormSchema = z.object({
  id: positiveIntegerIdSchema.optional().nullable(),
  inboundShipmentItemId: positiveIntegerIdSchema,
  issueType: inboundIssueTypeSchema,
  reportedQty: z.number().positive(),
  notes: z.string().optional().nullable(),
  status: inboundIssueStatusSchema.optional().nullable(),
  resolutionType: inboundIssueResolutionTypeSchema.optional().nullable(),
  resolvedQty: z.number().nonnegative().optional().nullable(),
  authorName: z.string().optional().nullable(),
});
export type InboundItemIssueForm = z.infer<typeof inboundItemIssueFormSchema>;

export const resolveInboundItemIssueSchema = z.object({
  issueId: positiveIntegerIdSchema,
  status: inboundIssueStatusSchema.optional().nullable(),
  resolutionType: inboundIssueResolutionTypeSchema.optional().nullable(),
  resolvedQty: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
});
export type ResolveInboundItemIssue = z.infer<
  typeof resolveInboundItemIssueSchema
>;

export const inventoryCategoryFormSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
  productKind: inventoryProductKindSchema.default("inventory"),
  stockMode: z.enum(STOCK_MODES).optional().nullable().default("unmonitored"),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  enablePricing: z.boolean().optional().nullable().default(false),
  categoryIdSelector: z.number().optional().nullable(),
  categoryVariantAttributes: z.array(
    z.object({
      id: z.number().optional().nullable(),
      valuesInventoryCategoryId: z.number().nullable(),
      active: z.boolean().nullable(),
    }),
  ),
});
export type InventoryCategoryForm = z.infer<typeof inventoryCategoryFormSchema>;

export const updateCategoryVariantAttributeSchema = z.object({
  id: z.number().optional().nullable(),
  active: z.boolean(),
  inventoryCategoryId: z.number().optional(),
  valuesInventoryCategoryId: z.number().optional(),
});
export type UpdateCategoryVariantAttribute = z.infer<
  typeof updateCategoryVariantAttributeSchema
>;

export const updateCategoryStockModeSchema = z.object({
  id: z.number(),
  stockMode: z.enum(STOCK_MODES),
});
export type UpdateCategoryStockMode = z.infer<
  typeof updateCategoryStockModeSchema
>;
export const updateInventoryProductKindSchema = z.object({
  id: z.number(),
  productKind: inventoryProductKindSchema,
});
export type UpdateInventoryProductKind = z.infer<
  typeof updateInventoryProductKindSchema
>;
export const updateCategoryProductKindSchema = z.object({
  id: z.number(),
  productKind: inventoryProductKindSchema,
});
export type UpdateCategoryProductKind = z.infer<
  typeof updateCategoryProductKindSchema
>;

export const dykeStepComponentSchema = z.object({
  id: z.number().optional(),
  img: z.string().optional(),
  name: z.string(),
  productCode: z.string().optional(),
  custom: z.boolean().optional().default(false),
  stepId: z.number().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});
export type DykeStepComponent = z.infer<typeof dykeStepComponentSchema>;

export const upsertDykeCustomStepComponentSchema = z.object({
  id: z.number().optional(),
  uid: z.string().optional(),
  stepId: z.number(),
  title: z.string(),
  price: z.number().nullable().optional(),
  pricingId: z.number().optional(),
  dependenciesUid: z.string().optional(),
  img: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
});
export type UpsertDykeCustomStepComponent = z.infer<
  typeof upsertDykeCustomStepComponentSchema
>;

export const archiveDykeCustomStepComponentSchema = z
  .object({
    id: z.number().optional(),
    uid: z.string().optional(),
  })
  .refine((input) => Boolean(input.id || input.uid), {
    message: "Custom component id or uid is required",
  });
export type ArchiveDykeCustomStepComponent = z.infer<
  typeof archiveDykeCustomStepComponentSchema
>;

export const updateDykeComponentPricingSchema = z.object({
  stepId: z.number(),
  stepProductUid: z.string(),
  pricings: z.array(
    z.object({
      id: z.number().optional(),
      dependenciesUid: z.string().optional(),
      price: z.number().nullable().optional(),
    }),
  ),
  triggerInventorySync: z.boolean().optional().default(true),
});
export type UpdateDykeComponentPricing = z.infer<
  typeof updateDykeComponentPricingSchema
>;

export const dykeInventoryDriftReportSchema = z.object({
  stepId: z.number().optional().nullable(),
});
export type DykeInventoryDriftReport = z.infer<
  typeof dykeInventoryDriftReportSchema
>;

// ---- inventory-to-Dyke sync contracts ----

export const inventoryToDykeSyncSourceSchema = z.enum([
  "inventory-form",
  "category-form",
  "variant-form",
  "variant-price",
  "supplier-variant",
  "repair",
]);
export type InventoryToDykeSyncSource = z.infer<
  typeof inventoryToDykeSyncSourceSchema
>;

export const inventoryToDykeSyncPayloadSchema = z.object({
  inventoryCategoryId: z.number().optional().nullable(),
  inventoryId: z.number().optional().nullable(),
  inventoryVariantId: z.number().optional().nullable(),
  mode: z.enum(["compare", "sync"]).optional().default("sync"),
  source: inventoryToDykeSyncSourceSchema.optional().default("repair"),
  triggeredByUserId: z.number().optional().nullable(),
});
export type InventoryToDykeSyncPayload = z.infer<
  typeof inventoryToDykeSyncPayloadSchema
>;

export const syncSkipSchema = z.object({
  entity: z.enum(["category", "product", "variant", "pricing"]),
  inventoryId: z.number().optional().nullable(),
  inventoryVariantId: z.number().optional().nullable(),
  uid: z.string().optional().nullable(),
  reason: z.string(),
});
export type SyncSkip = z.infer<typeof syncSkipSchema>;

export const inventoryToDykeSyncResultSchema = z.object({
  mode: z.enum(["compare", "sync"]),
  source: z.string(),
  category: z.object({
    created: z.number(),
    updated: z.number(),
    archived: z.number(),
    skipped: z.array(syncSkipSchema),
  }),
  products: z.object({
    created: z.number(),
    updated: z.number(),
    archived: z.number(),
    skipped: z.array(syncSkipSchema),
  }),
  variants: z.object({
    created: z.number(),
    updated: z.number(),
    archived: z.number(),
    skipped: z.array(syncSkipSchema),
  }),
  pricing: z.object({
    created: z.number(),
    updated: z.number(),
    archived: z.number(),
    skipped: z.array(syncSkipSchema),
  }),
});
export type InventoryToDykeSyncResult = z.infer<
  typeof inventoryToDykeSyncResultSchema
>;

export const inventorySuppliersSchema = z.object({
  q: z.string().optional().nullable(),
});
export type InventorySuppliers = z.infer<typeof inventorySuppliersSchema>;

export const inventorySupplierFormSchema = z.object({
  id: z.number().optional().nullable(),
  uid: z.string().optional().nullable(),
  name: z.string(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type InventorySupplierForm = z.infer<typeof inventorySupplierFormSchema>;

export const deleteInventorySupplierSchema = z.object({
  id: z.number(),
});
export type DeleteInventorySupplier = z.infer<typeof deleteInventorySupplierSchema>;

export const supplierVariantFormSchema = z.object({
  id: z.number().optional().nullable(),
  supplierId: z.number(),
  inventoryVariantId: z.number(),
  supplierSku: z.string().optional().nullable(),
  costPrice: z.number().optional().nullable(),
  salesPrice: z.number().optional().nullable(),
  minOrderQty: z.number().optional().nullable(),
  leadTimeDays: z.number().optional().nullable(),
  preferred: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});
export type SupplierVariantForm = z.infer<typeof supplierVariantFormSchema>;
