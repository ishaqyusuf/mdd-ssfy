import type { DealerPortalSaveQuoteSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@gnd/db";
import {
  getDealerPortalInternalSalesProfile,
  validateDealerPortalQuoteVisibility,
} from "@gnd/db/queries";
import { composeDealerSalesFormQuotePricing } from "@gnd/sales/sales-form";

type NormalizedDealerQuoteLineItem = {
  uid: string;
  title: string;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  meta: Record<string, unknown>;
  formSteps: Record<string, unknown>[];
  shelfItems: Record<string, unknown>[];
  housePackageTool: Record<string, unknown> | null;
};

const DEALER_PROGRAM_PARTNER_SUFFIX = "DPP";

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        )
        .map((item) => safeRecord(item))
    : [];
}

function finiteOptionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveOptionalNumber(value: unknown) {
  const number = finiteOptionalNumber(value);
  return number != null && number > 0 ? number : null;
}

function normalizeDealerQuoteLines(
  lineItems: DealerPortalSaveQuoteSchema["lineItems"],
): NormalizedDealerQuoteLineItem[] {
  return lineItems.map((line, index) => {
    const qty = Number(line.qty ?? 0);
    const unitPrice = Number(line.unitPrice ?? 0);
    const lineTotal = roundCurrency(
      Number.isFinite(Number(line.lineTotal))
        ? Number(line.lineTotal)
        : qty * unitPrice,
    );

    return {
      uid: line.uid || `dealer-line-${index + 1}`,
      title: line.title?.trim() || `Line ${index + 1}`,
      description: line.description?.trim() || "",
      qty,
      unitPrice,
      lineTotal,
      meta: safeRecord(line.meta),
      formSteps: safeRecordArray(line.formSteps),
      shelfItems: safeRecordArray(line.shelfItems),
      housePackageTool: line.housePackageTool
        ? safeRecord(line.housePackageTool)
        : null,
    };
  });
}

function dealerLineServiceRows(line: NormalizedDealerQuoteLineItem) {
  return safeRecordArray(line.meta.serviceRows);
}

function dealerLineIsTaxable(line: NormalizedDealerQuoteLineItem) {
  if (typeof line.meta.taxxable === "boolean") return line.meta.taxxable;
  if (typeof line.meta.tax === "boolean") return line.meta.tax;
  return dealerLineServiceRows(line).some((row) => row.taxxable === true);
}

function dealerLineIsProduceable(line: NormalizedDealerQuoteLineItem) {
  if (typeof line.meta.produceable === "boolean") return line.meta.produceable;
  return dealerLineServiceRows(line).some((row) => row.produceable === true);
}

async function createDealerProgramPartnerIdentity(
  db: Pick<TRPCContext["db"], "salesOrders">,
  type: "order" | "quote",
) {
  const existingDppDocuments = await db.salesOrders.count({
    where: {
      dealerAuthId: {
        not: null,
      },
      deletedAt: null,
      orderId: {
        endsWith: DEALER_PROGRAM_PARTNER_SUFFIX,
      },
    },
  });
  let nextSerial = existingDppDocuments + 1;

  while (true) {
    const orderId = `${nextSerial.toString().padStart(5, "0")}${DEALER_PROGRAM_PARTNER_SUFFIX}`;
    const collisionCount = await db.salesOrders.count({
      where: {
        orderId,
      },
    });

    if (collisionCount === 0) {
      return {
        orderId,
        slug: `${type}-${orderId.toLowerCase()}`,
      };
    }

    nextSerial += 1;
  }
}

