import {
	createOrUpdateCustomer,
	createOrUpdateCustomerAddress,
	customerInfoSearch,
	customerInfoSearchSchema,
	getCustomerDirectoryV2Summary,
	getCustomerOverviewV2,
	getCustomerPayPortal,
	getCustomerPayPortalSchema,
	getCustomerStatementDetail,
	getCustomerStatementReport,
	getSalesCustomer,
	getSalesCustomerSchema,
	searchCustomers,
	updateCustomerEmail,
} from "@api/db/queries/customer";
import {
	getCustomerDirectoryV2SummarySchema,
	getCustomerOverviewV2Schema,
	getCustomerStatementDetailSchema,
	getCustomerStatementReportSchema,
	searchCustomersSchema,
	updateCustomerEmailSchema,
	upsertCustomerSchema,
} from "@api/schemas/customer";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import type { CustomerProfileMeta } from "@sales/types";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";
import type { TRPCContext } from "../init";

async function requireCustomerEditor(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["editSalesCustomers"],
		"You do not have permission to edit customers.",
	);
}

export const customerRouter = createTRPCRouter({
	searchCustomers: protectedProcedure
		.input(searchCustomersSchema)
		.query(async (props) => {
			return searchCustomers(props.ctx, props.input);
		}),
	customerInfoSearch: protectedProcedure
		.input(customerInfoSearchSchema)
		.query(async (props) => {
			const result = await customerInfoSearch(props.ctx, props.input);
			return result;
		}),
	getSalesCustomer: protectedProcedure
		.input(getSalesCustomerSchema)
		.query(async (props) => {
			return getSalesCustomer(props.ctx, props.input);
		}),
	getCustomerPayPortal: publicProcedure
		.input(getCustomerPayPortalSchema)
		.query(async (props) => {
			return getCustomerPayPortal(props.ctx, props.input);
		}),
	getCustomerDirectoryV2Summary: protectedProcedure
		.input(getCustomerDirectoryV2SummarySchema)
		.query(async (props) => {
			return getCustomerDirectoryV2Summary(props.ctx, props.input);
		}),
	getCustomerStatementReport: protectedProcedure
		.input(getCustomerStatementReportSchema)
		.query(async (props) => {
			return getCustomerStatementReport(props.ctx, props.input);
		}),
	getCustomerStatementDetail: protectedProcedure
		.input(getCustomerStatementDetailSchema)
		.query(async (props) => {
			return getCustomerStatementDetail(props.ctx, props.input);
		}),
	getCustomerOverviewV2: protectedProcedure
		.input(getCustomerOverviewV2Schema)
		.query(async (props) => {
			return getCustomerOverviewV2(props.ctx, props.input);
		}),
	getTaxProfiles: publicProcedure.query(async (props) => {
		const taxProfiles = await props.ctx.db.taxes.findMany({
			select: {
				taxCode: true,
				title: true,
				percentage: true,
			},
		});
		return taxProfiles;
	}),
	getCustomerProfiles: publicProcedure.query(async (props) => {
		const customerProfiles = await props.ctx.db.customerTypes.findMany({
			select: {
				id: true,
				title: true,
				coefficient: true,
				meta: true,
			},
		});
		return customerProfiles.map((cp) => ({
			...cp,
			meta: cp.meta as CustomerProfileMeta,
		}));
	}),
	createCustomer: protectedProcedure
		.input(upsertCustomerSchema)
		.mutation(async (props) => {
			await requireCustomerEditor(props.ctx);
			return createOrUpdateCustomer(props.ctx, props.input);
		}),
	createCustomerAddress: protectedProcedure
		.input(upsertCustomerSchema)
		.mutation(async (props) => {
			await requireCustomerEditor(props.ctx);
			return createOrUpdateCustomerAddress(props.ctx, props.input);
		}),
	updateCustomerEmail: protectedProcedure
		.input(updateCustomerEmailSchema)
		.mutation(async (props) => {
			return updateCustomerEmail(props.ctx, props.input);
		}),
});
