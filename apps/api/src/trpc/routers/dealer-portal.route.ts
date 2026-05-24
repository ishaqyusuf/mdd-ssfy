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
  saveDealerPortalSalesProfile,
  saveDealerPortalSettings,
} from "@gnd/db/queries";
import { saveDealerPortalQuote } from "@api/db/queries/dealer-portal-sales-form";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import {
  getNewSalesFormShelfCategoriesSchema,
  getNewSalesFormShelfProductsSchema,
} from "@api/schemas/new-sales-form";
import {
  getNewSalesFormShelfCategories,
  getNewSalesFormShelfProducts,
} from "@api/db/queries/new-sales-form";
import {
  getStepComponents,
  getStepComponentsSchema,
  getSuppliers,
  getSuppliersSchema,
} from "@api/db/queries/sales-form";
import {
  deriveDealerWorkflowVisibility,
  isDealerRootComponentAllowed,
  isDealerShelfCategoryAllowed,
  isDealerShelfProductAllowed,
  isDealerWorkflowStepAllowed,
  resolveDealerWorkflowStepUid,
  type DealerWorkflowVisibility,
} from "@api/utils/dealer-workflow-visibility";
import { createTRPCRouter, dealerProtectedProcedure } from "../init";

const dealerWorkflowStepComponentsSchema = getStepComponentsSchema.pick({
  stepTitle: true,
  stepId: true,
});

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
  taxProfiles: dealerProtectedProcedure.query(({ ctx }) => {
    return ctx.db.taxes.findMany({
      select: {
        taxCode: true,
        title: true,
        percentage: true,
      },
    });
  }),
  internalSalesProfile: dealerProtectedProcedure.query(({ ctx }) => {
    return getDealerPortalInternalSalesProfile(ctx.db);
  }),
  workflowReference: dealerProtectedProcedure.query(async ({ ctx }) => {
    const routeData = await getNewSalesFormStepRouting(ctx, {});
    const visibility = deriveDealerWorkflowVisibility(routeData);
    return toDealerWorkflowReference(routeData, visibility);
  }),
  workflowStepComponents: dealerProtectedProcedure
    .input(dealerWorkflowStepComponentsSchema)
    .query(async ({ ctx, input }) => {
      const routeData = await getNewSalesFormStepRouting(ctx, {});
      const visibility = deriveDealerWorkflowVisibility(routeData);
      const stepUid = resolveDealerWorkflowStepUid(routeData, input);
      if (!isDealerWorkflowStepAllowed(visibility, stepUid)) return [];

      const components = await getStepComponents(ctx, input);
      const visibleComponents =
        stepUid === visibility.rootStepUid
          ? components.filter((component) =>
              isDealerRootComponentAllowed(visibility, toRecord(component).uid),
            )
          : components;
      return visibleComponents.map(toDealerWorkflowComponent);
    }),
  workflowShelfCategories: dealerProtectedProcedure
    .input(getNewSalesFormShelfCategoriesSchema)
    .query(async ({ ctx, input }) => {
      const routeData = await getNewSalesFormStepRouting(ctx, {});
      const visibility = deriveDealerWorkflowVisibility(routeData);
      const categories = await getNewSalesFormShelfCategories(ctx, input);
      return categories.filter((category) =>
        isDealerShelfCategoryAllowed(visibility, category),
      );
    }),
  workflowShelfProducts: dealerProtectedProcedure
    .input(getNewSalesFormShelfProductsSchema)
    .query(async ({ ctx, input }) => {
      const routeData = await getNewSalesFormStepRouting(ctx, {});
      const visibility = deriveDealerWorkflowVisibility(routeData);
      const products = await getNewSalesFormShelfProducts(ctx, input);
      return products.filter((product) =>
        isDealerShelfProductAllowed(visibility, product),
      );
    }),
  workflowDoorSuppliers: dealerProtectedProcedure
    .input(getSuppliersSchema)
    .query(({ ctx, input }) => {
      return getSuppliers(ctx, input);
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
      return saveDealerPortalQuote(ctx, ctx.dealer.id, input);
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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toDealerWorkflowComponent(input: unknown) {
  const component = toRecord(input);
  return {
    id: typeof component.id === "number" ? component.id : null,
    uid: typeof component.uid === "string" ? component.uid : null,
    title: typeof component.title === "string" ? component.title : null,
    img: typeof component.img === "string" ? component.img : null,
    productId:
      typeof component.productId === "number" ? component.productId : null,
    variations: Array.isArray(component.variations) ? component.variations : [],
    sectionOverride: component.sectionOverride ?? null,
    salesPrice:
      typeof component.salesPrice === "number" ? component.salesPrice : null,
    basePrice:
      typeof component.basePrice === "number" ? component.basePrice : null,
    stepId: typeof component.stepId === "number" ? component.stepId : null,
    stepUid: typeof component.stepUid === "string" ? component.stepUid : null,
    priceStepDeps: Array.isArray(component.priceStepDeps)
      ? component.priceStepDeps
      : [],
    pricing: toRecord(component.pricing),
    redirectUid:
      typeof component.redirectUid === "string" ? component.redirectUid : null,
    isDeleted: component.isDeleted === true,
  };
}

function toDealerWorkflowReference(
  routeData: Record<string, unknown>,
  visibility: DealerWorkflowVisibility,
) {
  const stepsByUid = toRecord(routeData.stepsByUid);
  const composedRouter = Object.fromEntries(
    Object.entries(toRecord(routeData.composedRouter))
      .filter(([uid]) => visibility.visibleRootUids.has(uid))
      .map(([uid, value]) => [uid, toRecord(value)]),
  );
  const stepsById = Object.fromEntries(
    Object.entries(toRecord(routeData.stepsById)).flatMap(([id, uid]) =>
      typeof uid === "string" && visibility.allowedStepUids.has(uid)
        ? ([[id, uid]] as const)
        : [],
    ),
  );
  const sanitizedStepsByUid = Object.fromEntries(
    Object.entries(stepsByUid)
      .filter(([uid]) => visibility.allowedStepUids.has(uid))
      .map(([uid, value]) => {
        const step = toRecord(value);
        const rawComponents = Array.isArray(step.components)
          ? step.components
          : [];
        const components = rawComponents
          .filter((component) => {
            if (uid !== visibility.rootStepUid) return true;
            return isDealerRootComponentAllowed(
              visibility,
              toRecord(component).uid,
            );
          })
          .map((component) => toDealerWorkflowComponent(toRecord(component)));
        return [
          uid,
          {
            id: typeof step.id === "number" ? step.id : null,
            uid: typeof step.uid === "string" ? step.uid : uid,
            title: typeof step.title === "string" ? step.title : null,
            meta: toRecord(step.meta),
            components,
          },
        ];
      }),
  );

  return {
    composedRouter,
    stepsByUid: sanitizedStepsByUid,
    stepsById,
    rootStepUid:
      typeof routeData.rootStepUid === "string" ? routeData.rootStepUid : null,
    rootComponents: Array.isArray(routeData.rootComponents)
      ? routeData.rootComponents
          .filter((component) =>
            isDealerRootComponentAllowed(visibility, toRecord(component).uid),
          )
          .map((component) => toDealerWorkflowComponent(toRecord(component)))
      : [],
  };
}
