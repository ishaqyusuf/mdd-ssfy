import {
	dealerPortalConvertQuoteSchema,
	dealerPortalCustomersListSchema,
	dealerPortalCustomerLookupSchema,
	dealerPortalCustomerSchema,
	dealerPortalSaveQuoteSchema,
	dealerPortalSalesDocumentSchema,
	dealerPortalSalesDocumentsSchema,
	dealerPortalSalesListSchema,
	dealerPortalSalesProfileSchema,
	dealerPortalSettingsSchema,
} from "@api/schemas/dealer";
import { getDealershipCustomersFilter } from "@api/filters/dealership-customers-filter";
import { getDealershipOrdersFilter } from "@api/filters/dealership-orders-filter";
import { getDealershipQuotesFilter } from "@api/filters/dealership-quotes-filter";
import {
	getDealerPortalCustomers,
	getDealerPortalCustomer,
	getDealerPortalCustomersList,
	getDealerPortalDashboard,
	getDealerPortalSalesDocuments,
	getDealerPortalSalesDocument,
	getDealerPortalSalesList,
	getDealerPortalSalesProfiles,
	getDealerPortalInternalSalesProfile,
	getDealerPortalSettings,
	convertDealerPortalQuoteToOrder,
	saveDealerPortalCustomer,
	saveDealerPortalQuote,
	saveDealerPortalSalesProfile,
	saveDealerPortalSettings,
} from "@gnd/db/queries";
import { createTRPCRouter, dealerProtectedProcedure } from "../init";

export const dealerPortalRouter = createTRPCRouter({
	me: dealerProtectedProcedure.query(({ ctx }) => {
		return ctx.dealer;
	}),
	dashboard: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalDashboard(ctx.db, ctx.dealer.id);
	}),
	customers: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalCustomers(ctx.db, ctx.dealer.id);
	}),
	customer: dealerProtectedProcedure
		.input(dealerPortalCustomerLookupSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalCustomer(ctx.db, ctx.dealer.id, input.id);
		}),
	customersList: dealerProtectedProcedure
		.input(dealerPortalCustomersListSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalCustomersList(ctx.db, ctx.dealer.id, input);
		}),
	customerFilters: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealershipCustomersFilter(ctx, ctx.dealer.id);
	}),
	saveCustomer: dealerProtectedProcedure
		.input(dealerPortalCustomerSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalCustomer(ctx.db, ctx.dealer.id, input);
		}),
	salesProfiles: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalSalesProfiles(ctx.db, ctx.dealer.id);
	}),
	internalSalesProfile: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalInternalSalesProfile(ctx.db);
	}),
	saveSalesProfile: dealerProtectedProcedure
		.input(dealerPortalSalesProfileSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalSalesProfile(ctx.db, ctx.dealer.id, input);
		}),
	salesDocuments: dealerProtectedProcedure
		.input(dealerPortalSalesDocumentsSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalSalesDocuments(ctx.db, ctx.dealer.id, input.type);
		}),
	orders: dealerProtectedProcedure
		.input(dealerPortalSalesListSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalSalesList(ctx.db, ctx.dealer.id, "order", input);
		}),
	orderFilters: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealershipOrdersFilter(ctx, ctx.dealer.id);
	}),
	quotes: dealerProtectedProcedure
		.input(dealerPortalSalesListSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalSalesList(ctx.db, ctx.dealer.id, "quote", input);
		}),
	quoteFilters: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealershipQuotesFilter(ctx, ctx.dealer.id);
	}),
	salesDocument: dealerProtectedProcedure
		.input(dealerPortalSalesDocumentSchema)
		.query(({ ctx, input }) => {
			return getDealerPortalSalesDocument(ctx.db, ctx.dealer.id, input.id);
		}),
	saveQuote: dealerProtectedProcedure
		.input(dealerPortalSaveQuoteSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalQuote(ctx.db, ctx.dealer.id, input);
		}),
	convertQuoteToOrder: dealerProtectedProcedure
		.input(dealerPortalConvertQuoteSchema)
		.mutation(({ ctx, input }) => {
			return convertDealerPortalQuoteToOrder(ctx.db, ctx.dealer.id, input.id);
		}),
	settings: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalSettings(ctx.db, ctx.dealer.id);
	}),
	saveSettings: dealerProtectedProcedure
		.input(dealerPortalSettingsSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalSettings(ctx.db, ctx.dealer.id, input);
		}),
});
