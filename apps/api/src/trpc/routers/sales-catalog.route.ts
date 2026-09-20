import {
	getSalesFormCatalog,
	getSalesFormCatalogRevisionSnapshot,
	getSalesFormComponentUsageRanks,
	searchSalesFormCustomComponents,
} from "@api/db/queries/new-sales-form-catalog";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form-routing";
import {
	getNewSalesFormCatalogRevisionSchema,
	getNewSalesFormCatalogSchema,
	getNewSalesFormStepRoutingSchema,
	searchNewSalesFormCustomComponentsSchema,
} from "@api/schemas/new-sales-form";
import { createTRPCRouter, protectedProcedure } from "../init";

export const salesCatalogRouter = createTRPCRouter({
	newSalesForm: createTRPCRouter({
		getStepRouting: protectedProcedure
			.input(getNewSalesFormStepRoutingSchema)
			.query(({ ctx, input }) =>
				getNewSalesFormStepRouting(ctx, input, { interactive: true }),
			),
		getComponentCatalog: protectedProcedure
			.input(getNewSalesFormCatalogSchema)
			.query(({ ctx, input }) => getSalesFormCatalog(ctx, input)),
		getComponentUsageRanks: protectedProcedure
			.input(getNewSalesFormCatalogSchema)
			.query(({ ctx, input }) => getSalesFormComponentUsageRanks(ctx, input)),
		getCatalogRevision: protectedProcedure
			.input(getNewSalesFormCatalogRevisionSchema)
			.query(({ ctx }) => getSalesFormCatalogRevisionSnapshot(ctx)),
		searchCustomComponents: protectedProcedure
			.input(searchNewSalesFormCustomComponentsSchema)
			.query(({ ctx, input }) => searchSalesFormCustomComponents(ctx, input)),
	}),
});
