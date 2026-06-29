import {
	accountingIndex,
	accountingIndexSchema,
} from "@api/db/queries/accounting";
import { getCustomers } from "@api/db/queries/customer";
import {
	approveDealerOrderRequest,
	getDealerOrderRequest,
	getDealerOrderRequestCount,
	getDealerOrderRequests,
	rejectDealerOrderRequest,
} from "@gnd/db/queries";
import { getInboundSummary, getInbounds } from "@api/db/queries/inbound";
import {
	getProductReport,
	productReportSchema,
} from "@api/db/queries/product-report";
import {
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
import {
	getSaleTransactions,
	getSaleTransactionsSchema,
} from "@api/db/queries/sales-transactions";
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
	updateStepMeta,
	updateStepMetaSchema,
} from "@api/db/queries/sales-form";
import { getSalesHx, getSalesHxSchema } from "@api/db/queries/sales-hx";
import {
	getOrders,
	getOrdersSchema,
	getOrdersSummary,
	getOrdersSummarySchema,
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
	updateSalesPaymentMethodSchema,
} from "@api/schemas/sales";
import { saveSupplierSchema } from "@api/schemas/sales-form";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { getSaleInformation } from "@gnd/sales/get-sale-information";
import { generateRandomString, timeLog } from "@gnd/utils";
import { createNoteAction } from "@notifications/note";
import { EmailService } from "@gnd/notifications/services/email-service";
import { buildFullPaymentToken } from "@api/db/queries/checkout";
import {
	productionV2DetailQuerySchema,
	productionV2ListQuerySchema,
	salesProductionQueryParamsSchema,
} from "@sales/exports";
import { salesPrioritySchema } from "@sales/priority";
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
import { getAppUrl } from "@gnd/utils/envs";
import { calculatePaymentChannelCharge } from "@gnd/sales/payment-system";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
	type TRPCContext,
} from "../init";

const dealerOrderRequestsSchema = z.object({
	cursor: z.number().optional().nullable(),
	size: z.number().min(1).max(100).optional().nullable(),
	status: z.enum(["pending", "approved", "rejected", "all"]).optional().nullable(),
});
const dealerOrderRequestIdSchema = z.object({
	requestId: z.number(),
});
const approveDealerOrderRequestSchema = dealerOrderRequestIdSchema.extend({
	deliveryCost: z.number().min(0).optional().nullable(),
	approverNote: z.string().optional().nullable(),
});
const rejectDealerOrderRequestSchema = dealerOrderRequestIdSchema.extend({
	reason: z.string().optional().nullable(),
});

function getDealershipUrl() {
	if (process.env.NEXT_PUBLIC_DEALERSHIP_URL) {
		return process.env.NEXT_PUBLIC_DEALERSHIP_URL.replace(/\/$/, "");
	}

	if (
		process.env.VERCEL_ENV === "production" ||
		process.env.NODE_ENV === "production"
	) {
		return "https://dealers.gndprodesk.com";
	}

	if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return "http://localhost:3006";
}

async function sendDealerApprovalEmail(
	ctx: TRPCContext,
	result: Awaited<ReturnType<typeof approveDealerOrderRequest>>,
) {
	if (!result.dealerEmail) return;
	const orderUrl = `${getDealershipUrl()}/orders/${result.order.id}`;
	const paymentToken = await buildFullPaymentToken(ctx, {
		salesId: result.paymentContext.salesId,
		customerId: result.paymentContext.customerId,
		customerPhone: result.paymentContext.customerPhone,
		amountDue: result.paymentContext.amountDue,
	});
	const paymentUrl = paymentToken
		? `${getAppUrl().replace(/\/$/, "")}/checkout/${paymentToken}/v2`
		: null;
	await new EmailService(ctx.db).sendTransactional({
		to: result.dealerEmail,
		subject: `Quote ${result.quoteNo} approved as order ${result.order.orderId}`,
		template: "dealer-sales-request-approved",
		data: {
			dealerName: result.dealerName,
			quoteNo: result.quoteNo,
			orderNo: result.order.orderId,
			customerName: result.customerName,
			total: result.total,
			orderUrl,
			paymentUrl,
		},
	});
}

