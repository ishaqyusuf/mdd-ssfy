import {
	dealerPortalCustomerSchema,
	dealerPortalSaveQuoteSchema,
	dealerPortalSalesDocumentsSchema,
	dealerPortalSalesProfileSchema,
	dealerPortalSettingsSchema,
} from "@api/schemas/dealer";
import {
	getDealerPortalCustomers,
	getDealerPortalDashboard,
	getDealerPortalSalesDocuments,
	getDealerPortalSalesProfiles,
	getDealerPortalSettings,
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
	saveCustomer: dealerProtectedProcedure
		.input(dealerPortalCustomerSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalCustomer(ctx.db, ctx.dealer.id, input);
		}),
	salesProfiles: dealerProtectedProcedure.query(({ ctx }) => {
		return getDealerPortalSalesProfiles(ctx.db, ctx.dealer.id);
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
	saveQuote: dealerProtectedProcedure
		.input(dealerPortalSaveQuoteSchema)
		.mutation(({ ctx, input }) => {
			return saveDealerPortalQuote(ctx.db, ctx.dealer.id, input);
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
