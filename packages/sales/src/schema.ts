import {
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  PRODUCTION_STATUS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesType,
} from "@gnd/utils/constants";
import { z } from "zod";
import { SALES_DISPATCH_STATUS } from "./utils/constants";
import { INVENTORY_STATUS, SalesProductionStatusFilter } from "./constants";
import { paginationSchema } from "@gnd/utils/schema";
import { id } from "date-fns/locale";
export const getFullSalesDataSchema = z.object({
  salesId: z.number().optional().nullable(),
  salesNo: z.string().optional().nullable(),
  assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
const qty = z.object({
  lh: z.number().nullable().optional(),
  rh: z.number().nullable().optional(),
  qty: z.number().nullable().optional(),
});
export const resetSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
    authorName: z.string(),
  }),
});
export type ResetSalesControl = z.infer<typeof resetSalesControlSchema>;

export const dispatchForm = z.object({
  dispatchId: z.number(),
  receivedBy: z.string(),
  receivedDate: z.date().optional().nullable(),
  note: z.string().optional(),
  signature: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        pathname: z.string(),
      })
    )
    .optional()
    .nullable(),
});
export const updateSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
    authorName: z.string(),
  }),
  cancelDispatch: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
  startDispatch: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
  clearPackings: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
  submitAll: z
    .object({
      assignedToId: z.number().nullable().optional(),
      itemUids: z.array(z.string()).optional().nullable(),
      selections: z
        .array(
          z.object({
            assignmentId: z.number(),
            qty: qty.optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
    .nullable()
    .optional(),
  packItems: z
    .object({
      dispatchId: z.number(),
      dispatchStatus: z.enum(SALES_DISPATCH_STATUS),
      packingList: z
        .array(
          z.object({
            salesItemId: z.number(),
            // itemControlUid: z.string(),
            submissions: z.array(
              z.object({
                submissionId: z.number(),
                qty: qty,
              })
            ),
            note: z.string().optional(),
          })
        )
        .nullable(),
    })
    .nullable()
    .optional(),
  submitDispatch: dispatchForm.optional().nullable(),
});

export type UpdateSalesControl = z.infer<typeof updateSalesControlSchema>;

export const salesQueryParamsSchema = z
  .object({
    salesNo: z.string().optional().nullable(),
    salesNos: z.array(z.string()).optional().nullable(),
    salesIds: z.array(z.number()).optional().nullable(),
    salesType: z.enum(salesType).optional().nullable(),
    "customer.name": z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    po: z.string().optional().nullable(),
    "sales.rep": z.string().optional().nullable(),
    orderNo: z.string().optional().nullable(),
    "dispatch.status": z
      .enum(SALES_DISPATCH_FILTER_OPTIONS)
      .optional()
      .nullable(),
    "production.assignedToId": z.number().optional().nullable(),
    "production.dueDate": z.array(z.any()).optional().nullable(),
    "production.status": z.enum(PRODUCTION_STATUS).optional().nullable(),
    "production.assignment": z
      .enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
      .optional()
      .nullable(),
    invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
    production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
  })
  .merge(paginationSchema);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const deletePackingSchema = z.object({
  salesId: z.number(),
  packingId: z.number().optional().nullable(),
  packingUid: z.string().optional().nullable(),
  deleteBy: z.string(),
});
export type DeletePackingSchema = z.infer<typeof deletePackingSchema>;

export const inventoryImportSchema = z
  .object({
    // category: z.string(),
  })
  .merge(paginationSchema);
export type InventoryImport = z.infer<typeof inventoryImportSchema>;
export const inventoryListSchema = z
  .object({
    categoryId: z.number().nullable().optional(),
  })
  .merge(paginationSchema);
export type InventoryList = z.infer<typeof inventoryListSchema>;
export const inventoryCategoriesSchema = z.object({}).merge(paginationSchema);
export type InventoryCategories = z.infer<typeof inventoryCategoriesSchema>;
export const inventoryFormSchema = z.object({
  product: z.object({
    description: z.string().optional().nullable(),
    name: z.string(),
    categoryId: z.number(),
    id: z.number().optional().nullable(),
    status: z.enum(INVENTORY_STATUS),
    stockMonitor: z.boolean().optional().default(false),
  }),
  subCategories: z.array(
    z.object({
      categoryId: z.number().optional().nullable(),
      valueIds: z.array(z.string()).optional().nullable(),
      // values: z.array(
      //   z.object({
      //     id: z.number().optional().nullable(),
      //     deleted: z.boolean().optional().default(false),
      //     inventoryId: z.number().optional().nullable(),
      //   })
      // ),
    })
  ),
  subComponents: z.array(
    z.object({
      parentId: z.number(),
      defaultInventoryId: z.number().optional().nullable(),
      inventoryCategoryId: z.number(),
      index: z.number().default(0).optional().nullable(),
      status: z
        .enum(INVENTORY_STATUS)
        .default("published")
        .optional()
        .nullable(),
    })
  ),
  images: z
    .array(
      z.object({
        altText: z.string().optional().nullable(),
        id: z.number(),
        imageGalleryId: z.number(),
        position: z.number(),
      })
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
          })
        ),
      })
    )
    .optional()
    .nullable(),
});
export const updateSubComponentSchema =
  inventoryFormSchema.shape.subComponents.element;
export type UpdateSubComponent = z.infer<typeof updateSubComponentSchema>;
export type InventoryForm = z.infer<typeof inventoryFormSchema>;
export const getInventoryCategoriesSchema = z.object({
  // example: z.string(),
});
export type GetInventoryCategories = z.infer<
  typeof getInventoryCategoriesSchema
>;

export const salesProductionQueryParamsSchema = z
  .object({
    assignedToId: z.number().optional().nullable(),
    workerId: z.number().optional().nullable(),
    production: z.custom<SalesProductionStatusFilter>().optional().nullable(),
    salesNo: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type SalesProductionQueryParams = z.infer<
  typeof salesProductionQueryParamsSchema
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
      })
    )
    .optional()
    .nullable(),
});
export type VariantForm = z.infer<typeof variantFormSchema>;

export const inventoryCategoryFormSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  enablePricing: z.boolean().optional().nullable().default(false),
  categoryIdSelector: z.number().optional().nullable(),
  categoryVariantAttributes: z.array(
    z.object({
      id: z.number().optional().nullable(),
      valuesInventoryCategoryId: z.number().nullable(),
      active: z.boolean().nullable(),
    })
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