async function sendDealerRejectedEmail(
	ctx: { db: any },
	result: Awaited<ReturnType<typeof rejectDealerOrderRequest>>,
) {
	if (!result.dealerEmail) return;
	await new EmailService(ctx.db).sendTransactional({
		to: result.dealerEmail,
		subject: `Quote ${result.quoteNo} order request needs review`,
		template: "dealer-sales-request-rejected",
		data: {
			dealerName: result.dealerName,
			quoteNo: result.quoteNo,
			customerName: result.customerName,
			reason: result.reason,
		},
	});
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function finiteNumber(value: unknown): number | null {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function resolveCccPercentageFromMeta(meta: Record<string, unknown> | null) {
	const newSalesForm = asRecord(meta?.newSalesForm);
	const settings = asRecord(newSalesForm?.settings);
	const summary = asRecord(newSalesForm?.summary);
	return (
		finiteNumber(meta?.ccc_percentage) ??
		finiteNumber(meta?.cccPercentage) ??
		finiteNumber(settings?.cccPercentage) ??
		finiteNumber(summary?.cccPercentage) ??
		3.5
	);
}

export const salesRouter = createTRPCRouter({
	dealerOrderRequestCount: protectedProcedure.query(async (props) => {
		return getDealerOrderRequestCount(props.ctx.db, props.ctx.userId);
	}),
	dealerOrderRequests: protectedProcedure
		.input(dealerOrderRequestsSchema)
		.query(async (props) => {
			return getDealerOrderRequests(props.ctx.db, props.ctx.userId, props.input);
		}),
	dealerOrderRequest: protectedProcedure
		.input(dealerOrderRequestIdSchema)
		.query(async (props) => {
			return getDealerOrderRequest(
				props.ctx.db,
				props.ctx.userId,
				props.input.requestId,
			);
		}),
	approveDealerSalesRequest: protectedProcedure
		.input(approveDealerOrderRequestSchema)
		.mutation(async (props) => {
			const result = await approveDealerOrderRequest(
				props.ctx.db,
				props.ctx.userId,
				props.input.requestId,
				{
					deliveryCost: props.input.deliveryCost,
					approverNote: props.input.approverNote,
				},
			);
			if (!result.alreadyApproved) {
				await sendDealerApprovalEmail(props.ctx, result);
			}
			return result;
		}),
	rejectDealerSalesRequest: protectedProcedure
		.input(rejectDealerOrderRequestSchema)
		.mutation(async (props) => {
			const result = await rejectDealerOrderRequest(
				props.ctx.db,
				props.ctx.userId,
				props.input.requestId,
				props.input.reason,
			);
			await sendDealerRejectedEmail(props.ctx, result);
			return result;
		}),
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
	getSaleTransactions: publicProcedure
		.input(getSaleTransactionsSchema)
		.query(async (props) => {
			return getSaleTransactions(props.ctx, props.input);
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
		.input(getOrdersSchema)
		.query(async (props) => {
			return getOrders(props.ctx, props.input);
		}),
	getOrdersSummary: publicProcedure
		.input(getOrdersSummarySchema)
		.query(async (props) => {
			return getOrdersSummary(props.ctx, props.input);
		}),
	updatePriority: protectedProcedure
		.input(
			z
				.object({
					salesId: z.number().optional().nullable(),
					orderId: z.string().optional().nullable(),
					priority: salesPrioritySchema,
				})
				.refine((input) => input.salesId || input.orderId, {
					message: "salesId or orderId is required",
					path: ["salesId"],
				}),
		)
		.mutation(async (props) => {
			const order = await props.ctx.db.salesOrders.findFirstOrThrow({
				where: {
					id: props.input.salesId || undefined,
					orderId: props.input.orderId || undefined,
				},
				select: {
					id: true,
					orderId: true,
					priority: true,
				},
			});

			return props.ctx.db.salesOrders.update({
				where: {
					id: order.id,
				},
				data: {
					priority: props.input.priority,
				},
				select: {
					id: true,
					orderId: true,
					priority: true,
				},
			});
		}),
	updatePaymentMethod: protectedProcedure
		.input(updateSalesPaymentMethodSchema)
		.mutation(async (props) => {
			const paymentMethod = props.input.paymentMethod.trim();
			const order = await props.ctx.db.salesOrders.findUniqueOrThrow({
				where: {
					id: props.input.salesId,
				},
				select: {
					id: true,
					orderId: true,
					type: true,
					amountDue: true,
					meta: true,
				},
			});

			if (order.type !== "order") {
				throw new Error("Payment method can only be changed on orders.");
			}

			const amountDue = Math.max(Number(order.amountDue || 0), 0);
			if (amountDue <= 0) {
				throw new Error(
					"Payment method cannot be changed after payment is complete.",
				);
			}

			const meta = asRecord(order.meta) ?? {};
			const cccPercentage = resolveCccPercentageFromMeta(meta);
			const charge = calculatePaymentChannelCharge({
				paymentMethod,
				paymentAmount: amountDue,
				cccPercentage,
			});
			const newSalesForm = asRecord(meta.newSalesForm);
			const form = asRecord(newSalesForm?.form);
			const nextNewSalesForm = newSalesForm
				? {
						...newSalesForm,
						form: {
							...(form ?? {}),
							paymentMethod,
						},
					}
				: undefined;

			return props.ctx.db.salesOrders.update({
				where: {
					id: order.id,
				},
				data: {
					meta: {
						...meta,
						...(nextNewSalesForm
							? {
									newSalesForm: nextNewSalesForm,
								}
							: {}),
						payment_option: paymentMethod,
						ccc_percentage: cccPercentage,
						ccc: charge.amount,
					},
				},
				select: {
					id: true,
					orderId: true,
					amountDue: true,
					meta: true,
				},
			});
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
