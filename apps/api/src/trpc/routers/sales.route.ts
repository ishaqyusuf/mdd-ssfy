import {
	accountingIndex,
	accountingIndexSchema,
} from "@api/db/queries/accounting";
import { getCustomers } from "@api/db/queries/customer";
import { getInboundSummary, getInbounds } from "@api/db/queries/inbound";
import {
	getProductReport,
	productReportSchema,
} from "@api/db/queries/product-report";
import {
	getOrders,
	getQuotes,
	getSaleOverview,
	getSales,
	sales,
	saveOrderProductionGate,
	startNewSales,
} from "@api/db/queries/sales";
import {
	getSalesAccountings,
	getSalesAccountingsSchema,
} from "@api/db/queries/sales-accounting";
import { copySale, moveSale } from "@api/db/queries/sales-actions";
import { getMobileSalesDashboardOverview } from "@api/db/queries/sales-dashboard";
import {
	deleteSupplier,
	deleteSupplierSchema,
	getMultiLineComponents,
	getMultiLineComponentsSchema,
	getStepComponents,
	getStepComponentsSchema,
	getSuppliers,
	getSuppliersSchema,
	saveSupplier,
	saveSupplierSchema,
	updateStepMeta,
	updateStepMetaSchema,
} from "@api/db/queries/sales-form";
import { getSalesHx, getSalesHxSchema } from "@api/db/queries/sales-hx";
import {
	getOrdersV2,
	getOrdersV2Schema,
	getOrdersV2Summary,
	getOrdersV2SummarySchema,
} from "@api/db/queries/sales-orders-v2";
import {
	getSalesResolutions,
	getSalesResolutionsSchema,
	getSalesResolutionsSummary,
} from "@api/db/queries/sales-resolution";
import { resolvePayment, resolvePaymentSchema } from "@api/db/queries/wallet";
import { getCustomersSchema } from "@api/schemas/customer";
import {
	copySaleSchema,
	deleteSalesByOrderIdsSchema,
	getFullSalesDataSchema,
	getSaleOverviewSchema,
	inboundQuerySchema,
	moveSaleSchema,
	salesQueryParamsSchema,
	saveOrderProductionGateSchema,
	startNewSalesSchema,
} from "@api/schemas/sales";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { getSaleInformation } from "@gnd/sales/get-sale-information";
import { generateRandomString, timeLog } from "@gnd/utils";
import { createNoteAction } from "@notifications/note";
import {
	getInvoicePrintData,
	printInvoiceSchema,
	productionV2DetailQuerySchema,
	productionV2ListQuerySchema,
	salesProductionQueryParamsSchema,
} from "@sales/exports";
import {
	getProductionDashboardV2,
	getProductionListV2,
	getProductionOrderDetailV2,
} from "@sales/production-v2";
import {
	getSalesProductionDashboard,
	getSalesProductions,
} from "@sales/sales-production";
import { salesPayWithWallet, salesPayWithWalletSchema } from "@sales/wallet";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
export const salesRouter = createTRPCRouter({
	createStep: publicProcedure
		.input(
			z.object({
				title: z.string(),
			}),
		)
		.mutation(async (props) => {
			const db = props.ctx.db;
			const title = props.input.title;
			return await db.dykeSteps.create({
				data: {
					uid: generateRandomString(4),
					title,
					meta: {},
				},
			});
			// return createStep(props.ctx, props.input);
		}),
	index: protectedProcedure
		.input(salesQueryParamsSchema)
		.query(async (props) => {
			const query = props.input;
			return getSales(props.ctx, transformSalesFilterQuery(query));
		}),
	sales: protectedProcedure
		.input(salesQueryParamsSchema)
		.query(async (props) => {
			return sales(props.ctx, transformSalesFilterQuery(props.input));
		}),
	productions: publicProcedure
		.input(salesProductionQueryParamsSchema)
		.query(async (props) => {
			return getSalesProductions(props.ctx.db, props.input);
		}),
	productionTasks: publicProcedure
		.input(salesProductionQueryParamsSchema)
		.query(async (props) => {
			const input = { ...props.input };
			input.workerId = props.ctx.userId;
			return getSalesProductions(props.ctx.db, input);
		}),
	productionDashboard: publicProcedure
		.input(salesProductionQueryParamsSchema.optional().nullable())
		.query(async (props) => {
			return getSalesProductionDashboard(props.ctx.db, {
				...(props.input || {}),
			});
		}),
	productionsV2: publicProcedure
		.input(productionV2ListQuerySchema)
		.query(async (props) => {
			const input =
				props.input.scope === "worker"
					? {
							...props.input,
							workerId: props.ctx.userId,
						}
					: props.input;
			return getProductionListV2(props.ctx.db, input);
		}),
	productionDashboardV2: publicProcedure
		.input(productionV2ListQuerySchema)
		.query(async (props) => {
			const input =
				props.input.scope === "worker"
					? {
							...props.input,
							workerId: props.ctx.userId,
						}
					: props.input;
			return getProductionDashboardV2(props.ctx.db, input);
		}),
	productionOrderDetailV2: publicProcedure
		.input(productionV2DetailQuerySchema)
		.query(async (props) => {
			const input =
				props.input.scope === "worker"
					? {
							...props.input,
							workerId: props.ctx.userId,
						}
					: props.input;
			return getProductionOrderDetailV2(props.ctx.db, input);
		}),
	getSalesHx: publicProcedure.input(getSalesHxSchema).query(async (props) => {
		return getSalesHx(props.ctx, props.input);
	}),
	getSaleOverview: publicProcedure
		.input(getSaleOverviewSchema)
		.query(async (props) => {
			return getSaleOverview(props.ctx, props.input);
		}),
	getSalesResolutions: publicProcedure
		.input(getSalesResolutionsSchema)
		.query(async (props) => {
			const result = await getSalesResolutions(props.ctx, props.input);
			return result;
		}),
	getSalesResolutionsSummary: publicProcedure
		.input(getSalesResolutionsSchema)
		.query(async (props) => {
			return getSalesResolutionsSummary(props.ctx, props.input);
		}),
	getStepComponents: publicProcedure
		.input(getStepComponentsSchema)
		.query(async (props) => {
			return getStepComponents(props.ctx, props.input);
		}),
	getMultiLineComponents: publicProcedure
		.input(getMultiLineComponentsSchema)
		.query(async (props) => {
			return getMultiLineComponents(props.ctx, props.input);
		}),
	customersIndex: publicProcedure
		.input(getCustomersSchema)
		.query(async (props) => {
			return getCustomers(props.ctx, props.input);
		}),
	inboundIndex: publicProcedure
		.input(inboundQuerySchema)
		.query(async (props) => {
			return getInbounds(props.ctx, props.input);
		}),
	inboundSummary: publicProcedure
		.input(inboundQuerySchema)
		.query(async (props) => {
			return getInboundSummary(props.ctx, props.input);
		}),
	productionOverview: publicProcedure
		.input(getFullSalesDataSchema)
		.query(async (props) => {
			// const resp = await getSalesLifeCycle(props.ctx, props.input);
			// return resp;
			return await getSaleInformation(props.ctx.db, props.input);
		}),
	saveOrderProductionGate: protectedProcedure
		.input(saveOrderProductionGateSchema)
		.mutation(async (props) => {
			return saveOrderProductionGate(props.ctx, props.input);
		}),
	getOrders: publicProcedure
		.input(salesQueryParamsSchema)
		.query(async (props) => {
			return getOrders(props.ctx, transformSalesFilterQuery(props.input));
		}),
	getOrdersV2: publicProcedure.input(getOrdersV2Schema).query(async (props) => {
		return getOrdersV2(props.ctx, props.input);
	}),
	getOrdersV2Summary: publicProcedure
		.input(getOrdersV2SummarySchema)
		.query(async (props) => {
			return getOrdersV2Summary(props.ctx, props.input);
		}),
	quotes: publicProcedure.input(salesQueryParamsSchema).query(async (props) => {
		return getQuotes(props.ctx, transformSalesFilterQuery(props.input));
	}),
	salesPayWithWallet: publicProcedure
		.input(salesPayWithWalletSchema)
		.mutation(async (props) => {
			return salesPayWithWallet(props.ctx.db, props.input);
		}),
	startNewSales: publicProcedure
		.input(startNewSalesSchema)
		.mutation(async (props) => {
			return startNewSales(props.ctx, props.input.customerId);
		}),
	resolvePayment: publicProcedure
		.input(resolvePaymentSchema)
		.mutation(async (props) => {
			return resolvePayment(props.ctx, props.input);
		}),
	restore: publicProcedure
		.input(z.object({ salesId: z.number() }))
		.mutation(async (props) => {
			await props.ctx.db.salesOrders.update({
				where: {
					id: props.input.salesId,
					deletedAt: {},
				},
				data: {
					// bin: false,
					deletedAt: null,
				},
			});
			return true;
		}),
	printInvoice: publicProcedure
		.input(printInvoiceSchema)
		.query(async (props) => {
			return getInvoicePrintData(props.ctx.db, props.input);
		}),

	// sales statistics
	getProductReport: publicProcedure
		.input(productReportSchema)
		.query(async (props) => {
			return getProductReport(props.ctx, props.input);
		}),

	accountingIndex: publicProcedure
		.input(accountingIndexSchema)
		.query(async (props) => {
			const result = await accountingIndex(props.ctx, props.input);
			return result;
		}),
	getSalesAccountings: publicProcedure
		.input(getSalesAccountingsSchema)
		.query(async (props) => {
			return getSalesAccountings(props.ctx, props.input);
		}),
	mobileDashboardOverview: publicProcedure.query(async (props) => {
		return getMobileSalesDashboardOverview(props.ctx);
	}),
	getSuppliers: publicProcedure
		.input(getSuppliersSchema)
		.query(async (props) => {
			return getSuppliers(props.ctx, props.input);
		}),
	saveSupplier: publicProcedure
		.input(saveSupplierSchema)
		.mutation(async (props) => {
			return saveSupplier(props.ctx, props.input);
		}),
	deleteSupplier: publicProcedure
		.input(deleteSupplierSchema)
		.mutation(async (props) => {
			return deleteSupplier(props.ctx, props.input);
		}),
	updateStepMeta: publicProcedure
		.input(updateStepMetaSchema)
		.mutation(async (props) => {
			return updateStepMeta(props.ctx, props.input);
		}),
	copySale: protectedProcedure.input(copySaleSchema).mutation(async (props) => {
		return copySale(props.ctx, props.input);
	}),
	moveSale: protectedProcedure.input(moveSaleSchema).mutation(async (props) => {
		return moveSale(props.ctx, props.input);
	}),
	deleteSalesByOrderIds: protectedProcedure
		.input(deleteSalesByOrderIdsSchema)
		.mutation(async (props) => {
			const result = await props.ctx.db.salesOrders.updateMany({
				where: {
					orderId: {
						in: props.input.orderIds,
					},
				},
				data: {
					deletedAt: new Date(),
				},
			});

			return {
				count: result.count,
			};
		}),
	deleteSale: protectedProcedure
		.input(z.object({ salesId: z.number() }))
		.mutation(async (props) => {
			const o = await props.ctx.db.salesOrders.update({
				where: {
					id: props.input.salesId,
					// deletedAt: null,
				},
				data: {
					// bin: true,
					deletedAt: new Date(),
				},
				select: {
					orderId: true,
				},
			});
			await createNoteAction({
				db: props.ctx.db,
				authorId: props.ctx.userId,
				subject: "Sale Deleted",
				headline: `Sale with # ${o.orderId} was deleted.`, // headline is used for the general activities page
				note: "", // user input
				type: "activity",
				tags: [
					{
						tagName: "channel",
						tagValue: "Sales",
					},
					{
						tagName: "salesId",
						tagValue: String(props.input.salesId),
					},
					{
						tagName: "type",
						tagValue: "system",
					},
					{
						tagName: "status",
						tagValue: "public",
					},
				],
			});
			return true;
		}),
});
