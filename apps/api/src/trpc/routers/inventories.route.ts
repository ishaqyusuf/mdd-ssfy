// import { upsertInventoriesForDykeShelfProductsSchema } from "@api/db/queries/inventory";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import { z } from "zod";
import {
  getInventoryCategoryByShelfId,
  upsertInventoriesForDykeShelfProducts,
  upsertInventoriesForDykeShelfProductsSchema,
} from "@api/db/queries/inventory.generate";
import {
  getInventoryCategoriesSchema,
  inventoryCategoriesSchema,
  inventoryCategoryFormSchema,
  inventoryFormSchema,
  inventoryImportSchema,
  inventoryImportRunSchema,
  inventoryListSchema,
  updateCategoryVariantAttributeSchema,
  updateSubComponentSchema,
  variantFormSchema,
} from "@gnd/inventory/schema";
import { getStoreAddonComponentFormSchema } from "@gnd/sales/schema";
import {
  deleteInventories,
  deleteInventoryCategory,
  getInventoryCategories,
  getInventoryCategoryAttributes,
  getInventoryCategoryForm,
  inventoryCategories,
  inventoryForm,
  inventoryList,
  inventorySummary,
  inventorySummarySchema,
  inventoryVariantStockForm,
  resetInventorySystem,
  runFullInventoryImport,
  saveInventory,
  saveInventoryCategoryForm,
  saveVariantForm,
  updateCategoryVariantAttribute,
  dykeUpdateFromInventory,
  inventoryUpdateFromDyke,
  updateSubCategory,
  updateSubCategorySchema,
  updateVariantCost,
  updateVariantCostSchema,
  updateVariantStatus,
  updateVariantStatusSchema,
  updateSubComponent,
  createInboundShipmentFromDemands,
  getInboundDemandQueue,
  getInboundShipmentDetail,
  receiveInboundShipment,
} from "@gnd/inventory";
import { getStoreAddonComponentForm } from "@sales/storefront-product";
import { inventoryImport } from "@gnd/inventory/inventory-import";
import { idSchema } from "@api/schemas/common";
import { INVENTORY_STATUS } from "@gnd/inventory/constants";
import {
  saveCommunityInput,
  saveCommunityInputSchema,
} from "@community/community-template-schemas";
import {
  applyInboundExtractionQuery,
  assignInboundDemandsQuery,
  createInboundShipmentQuery,
  extractInboundDocumentsQuery,
  getInboundActivityQuery,
  getInboundExtractionsQuery,
  listInboundDocumentsQuery,
  listInboundShipmentsQuery,
  listInboundSuppliers,
  uploadInboundDocumentsQuery,
} from "@api/db/queries/inbound-receiving";
// import {
//   dimensionalWeightFormSchema,
//   flatRateFormSchema,
//   getShippingCalculationConfig,
//   perItemFormSchema,
//   priceBasedFormSchema,
//   saveDimensionalWeightConfig,
//   saveFlatRateConfig,
//   savePerItemConfig,
//   savePriceBasedConfig,
//   saveWeightBasedConfig,
//   saveZoneBasedConfig,
//   weightBasedFormSchema,
//   zoneBasedFormSchema,
// } from "@sales/shipping";
export const inventoriesRouter = createTRPCRouter({
  inboundShipments: protectedProcedure
    .input(
      z.object({
        status: z
          .array(z.enum(["pending", "in_progress", "completed", "cancelled"]))
          .optional(),
        supplierId: z.number().optional().nullable(),
      }),
    )
    .query(async (props) => {
      return listInboundShipmentsQuery(props.ctx, props.input);
    }),
  inboundSuppliers: protectedProcedure.query(async (props) => {
    return listInboundSuppliers(props.ctx);
  }),
  createInboundShipment: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        reference: z.string().optional().nullable(),
        expectedAt: z.date().optional().nullable(),
      }),
    )
    .mutation(async (props) => {
      return createInboundShipmentQuery(props.ctx, props.input);
    }),
  inboundDemandQueue: protectedProcedure
    .input(
      z.object({
        status: z
          .array(
            z.enum([
              "pending",
              "ordered",
              "partially_received",
              "received",
              "cancelled",
            ])
          )
          .optional(),
        supplierId: z.number().optional().nullable(),
        saleId: z.number().optional().nullable(),
      })
    )
    .query(async (props) => {
      return getInboundDemandQueue(props.ctx.db, props.input);
    }),
  inboundShipmentDetail: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
      })
    )
    .query(async (props) => {
      return getInboundShipmentDetail(props.ctx.db, props.input);
    }),
  inboundDocuments: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
      }),
    )
    .query(async (props) => {
      return listInboundDocumentsQuery(props.ctx, props.input.inboundId);
    }),
  uploadInboundDocuments: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
        note: z.string().optional().nullable(),
        files: z
          .array(
            z.object({
              filename: z.string().min(1),
              contentType: z.string().optional().nullable(),
              contentBase64: z.string().min(1),
              size: z.number().optional().nullable(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async (props) => {
      return uploadInboundDocumentsQuery(props.ctx, props.input);
    }),
  inboundExtractions: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
      }),
    )
    .query(async (props) => {
      return getInboundExtractionsQuery(props.ctx, props.input.inboundId);
    }),
  extractInboundDocuments: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
        documentId: z.string().optional().nullable(),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async (props) => {
      return extractInboundDocumentsQuery(props.ctx, props.input);
    }),
  applyInboundExtraction: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
        extractionId: z.number(),
        autoAssignDemands: z.boolean().optional(),
      }),
    )
    .mutation(async (props) => {
      return applyInboundExtractionQuery(props.ctx, props.input);
    }),
  assignInboundDemands: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
        demandIds: z.array(z.number()).min(1),
      }),
    )
    .mutation(async (props) => {
      return assignInboundDemandsQuery(props.ctx, props.input);
    }),
  inboundActivity: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
      }),
    )
    .query(async (props) => {
      return getInboundActivityQuery(props.ctx, props.input.inboundId);
    }),
  createInboundShipmentFromDemands: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        demandIds: z.array(z.number()).min(1),
        reference: z.string().optional().nullable(),
        expectedAt: z.date().optional().nullable(),
      })
    )
    .mutation(async (props) => {
      return createInboundShipmentFromDemands(props.ctx.db, props.input);
    }),
  receiveInboundShipment: protectedProcedure
    .input(
      z.object({
        inboundId: z.number(),
        receivedAt: z.date().optional().nullable(),
        items: z
          .array(
            z.object({
              inboundShipmentItemId: z.number(),
              qtyReceived: z.number().optional().nullable(),
              unitPrice: z.number().optional().nullable(),
            })
          )
          .optional(),
      })
    )
    .mutation(async (props) => {
      return receiveInboundShipment(props.ctx.db, {
        ...props.input,
        authorName: String(props.ctx.userId),
      });
    }),
  saveCommunityInput: publicProcedure
    .input(saveCommunityInputSchema)
    .mutation(async (props) => {
      return saveCommunityInput(props.ctx.db, props.input);
    }),
  deleteInventories: publicProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1),
      })
    )
    .mutation(async (props) => {
      return deleteInventories(props.ctx.db, props.input.ids);
    }),
  deleteInventoryCategory: publicProcedure
    .input(idSchema)
    .mutation(async (props) => {
      return deleteInventoryCategory(props.ctx.db, props.input.id);
    }),
  deleteSubComponent: publicProcedure
    .input(idSchema)
    .mutation(async (props) => {
      await props.ctx.db.subComponents.update({
        where: {
          id: props.input.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }),

  getStoreAddonComponentForm: publicProcedure
    .input(getStoreAddonComponentFormSchema)
    .query(async (props) => {
      const result = await getStoreAddonComponentForm(
        props.ctx.db,
        props.input
      );
      return result;
    }),
  getInventoryTypeByShelfId: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .query(async (props) => {
      return getInventoryCategoryByShelfId(props.ctx, props.input.categoryId);
    }),
  inventorySummary: publicProcedure
    .input(inventorySummarySchema)
    .query(async (props) => {
      const result = await inventorySummary(props.ctx.db, props.input);
      return result;
    }),
  upsertShelfProducts: publicProcedure
    .input(upsertInventoriesForDykeShelfProductsSchema)
    .mutation(async (props) => {
      return upsertInventoriesForDykeShelfProducts(props.ctx, props.input);
    }),
  upsertComponents: publicProcedure
    .input(
      upsertInventoriesForDykeShelfProductsSchema.extend(
        inventoryImportRunSchema.shape
      )
    )
    .mutation(async (props) => {
      return {
        data: await inventoryUpdateFromDyke(props.ctx.db, {
          stepId: props.input.categoryId,
          compare: props.input.compare,
          strategy: props.input.strategy,
          source: props.input.source,
        }),
      };
    }),
  runFullImport: publicProcedure
    .input(inventoryImportRunSchema)
    .mutation(async (props) => {
      return runFullInventoryImport(props.ctx.db, props.input);
    }),
  inventoryUpdateFromDyke: publicProcedure
    .input(
      z.object({
        stepId: z.number(),
        compare: z.boolean().optional(),
        strategy: inventoryImportRunSchema.shape.strategy,
        source: inventoryImportRunSchema.shape.source,
      })
    )
    .mutation(async (props) => {
      return inventoryUpdateFromDyke(props.ctx.db, props.input);
    }),
  dykeUpdateFromInventory: publicProcedure
    .input(
      z.object({
        inventoryCategoryId: z.number().optional().nullable(),
        inventoryId: z.number().optional().nullable(),
        syncTitle: z.boolean().optional(),
        syncImage: z.boolean().optional(),
      })
    )
    .mutation(async (props) => {
      return dykeUpdateFromInventory(props.ctx.db, props.input);
    }),
  getInventoryCategories: publicProcedure
    .input(getInventoryCategoriesSchema)
    .query(async (props) => {
      const result = await getInventoryCategories(props.ctx.db, props.input);
      return result;
    }),
  getInventoryCategoryAttributes: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .query(async (props) => {
      return await getInventoryCategoryAttributes(
        props.ctx.db,
        props.input.categoryId
      );
    }),
  inventoryImports: publicProcedure
    .input(inventoryImportSchema)
    .query(async (props) => {
      return inventoryImport(props.ctx.db, props.input);
    }),
  inventoryProducts: publicProcedure
    .input(inventoryListSchema)
    .query(async (props) => {
      return inventoryList(props.ctx.db, props.input);
    }),
  inventoryCategories: publicProcedure
    .input(inventoryCategoriesSchema)
    .query(async (props) => {
      const result = await inventoryCategories(props.ctx.db, props.input);
      return result;
    }),
  inventoryCategoryForm: publicProcedure
    .input(z.number())
    .query(async (props) => {
      const result = await getInventoryCategoryForm(props.ctx.db, props.input);
      return result;
    }),
  resetInventorySystem: publicProcedure
    // .input(resetInventoriesSchema)
    .mutation(async (props) => {
      return resetInventorySystem(props.ctx.db);
    }),
  saveInventoryCategory: publicProcedure
    .input(inventoryCategoryFormSchema)
    .mutation(async (props) => {
      return saveInventoryCategoryForm(props.ctx.db, props.input);
    }),
  inventoryForm: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async (props) => {
      const result = await inventoryForm(props.ctx.db, props.input.id);
      return result;
    }),
  saveInventory: publicProcedure
    .input(inventoryFormSchema)
    .mutation(async (props) => {
      return saveInventory(props.ctx.db, props.input);
    }),
  inventoryVariantStockForm: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async (props) => {
      const result = await inventoryVariantStockForm(
        props.ctx.db,
        props.input.id
      );
      return result;
    }),
  updateCategoryVariantAttribute: publicProcedure
    .input(updateCategoryVariantAttributeSchema)
    .mutation(async (props) => {
      return updateCategoryVariantAttribute(props.ctx.db, props.input);
    }),
  updateSubCategory: publicProcedure
    .input(updateSubCategorySchema)
    .mutation(async (props) => {
      return updateSubCategory(props.ctx.db, props.input);
    }),
  updateSubComponent: publicProcedure
    .input(updateSubComponentSchema)
    .mutation(async (props) => {
      return updateSubComponent(props.ctx.db, props.input);
    }),
  updateSubComponentStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(INVENTORY_STATUS),
      })
    )
    .mutation(async (props) => {
      // return updateSubComponentStatus(props.ctx, props.input);
      await props.ctx.db.subComponents.update({
        where: {
          id: props.input.id,
        },
        data: {
          status: props.input.status,
        },
      });
    }),
  updateVariantCost: publicProcedure
    .input(updateVariantCostSchema)
    .mutation(async (props) => {
      return updateVariantCost(props.ctx.db, props.input);
    }),
  updateVariantStatus: publicProcedure
    .input(updateVariantStatusSchema)
    .mutation(async (props) => {
      return updateVariantStatus(props.ctx.db, props.input);
    }),

  saveVariantForm: publicProcedure
    .input(variantFormSchema)
    .mutation(async (props) => {
      return saveVariantForm(props.ctx.db, props.input);
    }),
  shipping: {
    // getShippingConfig: publicProcedure.query(async ({ ctx }) => {
    //   return getShippingCalculationConfig(ctx.db);
    // }),
    // saveFlatRate: publicProcedure
    //   .input(flatRateFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveFlatRateConfig(ctx.db, input);
    //   }),
    // saveWeightBased: publicProcedure
    //   .input(weightBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveWeightBasedConfig(ctx.db, input);
    //   }),
    // savePriceBased: publicProcedure
    //   .input(priceBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return savePriceBasedConfig(ctx.db, input);
    //   }),
    // saveZoneBased: publicProcedure
    //   .input(zoneBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveZoneBasedConfig(ctx.db, input);
    //   }),
    // savePerItem: publicProcedure
    //   .input(perItemFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return savePerItemConfig(ctx.db, input);
    //   }),
    // saveDimensionalWeight: publicProcedure
    //   .input(dimensionalWeightFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveDimensionalWeightConfig(ctx.db, input);
    //   }),
  },
});
