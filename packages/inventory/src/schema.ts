import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import {
  IMPORT_RUN_SOURCES,
  IMPORT_STRATEGIES,
  INVENTORY_STATUS,
} from "./constants";

export const inventoryImportSchema = z.object({}).extend(paginationSchema.shape);
export type InventoryImport = z.infer<typeof inventoryImportSchema>;

export const inventoryImportRunSchema = z.object({
  categoryId: z.number().optional().nullable(),
  strategy: z.enum(IMPORT_STRATEGIES).optional().default("optimized"),
  compare: z.boolean().optional().default(false),
  reset: z.boolean().optional().default(false),
  source: z.enum(IMPORT_RUN_SOURCES).optional().default("manual"),
});
export type InventoryImportRun = z.infer<typeof inventoryImportRunSchema>;

export const inventoryListSchema = z
  .object({
    categoryId: z.number().nullable().optional(),
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
    status: z.enum(INVENTORY_STATUS),
    stockMonitor: z.boolean().optional().default(false),
    primaryStoreFront: z.boolean().optional().default(false),
  }),
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
