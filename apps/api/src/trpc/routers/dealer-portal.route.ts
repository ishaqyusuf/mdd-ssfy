import { createSalesCheckoutLink } from "@api/db/queries/checkout";
import { saveDealerPortalQuote } from "@api/db/queries/dealer-portal-sales-form";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import {
  getNewSalesFormShelfCategories,
  getNewSalesFormShelfProductDetails,
  getNewSalesFormShelfProductIndex,
  getNewSalesFormShelfProducts,
} from "@api/db/queries/new-sales-form";
import {
  getStepComponents,
  getSuppliers,
  getSuppliersSchema,
} from "@api/db/queries/sales-form";
import { getDealershipCustomersFilter } from "@api/filters/dealership-customers-filter";
import { getDealershipOrdersFilter } from "@api/filters/dealership-orders-filter";
import { getDealershipQuotesFilter } from "@api/filters/dealership-quotes-filter";
import {
  dealerPortalConvertQuoteSchema,
  dealerPortalCreatePaymentLinkSchema,
  dealerPortalCustomerLookupSchema,
  dealerPortalCustomerOfficeVisibilitySchema,
  dealerPortalCustomerPaymentStatusSchema,
  dealerPortalCustomerSchema,
  dealerPortalCustomersListSchema,
  dealerPortalPrintDocumentSchema,
  dealerPortalRequestQuoteOrderSchema,
  dealerPortalSalesDocumentSchema,
  dealerPortalSalesDocumentsSchema,
  dealerPortalSalesListSchema,
  dealerPortalSalesProfileSchema,
  dealerPortalSaveQuoteSchema,
  dealerPortalSettingsSchema,
} from "@api/schemas/dealer";
import {
  getNewSalesFormShelfCategoriesSchema,
  getNewSalesFormShelfProductDetailsSchema,
  getNewSalesFormShelfProductIndexSchema,
  getNewSalesFormShelfProductsSchema,
} from "@api/schemas/new-sales-form";
import {
  type DealerWorkflowVisibility,
  deriveDealerWorkflowVisibility,
  isDealerRootComponentAllowed,
  isDealerShelfCategoryAllowed,
  isDealerShelfProductAllowed,
  isDealerWorkflowStepAllowed,
  resolveDealerWorkflowStepUid,
} from "@api/utils/dealer-workflow-visibility";
import { resolveSalesDocumentHtmlPreviewAccess } from "@api/utils/sales-document-access";
import {
  deleteDealerPortalCustomer,
  getDealerPortalCustomer,
  getDealerPortalCustomerOverview,
  getDealerPortalCustomers,
  getDealerPortalCustomersList,
  getDealerPortalDashboard,
  getDealerPortalInternalSalesProfile,
  getDealerPortalPrimarySalesProfile,
  getDealerPortalSalesDocument,
  getDealerPortalSalesDocuments,
  getDealerPortalSalesList,
  getDealerPortalSalesProfiles,
  getDealerPortalSettings,
  requestDealerPortalQuoteOrder,
  saveDealerPortalCustomer,
  updateDealerPortalCustomerOfficeVisibility,
  saveDealerPortalSalesProfile,
  saveDealerPortalSettings,
  updateDealerPortalCustomerPayment,
} from "@gnd/db/queries";
import { NotificationService } from "@gnd/notifications/services/triggers";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { type SalesPaymentTokenSchema, tokenize } from "@gnd/utils/tokenizer";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, dealerProtectedProcedure } from "../init";

const dealerWorkflowStepComponentsSchema = z.object({
  stepTitle: z.string().optional().nullable(),
  stepId: z.number().optional(),
});

function dealerPaymentExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function dealerPaymentAccountNo(input: {
  customerId?: number | null;
  customerPhone?: string | null;
}) {
  return (
    input.customerPhone ||
    (input.customerId ? `cust-${input.customerId}` : null)
  );
}

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
  customerOverview: dealerProtectedProcedure
    .input(dealerPortalCustomerLookupSchema)
    .query(({ ctx, input }) => {
      return getDealerPortalCustomerOverview(ctx.db, ctx.dealer.id, input.id);
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
  deleteCustomer: dealerProtectedProcedure
    .input(dealerPortalCustomerLookupSchema)
    .mutation(({ ctx, input }) => {
      return deleteDealerPortalCustomer(ctx.db, ctx.dealer.id, input.id);
    }),
  updateCustomerOfficeVisibility: dealerProtectedProcedure
    .input(dealerPortalCustomerOfficeVisibilitySchema)
    .mutation(({ ctx, input }) => {
      return updateDealerPortalCustomerOfficeVisibility(
        ctx.db,
        ctx.dealer.id,
        input,
      );
    }),
  salesProfiles: dealerProtectedProcedure.query(({ ctx }) => {
    return getDealerPortalSalesProfiles(ctx.db, ctx.dealer.id);
  }),
  primarySalesProfile: dealerProtectedProcedure.query(({ ctx }) => {
    return getDealerPortalPrimarySalesProfile(ctx.db, ctx.dealer.id);
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
  workflowShelfProductIndex: dealerProtectedProcedure
    .input(getNewSalesFormShelfProductIndexSchema)
    .query(async ({ ctx, input }) => {
      const routeData = await getNewSalesFormStepRouting(ctx, {});
      const visibility = deriveDealerWorkflowVisibility(routeData);
      if (visibility.shelfCategoryVisibility.mode !== "allowlist") {
        return getNewSalesFormShelfProductIndex(ctx, input);
      }
      const products = await getNewSalesFormShelfProducts(ctx, {
        categoryIds: visibility.shelfCategoryVisibility.categoryIds,
      });
      return products
        .filter((product) => isDealerShelfProductAllowed(visibility, product))
        .map((product) => ({
          id: product.id,
          title: product.title,
          unitPrice: product.unitPrice,
        }));
    }),
  workflowShelfProductDetails: dealerProtectedProcedure
    .input(getNewSalesFormShelfProductDetailsSchema)
    .query(async ({ ctx, input }) => {
      const routeData = await getNewSalesFormStepRouting(ctx, {});
      const visibility = deriveDealerWorkflowVisibility(routeData);
      const products = await getNewSalesFormShelfProductDetails(ctx, input);
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
  printDocument: dealerProtectedProcedure
    .input(dealerPortalPrintDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const sale = await ctx.db.salesOrders.findFirst({
        where: {
          id: input.id,
          dealerAuthId: ctx.dealer.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!sale) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return resolveSalesDocumentHtmlPreviewAccess({
        db: ctx.db,
        salesIds: [sale.id],
        mode: input.mode,
        pricingMode: input.pricingMode,
        baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      });
    }),
  createPaymentLink: dealerProtectedProcedure
    .input(dealerPortalCreatePaymentLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const sale = await ctx.db.salesOrders.findFirst({
        where: {
          id: input.id,
          dealerAuthId: ctx.dealer.id,
          deletedAt: null,
          type: {
            not: "quote",
          },
        },
        select: {
          id: true,
          amountDue: true,
          customerId: true,
          customer: {
            select: {
              phoneNo: true,
            },
          },
          billingAddress: {
            select: {
              phoneNo: true,
            },
          },
          shippingAddress: {
            select: {
              phoneNo: true,
            },
          },
        },
      });

      if (!sale) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const amountDue = Number(sale.amountDue || 0);
      if (amountDue <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order does not have an outstanding balance.",
        });
      }

      const accountNo = dealerPaymentAccountNo({
        customerId: sale.customerId,
        customerPhone:
          sale.billingAddress?.phoneNo ||
          sale.customer?.phoneNo ||
          sale.shippingAddress?.phoneNo ||
          null,
      });
      if (!accountNo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This order is missing customer payment identity.",
        });
      }

      const wallet = await getCustomerWallet(ctx.db, accountNo);
      if (!wallet?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This customer does not have a payment wallet yet.",
        });
      }

      const token = tokenize({
        salesIds: [sale.id],
        expiry: dealerPaymentExpiry(),
        payPlan: "full",
        amount: amountDue,
        walletId: wallet.id,
      } satisfies SalesPaymentTokenSchema);
      const result = await createSalesCheckoutLink(ctx, {
        token,
        amount: input.amount ?? null,
        selectedSalesIds: [sale.id],
      });

      if (!result?.paymentLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not create payment link for this order.",
        });
      }

      return result;
    }),
  updateCustomerPaymentStatus: dealerProtectedProcedure
    .input(dealerPortalCustomerPaymentStatusSchema)
    .mutation(({ ctx, input }) =>
      updateDealerPortalCustomerPayment(ctx.db, ctx.dealer.id, input),
    ),
  saveQuote: dealerProtectedProcedure
    .input(dealerPortalSaveQuoteSchema)
    .mutation(({ ctx, input }) => {
      return saveDealerPortalQuote(ctx, ctx.dealer.id, input);
    }),
  convertQuoteToOrder: dealerProtectedProcedure
    .input(dealerPortalConvertQuoteSchema)
    .mutation(() => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Direct quote conversion has been retired. Request office approval to create an order.",
      });
    }),
  requestQuoteOrder: dealerProtectedProcedure
    .input(dealerPortalRequestQuoteOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await requestDealerPortalQuoteOrder(
        ctx.db,
        ctx.dealer.id,
        input.id,
      );
      if (!result.alreadyPending) {
        const recipientIds = result.salesRepId
          ? [result.salesRepId]
          : (
              await ctx.db.users.findMany({
                where: {
                  deletedAt: null,
                  roles: {
                    some: {
                      deletedAt: null,
                      role: {
                        name: "Sales Team",
                      },
                    },
                  },
                },
                select: {
                  id: true,
                },
              })
            ).map((user) => user.id);

        if (!recipientIds.length) return result;
        const notificationService = new NotificationService(tasks, ctx);
        notificationService.setEmployeeRecipients(...recipientIds);
        await notificationService.send("dealer_sales_request", {
          author: {
            // Dealer sessions do not have an employee user id. Use the assigned
            // rep (or the first eligible Sales Team recipient) as the system
            // activity author so the notification job has a valid employee.
            id: result.salesRepId ?? recipientIds[0],
            role: "employee",
          },
          payload: result.notification,
        });
      }
      return result;
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
