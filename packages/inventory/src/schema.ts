import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import {
  IMPORT_RUN_SOURCES,
  IMPORT_STRATEGIES,
  INVENTORY_STATUS,
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
  })
  .extend(paginationSchema.shape);
export type InventoryCategories = z.infer<typeof inventoryCategoriesSchema>;

export const inventoryFormSchema = z.object({
  mode: z.string().optional().nullable(),
  product: z.object({
    description: z.string().optional().nullable(),
    name: z.string(),
    categoryId: z.number(),
    id: z.number().optional().nullable(),
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

export const getInventoryCategoriesSchema = z.object({});
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

export const inventoryCategoryFormSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
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
