import {
	bootstrapNewSalesForm,
	deleteNewSalesFormLineItem,
	deleteNewSalesFormShelfProduct,
	getNewSalesForm,
	getNewSalesFormHistorySnapshot,
	getNewSalesFormShelfCategories,
	getNewSalesFormShelfProductDetails,
	getNewSalesFormShelfProductIndex,
	getNewSalesFormShelfProducts,
	getNewSalesFormStepRouting,
	recalculateNewSalesForm,
	resolveNewSalesCustomer,
	saveDraftNewSalesForm,
	saveFinalNewSalesForm,
	searchNewSalesCustomers,
	searchNewSalesFormServiceSuggestions,
	searchNewSalesFormShelfProducts,
	updateNewSalesFormShelfProduct,
} from "@api/db/queries/new-sales-form";
import {
	createNewSalesFormAdjustment,
	getNewSalesFormAdjustmentApproval,
	getNewSalesFormAdjustmentStatus,
	getNewSalesFormCommitmentSnapshot,
	previewNewSalesFormAdjustment,
	respondNewSalesFormAdjustmentApproval,
} from "@api/db/queries/new-sales-form-adjustments";
import {
	getSalesFormAdoption,
	recordSalesFormUsage,
	resetLegacySalesFormPreferences,
} from "@api/db/queries/sales-form-adoption";
import {
	bootstrapNewSalesFormSchema,
	createNewSalesFormAdjustmentSchema,
	deleteNewSalesFormLineItemSchema,
	deleteNewSalesFormShelfProductSchema,
	getNewSalesFormHistorySnapshotSchema,
	getNewSalesFormAdjustmentApprovalSchema,
	getNewSalesFormSchema,
	getNewSalesFormShelfCategoriesSchema,
	getNewSalesFormShelfProductDetailsSchema,
	getNewSalesFormShelfProductIndexSchema,
	getNewSalesFormShelfProductsSchema,
	getNewSalesFormStepRoutingSchema,
	recalculateNewSalesFormSchema,
	previewNewSalesFormAdjustmentSchema,
	respondNewSalesFormAdjustmentApprovalSchema,
	resolveNewSalesCustomerSchema,
	saveDraftNewSalesFormSchema,
	saveFinalNewSalesFormSchema,
	searchNewSalesCustomersSchema,
	searchNewSalesFormServiceSuggestionsSchema,
	searchNewSalesFormShelfProductsSchema,
	updateNewSalesFormShelfProductSchema,
} from "@api/schemas/new-sales-form";
import {
	salesFormAdoptionSchema,
	salesFormUsageSchema,
} from "@api/schemas/sales-form-adoption";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const newSalesFormRouter = createTRPCRouter({
	adoptionPing: protectedProcedure
		.input(salesFormUsageSchema)
		.mutation(async ({ ctx, input }) => {
			return recordSalesFormUsage(ctx, input);
		}),
	adoption: protectedProcedure
		.input(salesFormAdoptionSchema.optional())
		.query(async ({ ctx, input }) => {
			return getSalesFormAdoption(ctx, input ?? {});
		}),
	resetLegacyPreferences: protectedProcedure.mutation(async ({ ctx }) => {
		return resetLegacySalesFormPreferences(ctx);
	}),
	bootstrap: protectedProcedure
		.input(bootstrapNewSalesFormSchema)
		.query(async (props) => {
			return bootstrapNewSalesForm(props.ctx, props.input);
		}),
	get: protectedProcedure.input(getNewSalesFormSchema).query(async (props) => {
		const form = await getNewSalesForm(props.ctx, props.input);
		if (!form.salesId || form.type !== "order") {
			return { ...form, changeProtection: null, activeAdjustment: null };
		}
		const [changeProtection, activeAdjustment] = await Promise.all([
			getNewSalesFormCommitmentSnapshot(props.ctx.db, form.salesId),
			getNewSalesFormAdjustmentStatus(props.ctx.db, form.salesId),
		]);
		return { ...form, changeProtection, activeAdjustment };
	}),
	previewAdjustment: protectedProcedure
		.input(previewNewSalesFormAdjustmentSchema)
		.mutation(async ({ ctx, input }) =>
			previewNewSalesFormAdjustment(ctx, input),
		),
	createAdjustment: protectedProcedure
		.input(createNewSalesFormAdjustmentSchema)
		.mutation(async ({ ctx, input }) =>
			createNewSalesFormAdjustment(ctx, input),
		),
	getAdjustmentApproval: publicProcedure
		.input(getNewSalesFormAdjustmentApprovalSchema)
		.query(async ({ ctx, input }) =>
			getNewSalesFormAdjustmentApproval(ctx, input),
		),
	respondAdjustmentApproval: publicProcedure
		.input(respondNewSalesFormAdjustmentApprovalSchema)
		.mutation(async ({ ctx, input }) =>
			respondNewSalesFormAdjustmentApproval(ctx, input),
		),
	getHistorySnapshot: protectedProcedure
		.input(getNewSalesFormHistorySnapshotSchema)
		.query(async (props) => {
			return getNewSalesFormHistorySnapshot(props.ctx, props.input);
		}),
	getStepRouting: protectedProcedure
		.input(getNewSalesFormStepRoutingSchema)
		.query(async (props) => {
			return getNewSalesFormStepRouting(props.ctx, props.input);
		}),
	getShelfCategories: protectedProcedure
		.input(getNewSalesFormShelfCategoriesSchema)
		.query(async (props) => {
			return getNewSalesFormShelfCategories(props.ctx, props.input);
		}),
	getShelfProducts: protectedProcedure
		.input(getNewSalesFormShelfProductsSchema)
		.query(async (props) => {
			return getNewSalesFormShelfProducts(props.ctx, props.input);
		}),
	getShelfProductIndex: protectedProcedure
		.input(getNewSalesFormShelfProductIndexSchema)
		.query(async (props) => {
			return getNewSalesFormShelfProductIndex(props.ctx, props.input);
		}),
	getShelfProductDetails: protectedProcedure
		.input(getNewSalesFormShelfProductDetailsSchema)
		.query(async (props) => {
			return getNewSalesFormShelfProductDetails(props.ctx, props.input);
		}),
	searchShelfProducts: protectedProcedure
		.input(searchNewSalesFormShelfProductsSchema)
		.query(async (props) => {
			return searchNewSalesFormShelfProducts(props.ctx, props.input);
		}),
	searchServiceSuggestions: protectedProcedure
		.input(searchNewSalesFormServiceSuggestionsSchema)
		.query(async (props) => {
			return searchNewSalesFormServiceSuggestions(props.ctx, props.input);
		}),
	updateShelfProduct: protectedProcedure
		.input(updateNewSalesFormShelfProductSchema)
		.mutation(async (props) => {
			return updateNewSalesFormShelfProduct(props.ctx, props.input);
		}),
	deleteShelfProduct: protectedProcedure
		.input(deleteNewSalesFormShelfProductSchema)
		.mutation(async (props) => {
			return deleteNewSalesFormShelfProduct(props.ctx, props.input);
		}),
	searchCustomers: protectedProcedure
		.input(searchNewSalesCustomersSchema)
		.query(async (props) => {
			return searchNewSalesCustomers(props.ctx, props.input);
		}),
	resolveCustomer: protectedProcedure
		.input(resolveNewSalesCustomerSchema)
		.query(async (props) => {
			return resolveNewSalesCustomer(props.ctx, props.input);
		}),
	recalculate: protectedProcedure
		.input(recalculateNewSalesFormSchema)
		.mutation(async (props) => {
			return recalculateNewSalesForm(props.ctx, props.input);
		}),
	saveDraft: protectedProcedure
		.input(saveDraftNewSalesFormSchema)
		.mutation(async (props) => {
			return saveDraftNewSalesForm(props.ctx, props.input);
		}),
	saveFinal: protectedProcedure
		.input(saveFinalNewSalesFormSchema)
		.mutation(async (props) => {
			return saveFinalNewSalesForm(props.ctx, props.input);
		}),
	deleteLineItem: protectedProcedure
		.input(deleteNewSalesFormLineItemSchema)
		.mutation(async (props) => {
			return deleteNewSalesFormLineItem(props.ctx, props.input);
		}),
});
