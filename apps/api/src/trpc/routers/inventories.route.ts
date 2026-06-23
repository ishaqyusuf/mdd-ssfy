import {
	applyInboundExtractionQuery,
	assignInboundDemandsQuery,
	createInboundShipmentFromDemandsQuery,
	createInboundShipmentQuery,
	extractInboundDocumentsQuery,
	getInboundActivityQuery,
	getInboundExtractionsQuery,
	listInboundDocumentsQuery,
	listInboundShipmentsQuery,
	listInboundSuppliers,
	listOrderInboundShipmentsQuery,
	updateInboundShipmentStatusQuery,
	uploadInboundDocumentsQuery,
} from "@api/db/queries/inbound-receiving";
import {
	getInventoryCategoryByShelfId,
	upsertInventoriesForDykeShelfProducts,
	upsertInventoriesForDykeShelfProductsSchema,
} from "@api/db/queries/inventory.generate";
import { invalidateSalesWorkflowForStepComponent } from "@api/db/queries/sales-form";
import { idSchema } from "@api/schemas/common";
import {
	saveCommunityInput,
	saveCommunityInputSchema,
} from "@community/community-template-schemas";
import {
	adjustInventoryStock,
	approveBulkStockAllocation,
	approveStockAllocation,
	archiveDykeCustomStepComponent,
	backfillInventoryImportSources,
	backfillInventoryProductKinds,
	deleteInventories,
	deleteInventoryCategory,
	deleteInventorySupplier,
	dykeUpdateFromInventory,
	getDykeInventoryDriftReport,
	getInboundDemandQueue,
	getInboundShipmentDetail,
	getInboundStatusDemandReconciliation,
	getInventoryCategories,
	getInventoryCategoryAttributes,
	getInventoryCategoryForm,
	getInventoryItemDashboard,
	getStockAuditVerificationReport,
	getSupplierReorderSuggestions,
	inventoryBrowserValidationFixtureReport,
	inventoryCategories,
	inventoryForm,
	inventoryList,
	inventoryOperationsSummary,
	inventoryProductKindReview,
	inventorySummary,
	inventorySummarySchema,
	inventorySupplierDykeReview,
	inventorySuppliers,
	inventoryTopSalesAnalytics,
	inventoryUpdateFromDyke,
	inventoryVariantStockForm,
	inventoryVariantsWorkspace,
	lowStockSummary,
	pendingStockAllocations,
	queueDykeStepToInventorySync,
	queueInventoryToDykeSync,
	receiveInboundShipment,
	rejectStockAllocation,
	reportInboundItemIssue,
	resetInventorySystem,
	resolveInboundItemIssue,
	saveDykeStepComponent,
	saveInventory,
	saveInventoryCategoryForm,
	saveInventorySupplier,
	saveSupplierVariantForm,
	saveVariantForm,
	supplierVariantsByInventory,
	syncInventorySuppliersFromDyke,
	syncInventoryToDyke,
	updateCategoryProductKind,
	updateCategoryStockMode,
	updateCategoryVariantAttribute,
	updateDykeComponentPricing,
	updateInventoryProductKind,
	updateSubCategory,
	updateSubCategorySchema,
	updateSubComponent,
	updateVariantCost,
	updateVariantCostSchema,
	updateVariantStatus,
	updateVariantStatusSchema,
	upsertDykeCustomStepComponent,
} from "@gnd/inventory";
import { INVENTORY_STATUS } from "@gnd/inventory/constants";
import { inventoryImport } from "@gnd/inventory/inventory-import";
import {
	approveStockAllocationSchema,
	archiveDykeCustomStepComponentSchema,
	bulkApproveStockAllocationSchema,
	deleteInventorySupplierSchema,
	dykeInventoryDriftReportSchema,
	dykeStepComponentSchema,
	getInventoryCategoriesSchema,
	inboundItemIssueFormSchema,
	inventoryCategoriesSchema,
	inventoryCategoryFormSchema,
	inventoryFormSchema,
	inventoryImportRunSchema,
	inventoryImportSchema,
	inventoryListSchema,
	inventoryProductKindReviewSchema,
	inventorySupplierFormSchema,
	inventorySuppliersSchema,
	inventoryToDykeSyncPayloadSchema,
	rejectStockAllocationSchema,
	resolveInboundItemIssueSchema,
	stockAllocationReviewSchema,
	supplierVariantFormSchema,
	updateCategoryProductKindSchema,
	updateCategoryStockModeSchema,
	updateCategoryVariantAttributeSchema,
	updateDykeComponentPricingSchema,
	updateInventoryProductKindSchema,
	updateSubComponentSchema,
	upsertDykeCustomStepComponentSchema,
	variantFormSchema,
} from "@gnd/inventory/schema";
import {
	allocateReceivedInboundToBackordersSchemaTask,
	backfillSalesInventoryLineItemsSchemaTask,
	inventoryReconciliationReportSchemaTask,
} from "@gnd/jobs/schema";
import { getInventoryReconciliationReport } from "@gnd/sales/inventory-reconciliation-report";
import {
	allocateReceivedInboundToBackorders,
	assignInventoryDispatchAllocations,
	fulfillInventoryDispatch,
	getSalesBackorderQueue,
	getSalesFulfillmentPlan,
	getSalesPartialShipmentQueue,
	getSalesProductionPlan,
	packInventoryDispatchAllocations,
	releaseInventoryDispatchAllocations,
	setSalesInventoryLineFulfillmentHold,
	shipAvailableSalesInventory,
} from "@gnd/sales/sales-fulfillment-plan";
import { getSalesInventoryOverview } from "@gnd/sales/sales-inventory-overview";
import {
	cleanupStaleSalesInventoryLineItems,
	getSalesInventorySyncMonitor,
} from "@gnd/sales/sales-inventory-sync-monitor";
import { getStoreAddonComponentFormSchema } from "@gnd/sales/schema";
import { syncSalesInventoryLineItems } from "@gnd/sales/sync-sales-inventory-line-items";
import { getStoreAddonComponentForm } from "@sales/storefront-product";
import { tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
// import { upsertInventoriesForDykeShelfProductsSchema } from "@api/db/queries/inventory";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
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
const inventoryDispatchTransitionSchema = z.object({
	salesOrderId: z.number().optional().nullable(),
	lineItemIds: z.array(z.number()).optional(),
	allocationIds: z.array(z.number()).optional(),
	note: z.string().optional().nullable(),
});

const inventoryDispatchFulfillSchema = z.object({
	salesOrderId: z.number(),
	lineItemIds: z.array(z.number()).optional(),
	allocationIds: z.array(z.number()).optional(),
	deliveryMode: z.string().optional().nullable(),
	deliveredTo: z.string().optional().nullable(),
	authorName: z.string().optional().nullable(),
	note: z.string().optional().nullable(),
});

const inventoryLineFulfillmentHoldSchema = z.object({
	lineItemId: z.number(),
	holdUntilComplete: z.boolean(),
	note: z.string().optional().nullable(),
});

export const inventoriesRouter = createTRPCRouter({
	pendingAllocations: protectedProcedure
		.input(stockAllocationReviewSchema)
		.query(async (props) => {
			return pendingStockAllocations(props.ctx.db, props.input);
		}),
	approveStockAllocation: protectedProcedure
		.input(approveStockAllocationSchema)
		.mutation(async (props) => {
			return approveStockAllocation(props.ctx.db, {
				...props.input,
				authorName: props.input.authorName || String(props.ctx.userId),
			});
		}),
	rejectStockAllocation: protectedProcedure
		.input(rejectStockAllocationSchema)
		.mutation(async (props) => {
			return rejectStockAllocation(props.ctx.db, props.input);
		}),
	approveBulkStockAllocation: protectedProcedure
		.input(bulkApproveStockAllocationSchema)
		.mutation(async (props) => {
			return approveBulkStockAllocation(props.ctx.db, {
				...props.input,
				authorName: props.input.authorName || String(props.ctx.userId),
			});
		}),
	inboundShipments: protectedProcedure
		.input(
			z.object({
				status: z
					.array(
						z.enum([
							"pending",
							"in_progress",
							"completed",
							"issue_open",
							"closed",
							"cancelled",
						]),
					)
					.optional(),
				supplierId: z.number().optional().nullable(),
			}),
		)
		.query(async (props) => {
			return listInboundShipmentsQuery(props.ctx, props.input);
		}),
	orderInboundShipments: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
			}),
		)
		.query(async (props) => {
			return listOrderInboundShipmentsQuery(props.ctx, props.input);
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
						]),
					)
					.optional(),
				supplierId: z.number().optional().nullable(),
				saleId: z.number().optional().nullable(),
			}),
		)
		.query(async (props) => {
			return getInboundDemandQueue(props.ctx.db, props.input);
		}),
	inboundStatusDemandReconciliation: protectedProcedure
		.input(
			z
				.object({
					take: z.number().optional().nullable(),
				})
				.optional(),
		)
		.query(async (props) => {
			return getInboundStatusDemandReconciliation(props.ctx.db, props.input);
		}),
	supplierReorderSuggestions: protectedProcedure.query(async (props) => {
		return getSupplierReorderSuggestions(props.ctx.db);
	}),
	inboundShipmentDetail: protectedProcedure
		.input(
			z.object({
				inboundId: z.number(),
			}),
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
				demandIds: z.array(z.number()).optional(),
				lineItemComponentIds: z.array(z.number()).optional(),
				componentSelections: z
					.array(
						z.object({
							lineItemComponentIds: z.array(z.number()),
							qty: z.number(),
						}),
					)
					.optional(),
				reference: z.string().optional().nullable(),
				expectedAt: z.date().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			return createInboundShipmentFromDemandsQuery(props.ctx, props.input);
		}),
	updateInboundShipmentStatus: protectedProcedure
		.input(
			z.object({
				inboundId: z.number(),
				status: z.enum([
					"pending",
					"in_progress",
					"completed",
					"issue_open",
					"closed",
					"cancelled",
				]),
			}),
		)
		.mutation(async (props) => {
			return updateInboundShipmentStatusQuery(props.ctx, props.input);
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
							qtyGood: z.number().optional().nullable(),
							qtyIssue: z.number().optional().nullable(),
							unitPrice: z.number().optional().nullable(),
							issueType: z
								.enum([
									"damaged",
									"missing",
									"wrong_item",
									"over_received",
									"quality_hold",
								])
								.optional()
								.nullable(),
							issueNotes: z.string().optional().nullable(),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async (props) => {
			const result = await receiveInboundShipment(props.ctx.db, {
				...props.input,
				authorName: String(props.ctx.userId),
			});
			let allocationJob: Awaited<ReturnType<typeof tasks.trigger>> | null =
				null;
			if (result.lineItemComponentIds.length > 0) {
				try {
					allocationJob = await tasks.trigger(
						"allocate-received-inbound-to-backorders",
						{
							lineItemComponentIds: result.lineItemComponentIds,
							limit: Math.min(200, result.lineItemComponentIds.length),
							authorName: String(props.ctx.userId ?? "Inventory"),
							note: `Inbound shipment #${result.inboundId} received`,
						},
					);
				} catch (error) {
					console.warn(
						"Failed to queue received inbound backorder allocation",
						{
							inboundId: result.inboundId,
							error,
						},
					);
				}
			}

			return {
				...result,
				allocationJob,
			};
		}),
	adjustInventoryStock: protectedProcedure
		.input(
			z.object({
				inventoryVariantId: z.number(),
				inventoryStockId: z.number().optional().nullable(),
				supplierId: z.number().optional().nullable(),
				location: z.string().optional().nullable(),
				unitPrice: z.number().optional().nullable(),
				qty: z.number(),
				mode: z.enum(["delta", "set"]).optional(),
				reason: z.enum([
					"correction",
					"cycle_count",
					"damage",
					"return",
					"consume",
					"release",
					"stock_in",
					"stock_out",
				]),
				reference: z.string().optional().nullable(),
				notes: z.string().optional().nullable(),
				authorName: z.string().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			return adjustInventoryStock(props.ctx.db, {
				...props.input,
				authorName:
					props.input.authorName || String(props.ctx.userId ?? "Inventory"),
			});
		}),
	stockAuditVerificationReport: protectedProcedure
		.input(
			z
				.object({
					from: z.date().optional().nullable(),
					to: z.date().optional().nullable(),
				})
				.optional(),
		)
		.query(async (props) => {
			return getStockAuditVerificationReport(props.ctx.db, props.input ?? {});
		}),
	reportInboundItemIssue: protectedProcedure
		.input(inboundItemIssueFormSchema)
		.mutation(async (props) => {
			return reportInboundItemIssue(props.ctx.db, props.input);
		}),
	resolveInboundItemIssue: protectedProcedure
		.input(resolveInboundItemIssueSchema)
		.mutation(async (props) => {
			return resolveInboundItemIssue(props.ctx.db, props.input);
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
			}),
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
				props.input,
			);
			return result;
		}),
	getInventoryTypeByShelfId: publicProcedure
		.input(
			z.object({
				categoryId: z.number(),
			}),
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
	lowStockSummary: publicProcedure.query(async (props) => {
		return lowStockSummary(props.ctx.db);
	}),
	inventoryOperationsSummary: protectedProcedure.query(async (props) => {
		return inventoryOperationsSummary(props.ctx.db);
	}),
	inventoryBrowserValidationFixtureReport: protectedProcedure.query(
		async (props) => {
			return inventoryBrowserValidationFixtureReport(props.ctx.db);
		},
	),
	upsertShelfProducts: publicProcedure
		.input(upsertInventoriesForDykeShelfProductsSchema)
		.mutation(async (props) => {
			return upsertInventoriesForDykeShelfProducts(props.ctx, props.input);
		}),
	upsertComponents: publicProcedure
		.input(
			upsertInventoriesForDykeShelfProductsSchema.extend(
				inventoryImportRunSchema.shape,
			),
		)
		.mutation(async (props) => {
			if (!props.input.categoryId) {
				throw new Error("categoryId is required");
			}
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
			return tasks.trigger(
				props.input.compare
					? "run-inventory-full-import-test"
					: "run-inventory-full-import-now",
				{
					categoryId: props.input.categoryId,
					scope: props.input.scope,
					strategy: props.input.strategy,
					compare: props.input.compare,
					reset: props.input.reset,
					source: "manual",
				},
			);
		}),
	inventoryUpdateFromDyke: publicProcedure
		.input(
			z.object({
				stepId: z.number(),
				compare: z.boolean().optional(),
				strategy: inventoryImportRunSchema.shape.strategy,
				source: inventoryImportRunSchema.shape.source,
			}),
		)
		.mutation(async (props) => {
			return inventoryUpdateFromDyke(props.ctx.db, props.input);
		}),
	saveDykeStepComponent: protectedProcedure
		.input(dykeStepComponentSchema)
		.mutation(async (props) => {
			const result = await saveDykeStepComponent(props.ctx.db, props.input);
			await invalidateSalesWorkflowForStepComponent({
				stepId: result.stepId,
				componentId: result.componentId,
				componentUid: result.componentUid,
				routing: true,
			});
			if (result.stepId) {
				await queueDykeStepToInventorySync({
					stepId: result.stepId,
					source: "event",
				});
			}
			return result;
		}),
	upsertDykeCustomStepComponent: protectedProcedure
		.input(upsertDykeCustomStepComponentSchema)
		.mutation(async (props) => {
			const result = await upsertDykeCustomStepComponent(
				props.ctx.db,
				props.input,
			);
			await invalidateSalesWorkflowForStepComponent({
				stepId: result.stepId,
				componentId: result.componentId,
				componentUid: result.componentUid,
				routing: true,
			});
			if (result.stepId) {
				await queueDykeStepToInventorySync({
					stepId: result.stepId,
					source: "event",
				});
			}
			return result;
		}),
	archiveDykeCustomStepComponent: protectedProcedure
		.input(archiveDykeCustomStepComponentSchema)
		.mutation(async (props) => {
			const result = await archiveDykeCustomStepComponent(
				props.ctx.db,
				props.input,
			);
			await invalidateSalesWorkflowForStepComponent({
				stepId: result.stepId,
				componentId: result.componentId,
				componentUid: result.componentUid,
				routing: true,
			});
			if (result.stepId) {
				await queueDykeStepToInventorySync({
					stepId: result.stepId,
					source: "event",
				});
			}
			return result;
		}),
	updateDykeComponentPricing: protectedProcedure
		.input(updateDykeComponentPricingSchema)
		.mutation(async (props) => {
			const result = await updateDykeComponentPricing(
				props.ctx.db,
				props.input,
			);
			await invalidateSalesWorkflowForStepComponent({
				stepId: props.input.stepId,
				componentUid: props.input.stepProductUid,
			});
			if (props.input.triggerInventorySync !== false) {
				await queueDykeStepToInventorySync({
					stepId: props.input.stepId,
					source: "event",
				});
			}
			return result;
		}),
	dykeInventoryDriftReport: protectedProcedure
		.input(dykeInventoryDriftReportSchema)
		.query(async (props) => {
			return getDykeInventoryDriftReport(props.ctx.db, props.input);
		}),
	inventorySuppliers: protectedProcedure
		.input(inventorySuppliersSchema)
		.query(async (props) => {
			return inventorySuppliers(props.ctx.db, props.input);
		}),
	inventorySupplierDykeReview: protectedProcedure.query(async (props) => {
		return inventorySupplierDykeReview(props.ctx.db);
	}),
	syncInventorySuppliersFromDyke: protectedProcedure.mutation(async (props) => {
		return syncInventorySuppliersFromDyke(props.ctx.db);
	}),
	saveInventorySupplier: protectedProcedure
		.input(inventorySupplierFormSchema)
		.mutation(async (props) => {
			return saveInventorySupplier(props.ctx.db, props.input);
		}),
	deleteInventorySupplier: protectedProcedure
		.input(deleteInventorySupplierSchema)
		.mutation(async (props) => {
			return deleteInventorySupplier(props.ctx.db, props.input);
		}),
	supplierVariantsByInventory: protectedProcedure
		.input(
			z.object({
				inventoryId: z.number(),
			}),
		)
		.query(async (props) => {
			return supplierVariantsByInventory(props.ctx.db, props.input.inventoryId);
		}),
	saveSupplierVariantForm: protectedProcedure
		.input(supplierVariantFormSchema)
		.mutation(async (props) => {
			return saveSupplierVariantForm(props.ctx.db, props.input);
		}),
	backfillSalesInventorySync: protectedProcedure
		.input(backfillSalesInventoryLineItemsSchemaTask)
		.mutation(async (props) => {
			return tasks.trigger("backfill-sales-inventory-line-items", {
				...props.input,
				triggeredByUserId: props.ctx.userId ?? props.input.triggeredByUserId,
			});
		}),
	salesInventoryOverview: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
			}),
		)
		.query(async (props) => {
			return getSalesInventoryOverview(props.ctx.db, props.input);
		}),
	syncSalesInventoryOverview: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return syncSalesInventoryLineItems(props.ctx.db, {
				salesOrderId: props.input.salesOrderId,
				source: "manual",
				triggeredByUserId: props.ctx.userId,
			});
		}),
	salesInventorySyncMonitor: protectedProcedure
		.input(
			z
				.object({
					sampleLimit: z.number().min(1).max(20).optional(),
					includeReconciliation: z.boolean().optional(),
					reconciliationLimit: z.number().min(1).max(200).optional(),
				})
				.optional(),
		)
		.query(async (props) => {
			return getSalesInventorySyncMonitor(props.ctx.db, props.input ?? {});
		}),
	cleanupStaleSalesInventoryLineItems: protectedProcedure
		.input(
			z
				.object({
					lineItemIds: z.array(z.number().int().positive()).optional(),
					limit: z.number().int().min(1).max(500).optional(),
					dryRun: z.boolean().optional().default(true),
				})
				.optional(),
		)
		.mutation(async (props) => {
			return cleanupStaleSalesInventoryLineItems(
				props.ctx.db,
				props.input ?? { dryRun: true },
			);
		}),
	inventoryReconciliationReport: protectedProcedure
		.input(inventoryReconciliationReportSchemaTask.optional())
		.query(async (props) => {
			return getInventoryReconciliationReport(props.ctx.db, props.input ?? {});
		}),
	runInventoryReconciliationReport: protectedProcedure
		.input(inventoryReconciliationReportSchemaTask)
		.mutation(async (props) => {
			return tasks.trigger("run-inventory-reconciliation-report", props.input);
		}),
	salesFulfillmentPlan: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
			}),
		)
		.query(async (props) => {
			return getSalesFulfillmentPlan(props.ctx.db, props.input);
		}),
	salesBackorderQueue: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number().optional().nullable(),
				inventoryVariantId: z.number().optional().nullable(),
				statuses: z
					.array(
						z.enum([
							"awaiting_inbound",
							"backordered",
							"ready_to_ship_remaining",
						]),
					)
					.optional()
					.nullable(),
				cursorId: z.number().optional().nullable(),
				limit: z.number().min(1).max(200).optional(),
			}),
		)
		.query(async (props) => {
			return getSalesBackorderQueue(props.ctx.db, props.input);
		}),
	salesPartialShipmentQueue: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number().optional().nullable(),
				statuses: z
					.array(
						z.enum([
							"available_now",
							"held_until_complete",
							"awaiting_inbound",
							"backordered",
							"ready_to_ship_remaining",
						]),
					)
					.optional()
					.nullable(),
				cursorId: z.number().optional().nullable(),
				limit: z.number().min(1).max(200).optional(),
			}),
		)
		.query(async (props) => {
			return getSalesPartialShipmentQueue(props.ctx.db, props.input);
		}),
	salesProductionPlan: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number().optional().nullable(),
				inventoryVariantId: z.number().optional().nullable(),
				supplierId: z.number().optional().nullable(),
				readinesses: z
					.array(
						z.enum([
							"ready_for_production",
							"fulfilled",
							"awaiting_inbound",
							"allocation_review",
							"blocked",
						]),
					)
					.optional()
					.nullable(),
				limit: z.number().min(1).max(500).optional(),
			}),
		)
		.query(async (props) => {
			return getSalesProductionPlan(props.ctx.db, props.input);
		}),
	shipAvailableSalesInventory: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
				lineItemIds: z.array(z.number()).optional(),
				deliveryMode: z.string().optional().nullable(),
				deliveredTo: z.string().optional().nullable(),
				authorName: z.string().optional().nullable(),
				note: z.string().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			return shipAvailableSalesInventory(props.ctx.db, {
				...props.input,
				createdByUserId: props.ctx.userId ?? null,
				authorName:
					props.input.authorName || String(props.ctx.userId ?? "Inventory"),
			});
		}),
	setSalesInventoryLineFulfillmentHold: protectedProcedure
		.input(inventoryLineFulfillmentHoldSchema)
		.mutation(async (props) => {
			return setSalesInventoryLineFulfillmentHold(props.ctx.db, {
				...props.input,
				authorName: String(props.ctx.userId ?? "Inventory"),
			});
		}),
	assignInventoryDispatchAllocations: protectedProcedure
		.input(inventoryDispatchTransitionSchema)
		.mutation(async (props) => {
			return assignInventoryDispatchAllocations(props.ctx.db, {
				...props.input,
				note: props.input.note || "Assigned by inventory dispatch mode.",
			});
		}),
	packInventoryDispatchAllocations: protectedProcedure
		.input(inventoryDispatchTransitionSchema)
		.mutation(async (props) => {
			return packInventoryDispatchAllocations(props.ctx.db, {
				...props.input,
				note: props.input.note || "Picked by inventory dispatch mode.",
			});
		}),
	fulfillInventoryDispatch: protectedProcedure
		.input(inventoryDispatchFulfillSchema)
		.mutation(async (props) => {
			return fulfillInventoryDispatch(props.ctx.db, {
				...props.input,
				createdByUserId: props.ctx.userId ?? null,
				authorName:
					props.input.authorName || String(props.ctx.userId ?? "Inventory"),
				note: props.input.note || "Fulfilled by inventory dispatch mode.",
			});
		}),
	releaseInventoryDispatchAllocations: protectedProcedure
		.input(inventoryDispatchTransitionSchema)
		.mutation(async (props) => {
			return releaseInventoryDispatchAllocations(props.ctx.db, {
				...props.input,
				note: props.input.note || "Released by inventory dispatch mode.",
			});
		}),
	allocateReceivedInboundToBackorders: protectedProcedure
		.input(allocateReceivedInboundToBackordersSchemaTask)
		.mutation(async (props) => {
			return allocateReceivedInboundToBackorders(props.ctx.db, {
				...props.input,
				authorName: String(props.ctx.userId ?? "Inventory"),
			});
		}),
	repairSalesInventorySync: protectedProcedure
		.input(
			z.object({
				salesOrderId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return tasks.trigger("sync-sales-inventory-line-items", {
				salesOrderId: props.input.salesOrderId,
				source: "repair",
				triggeredByUserId: props.ctx.userId ?? null,
			});
		}),
	dykeUpdateFromInventory: publicProcedure
		.input(
			z.object({
				inventoryCategoryId: z.number().optional().nullable(),
				inventoryId: z.number().optional().nullable(),
				syncTitle: z.boolean().optional(),
				syncImage: z.boolean().optional(),
			}),
		)
		.mutation(async (props) => {
			return dykeUpdateFromInventory(props.ctx.db, props.input);
		}),
	inventoryToDykeSyncCompare: protectedProcedure
		.input(inventoryToDykeSyncPayloadSchema)
		.mutation(async (props) => {
			return syncInventoryToDyke(props.ctx.db, {
				...props.input,
				mode: "compare",
			});
		}),
	queueInventoryToDykeSync: protectedProcedure
		.input(inventoryToDykeSyncPayloadSchema)
		.mutation(async (props) => {
			return queueInventoryToDykeSync({
				inventoryCategoryId: props.input.inventoryCategoryId ?? null,
				inventoryId: props.input.inventoryId ?? null,
				inventoryVariantId: props.input.inventoryVariantId ?? null,
				compare: props.input.mode === "compare",
				source: props.input.source,
			});
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
			}),
		)
		.query(async (props) => {
			return await getInventoryCategoryAttributes(
				props.ctx.db,
				props.input.categoryId,
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
	inventoryItemDashboard: protectedProcedure
		.input(
			z.object({
				inventoryId: z.number(),
			}),
		)
		.query(async (props) => {
			return getInventoryItemDashboard(props.ctx.db, props.input);
		}),
	inventoryVariantsWorkspace: protectedProcedure
		.input(
			z.object({
				q: z.string().optional().nullable(),
				inventoryId: z.number().optional().nullable(),
				categoryId: z.number().optional().nullable(),
				supplierId: z.number().optional().nullable(),
				status: z.string().optional().nullable(),
				stockMode: z.string().optional().nullable(),
				lowStock: z.boolean().optional().nullable(),
				cursorId: z.number().optional().nullable(),
				limit: z.number().min(1).max(100).optional().nullable(),
			}),
		)
		.query(async (props) => {
			return inventoryVariantsWorkspace(props.ctx.db, props.input);
		}),
	inventoryTopSalesAnalytics: protectedProcedure
		.input(
			z
				.object({
					inventoryId: z.number().optional().nullable(),
					categoryId: z.number().optional().nullable(),
					supplierId: z.number().optional().nullable(),
					from: z.date().optional().nullable(),
					to: z.date().optional().nullable(),
					limit: z.number().min(1).max(50).optional().nullable(),
				})
				.optional(),
		)
		.query(async (props) => {
			return inventoryTopSalesAnalytics(props.ctx.db, props.input ?? {});
		}),
	inventoryProductKindReview: protectedProcedure
		.input(inventoryProductKindReviewSchema)
		.query(async (props) => {
			return inventoryProductKindReview(props.ctx.db, props.input);
		}),
	backfillInventoryProductKinds: protectedProcedure.mutation(async (props) => {
		return backfillInventoryProductKinds(props.ctx.db);
	}),
	backfillInventoryImportSources: protectedProcedure.mutation(async (props) => {
		return backfillInventoryImportSources(props.ctx.db);
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
			}),
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
			}),
		)
		.query(async (props) => {
			const result = await inventoryVariantStockForm(
				props.ctx.db,
				props.input.id,
			);
			return result;
		}),
	updateCategoryVariantAttribute: publicProcedure
		.input(updateCategoryVariantAttributeSchema)
		.mutation(async (props) => {
			return updateCategoryVariantAttribute(props.ctx.db, props.input);
		}),
	updateCategoryStockMode: publicProcedure
		.input(updateCategoryStockModeSchema)
		.mutation(async (props) => {
			return updateCategoryStockMode(props.ctx.db, props.input);
		}),
	updateInventoryProductKind: publicProcedure
		.input(updateInventoryProductKindSchema)
		.mutation(async (props) => {
			return updateInventoryProductKind(props.ctx.db, props.input);
		}),
	updateCategoryProductKind: publicProcedure
		.input(updateCategoryProductKindSchema)
		.mutation(async (props) => {
			return updateCategoryProductKind(props.ctx.db, props.input);
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
			}),
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