export async function saveDealerPortalQuote(
  ctx: TRPCContext,
  dealerId: number,
  input: DealerPortalSaveQuoteSchema,
) {
  return ctx.db.$transaction(async (tx) => {
    const customer = await tx.customers.findFirst({
      where: {
        id: input.customerId,
        dealerOwnerId: dealerId,
        deletedAt: null,
      },
      select: {
        id: true,
        customerTypeId: true,
      },
    });

    if (!customer) {
      throw new Error("Dealer customer could not be found.");
    }

    const [internalProfile, dealerAccount] = await Promise.all([
      getDealerPortalInternalSalesProfile(tx),
      tx.dealerAuth.findUnique({
        where: {
          id: dealerId,
        },
        select: {
          salesRepId: true,
          dealer: {
            select: {
              customerTypeId: true,
              profile: {
                select: {
                  id: true,
                  title: true,
                  coefficient: true,
                  salesPercentage: true,
                },
              },
            },
          },
        },
      } as any),
    ]);

    const dealerProfile =
      (
        dealerAccount as {
          dealer?: {
            profile?: {
              id?: number | null;
              title?: string | null;
              coefficient?: number | null;
              salesPercentage?: number | null;
            } | null;
          } | null;
        } | null
      )?.dealer?.profile || null;
    if (!dealerProfile) {
      throw new Error(
        "Dealer customer profile is required before saving a quote.",
      );
    }
    if (!dealerProfile.id) {
      throw new Error("Dealer customer profile id is required.");
    }

    const normalizedLines = normalizeDealerQuoteLines(input.lineItems);
    await validateDealerPortalQuoteVisibility(tx, normalizedLines);

    const effectiveInternalProfile = {
      ...internalProfile,
      coefficient:
        positiveOptionalNumber(input.pricingContext?.salesCoefficient) ??
        internalProfile?.coefficient,
    };
    const effectiveDealerProfile = {
      ...dealerProfile,
      salesPercentage:
        finiteOptionalNumber(input.pricingContext?.dealerSalesPercentage) ??
        dealerProfile.salesPercentage,
    };

    const pricing = composeDealerSalesFormQuotePricing({
      taxRate: input.taxRate || 0,
      paymentMethod: input.paymentMethod,
      internalProfile: effectiveInternalProfile,
      dealerProfile: effectiveDealerProfile,
      lineItems: normalizedLines,
    });
    const existing = input.id
      ? await tx.salesOrders.findFirst({
          where: {
            id: input.id,
            dealerAuthId: dealerId,
            deletedAt: null,
            type: "quote",
          },
          select: {
            id: true,
            orderId: true,
            slug: true,
          },
        })
      : null;

    if (input.id && !existing) {
      throw new Error("Dealer quote could not be found.");
    }

    const identity =
      existing || (await createDealerProgramPartnerIdentity(tx, "quote"));
    const orderData = {
      orderId: identity.orderId,
      slug: identity.slug,
      type: "quote",
      status: "Draft",
      isDyke: true,
      dealerAuthId: dealerId,
      salesRepId:
        (dealerAccount as { salesRepId?: number | null } | null)?.salesRepId ||
        null,
      customerId: customer.id,
      customerProfileId: internalProfile?.id || null,
      dealerSalesProfileId: dealerProfile?.id || null,
      taxPercentage: pricing.internalPricing.taxRate,
      subTotal: pricing.internalPricing.subTotal,
      tax: pricing.internalPricing.taxTotal,
      grandTotal: pricing.internalPricing.grandTotal,
      amountDue: pricing.internalPricing.grandTotal,
      meta: {
        salesCoefficient: pricing.profiles.internal.coefficient,
        newSalesForm: {
          version: `${Date.now()}`,
          updatedAt: new Date().toISOString(),
          autosave: false,
          lineItems: normalizedLines,
          extraCosts: [],
          summary: pricing.dealerPricing,
          form: {
            customerId: customer.id,
            customerProfileId: dealerProfile?.id || null,
            po: input.po || null,
            paymentTerm: input.paymentTerm || "None",
            goodUntil: input.goodUntil || null,
            deliveryOption: input.deliveryOption || "pickup",
            paymentMethod: input.paymentMethod || null,
            taxCode: input.taxCode || null,
          },
        },
      } as Prisma.InputJsonValue,
    };
    const created = existing
      ? await tx.salesOrders.update({
          where: {
            id: existing.id,
          },
          data: orderData,
          select: {
            id: true,
            orderId: true,
            slug: true,
          },
        })
      : await tx.salesOrders.create({
          data: orderData,
          select: {
            id: true,
            orderId: true,
            slug: true,
          },
        });

    if (existing) {
      await tx.salesOrderItems.deleteMany({
        where: {
          salesOrderId: created.id,
        },
      });
    }

    await tx.salesOrderItems.createMany({
      data: normalizedLines.map((line, index) => ({
        salesOrderId: created.id,
        description: line.description || line.title,
        dykeDescription: line.title,
        qty: line.qty,
        rate: pricing.lines[index]?.internalUnitPrice || line.unitPrice,
        total: pricing.lines[index]?.internalLineTotal || line.lineTotal,
        meta: {
          uid: line.uid,
          title: line.title,
          formSteps: line.formSteps,
          shelfItems: line.shelfItems,
          housePackageTool: line.housePackageTool,
          lineMeta: line.meta,
          tax: dealerLineIsTaxable(line),
        } as Prisma.InputJsonValue,
        dykeProduction: dealerLineIsProduceable(line),
      })),
    });

    await (tx as any).dealerSales.upsert({
      where: {
        salesOrderId: created.id,
      },
      create: {
        salesOrderId: created.id,
        dealerAuthId: dealerId,
        customerId: customer.id,
        dealerCustomerProfileId: dealerProfile.id,
        dealerSalesPercentage: pricing.profiles.dealer.salesPercentage,
        grandTotal: pricing.dealerPricing.grandTotal,
        dueAmount: pricing.dealerPricing.grandTotal,
      },
      update: {
        dealerAuthId: dealerId,
        customerId: customer.id,
        dealerCustomerProfileId: dealerProfile.id,
        dealerSalesPercentage: pricing.profiles.dealer.salesPercentage,
        grandTotal: pricing.dealerPricing.grandTotal,
        dueAmount: pricing.dealerPricing.grandTotal,
      },
    });

    return {
      ...created,
      internalPricing: pricing.internalPricing,
      dealerPricing: pricing.dealerPricing,
    };
  });
}
