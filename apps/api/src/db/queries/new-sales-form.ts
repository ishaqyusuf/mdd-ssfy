import type { TRPCContext } from "@api/trpc/init";
import {
  bootstrapNewSalesFormSchema,
  deleteNewSalesFormLineItemSchema,
  getNewSalesFormSchema,
  recalculateNewSalesFormSchema,
  saveDraftNewSalesFormSchema,
  saveFinalNewSalesFormSchema,
  searchNewSalesCustomersSchema,
  type BootstrapNewSalesFormSchema,
  type DeleteNewSalesFormLineItemSchema,
  type GetNewSalesFormSchema,
  type NewSalesFormLineItem,
  type NewSalesFormMeta,
  type NewSalesFormSummary,
  type RecalculateNewSalesFormSchema,
  type SaveDraftNewSalesFormSchema,
  type SaveFinalNewSalesFormSchema,
  type SearchNewSalesCustomersSchema,
} from "@api/schemas/new-sales-form";
import { TRPCError } from "@trpc/server";
import { generateRandomString } from "@gnd/utils";

const DEFAULT_DELIVERY_OPTION = "pickup";
const DEFAULT_PAYMENT_TERM = "None";

type NewSalesFormPersistedMeta = {
  version: string;
  updatedAt: string;
  autosave: boolean;
  lineItems: NewSalesFormLineItem[];
  summary: NewSalesFormSummary;
  form: NewSalesFormMeta;
};

type NewSalesFormContainer = {
  newSalesForm?: NewSalesFormPersistedMeta;
  [key: string]: unknown;
};

function safeMeta(meta: unknown): NewSalesFormContainer {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta as NewSalesFormContainer;
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function recalculateSummary(input: RecalculateNewSalesFormSchema) {
  const subTotal = roundCurrency(
    input.lineItems.reduce((sum, line) => {
      const computed = roundCurrency(line.qty * line.unitPrice);
      return sum + (Number.isFinite(line.lineTotal) ? line.lineTotal! : computed);
    }, 0),
  );
  const taxTotal = roundCurrency(subTotal * (input.taxRate / 100));
  const grandTotal = roundCurrency(subTotal + taxTotal);
  return {
    subTotal,
    taxRate: input.taxRate,
    taxTotal,
    grandTotal,
  };
}

function normalizeLineItems(lines: NewSalesFormLineItem[]) {
  return lines.map((line, index) => {
    const qty = Number(line.qty || 0);
    const unitPrice = Number(line.unitPrice || 0);
    const lineTotal = roundCurrency(
      Number.isFinite(line.lineTotal) ? line.lineTotal : qty * unitPrice,
    );
    return {
      ...line,
      qty,
      unitPrice,
      lineTotal,
      uid: line.uid || `line-${index + 1}-${generateRandomString(6)}`,
    };
  });
}

async function generateSalesIdentity(
  ctx: TRPCContext,
  type: "order" | "quote",
): Promise<{ orderId: string; slug: string }> {
  let orderId = "";
  let slug = "";
  while (!orderId || !slug) {
    const token = generateRandomString(8).toUpperCase();
    const candidateOrderId = `${type === "order" ? "SO" : "SQ"}-${token}`;
    const candidateSlug = `${type}-${token.toLowerCase()}`;
    const existing = await ctx.db.salesOrders.count({
      where: {
        OR: [
          {
            type,
            orderId: candidateOrderId,
          },
          {
            slug: candidateSlug,
          },
        ],
      },
    });
    if (existing === 0) {
      orderId = candidateOrderId;
      slug = candidateSlug;
    }
  }
  return { orderId, slug };
}

function toBootstrapPayload(order: {
  id: number;
  slug: string;
  orderId: string;
  type: string | null;
  status: string | null;
  customerId: number | null;
  customerProfileId: number | null;
  billingAddressId: number | null;
  shippingAddressId: number | null;
  paymentTerm: string | null;
  goodUntil: Date | null;
  deliveryOption: string | null;
  taxPercentage: number | null;
  subTotal: number | null;
  tax: number | null;
  grandTotal: number | null;
  updatedAt: Date | null;
  items: Array<{
    id: number;
    description: string | null;
    qty: number | null;
    rate: number | null;
    total: number | null;
    meta: unknown;
    deletedAt: Date | null;
  }>;
  customer: {
    id: number;
    name: string | null;
    businessName: string | null;
    phoneNo: string | null;
    email: string | null;
  } | null;
  meta: unknown;
}) {
  const container = safeMeta(order.meta);
  const persisted = container.newSalesForm;
  const persistedLines = persisted?.lineItems || [];
  const dbLines = order.items
    .filter((item) => !item.deletedAt)
    .map((item, index) => {
      const meta = safeMeta(item.meta);
      return {
        id: item.id,
        uid:
          (typeof meta.uid === "string" && meta.uid) ||
          `line-${index + 1}-${generateRandomString(6)}`,
        title: item.description || `Line ${index + 1}`,
        description: item.description,
        qty: Number(item.qty || 0),
        unitPrice: Number(item.rate || 0),
        lineTotal: Number(item.total || 0),
        meta: meta.meta || {},
      };
    });

  const lineItems = persistedLines.length ? persistedLines : dbLines;
  const taxRate = Number(order.taxPercentage || persisted?.summary?.taxRate || 0);
  const summary = recalculateSummary({
    taxRate,
    lineItems,
  });

  return {
    salesId: order.id,
    slug: order.slug,
    orderId: order.orderId,
    type: (order.type || "order") as "order" | "quote",
    status: order.status || "Draft",
    version:
      persisted?.version ||
      `${order.updatedAt?.getTime() || Date.now()}-${generateRandomString(6)}`,
    updatedAt:
      persisted?.updatedAt ||
      order.updatedAt?.toISOString() ||
      new Date().toISOString(),
    customer: order.customer,
    form: {
      customerId: order.customerId,
      customerProfileId: order.customerProfileId,
      billingAddressId: order.billingAddressId,
      shippingAddressId: order.shippingAddressId,
      paymentTerm: order.paymentTerm || DEFAULT_PAYMENT_TERM,
      goodUntil: order.goodUntil?.toISOString() || null,
      po: null,
      notes: null,
      deliveryOption: order.deliveryOption || DEFAULT_DELIVERY_OPTION,
      ...(persisted?.form || {}),
    },
    lineItems,
    summary: {
      subTotal: Number(order.subTotal ?? summary.subTotal),
      taxRate,
      taxTotal: Number(order.tax ?? summary.taxTotal),
      grandTotal: Number(order.grandTotal ?? summary.grandTotal),
    },
  };
}

export async function bootstrapNewSalesForm(
  _ctx: TRPCContext,
  input: BootstrapNewSalesFormSchema,
) {
  bootstrapNewSalesFormSchema.parse(input);
  const now = new Date().toISOString();
  return {
    salesId: null,
    slug: null,
    orderId: null,
    type: input.type,
    status: "Draft",
    version: `new-${Date.now()}-${generateRandomString(6)}`,
    updatedAt: now,
    customer: null,
    form: {
      customerId: input.customerId || null,
      customerProfileId: null,
      billingAddressId: null,
      shippingAddressId: null,
      paymentTerm: DEFAULT_PAYMENT_TERM,
      goodUntil: null,
      po: null,
      notes: null,
      deliveryOption: DEFAULT_DELIVERY_OPTION,
    },
    lineItems: [],
    summary: {
      subTotal: 0,
      taxRate: 0,
      taxTotal: 0,
      grandTotal: 0,
    },
  };
}

export async function getNewSalesForm(
  ctx: TRPCContext,
  input: GetNewSalesFormSchema,
) {
  getNewSalesFormSchema.parse(input);
  const order = await ctx.db.salesOrders.findFirst({
    where: {
      slug: input.slug,
      type: input.type,
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      orderId: true,
      type: true,
      status: true,
      customerId: true,
      customerProfileId: true,
      billingAddressId: true,
      shippingAddressId: true,
      paymentTerm: true,
      goodUntil: true,
      deliveryOption: true,
      taxPercentage: true,
      subTotal: true,
      tax: true,
      grandTotal: true,
      updatedAt: true,
      meta: true,
      customer: {
        select: {
          id: true,
          name: true,
          businessName: true,
          phoneNo: true,
          email: true,
        },
      },
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          description: true,
          qty: true,
          rate: true,
          total: true,
          meta: true,
          deletedAt: true,
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Sales form not found.",
    });
  }
  return toBootstrapPayload(order);
}

export async function searchNewSalesCustomers(
  ctx: TRPCContext,
  input: SearchNewSalesCustomersSchema,
) {
  const data = searchNewSalesCustomersSchema.parse(input);
  const query = data.query?.trim();
  if (!query) return [];
  return ctx.db.customers.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { businessName: { contains: query } },
        { phoneNo: { contains: query } },
        { email: { contains: query } },
      ],
    },
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
    },
    take: data.limit,
  });
}

export async function recalculateNewSalesForm(
  _ctx: TRPCContext,
  input: RecalculateNewSalesFormSchema,
) {
  const data = recalculateNewSalesFormSchema.parse(input);
  return recalculateSummary(data);
}

async function saveNewSalesFormInternal(
  ctx: TRPCContext,
  payload: SaveDraftNewSalesFormSchema | SaveFinalNewSalesFormSchema,
  status: string,
) {
  const normalizedLines = normalizeLineItems(payload.lineItems);
  const summary = recalculateSummary({
    taxRate: payload.summary.taxRate,
    lineItems: normalizedLines,
  });

  return ctx.db.$transaction(async (tx) => {
    let currentId = payload.salesId || null;
    let order = null as null | {
      id: number;
      slug: string;
      orderId: string;
      meta: unknown;
      updatedAt: Date | null;
      paymentTerm: string | null;
      goodUntil: Date | null;
    };

    if (payload.salesId || payload.slug) {
      order = await tx.salesOrders.findFirst({
        where: {
          id: payload.salesId || undefined,
          slug: payload.slug || undefined,
          type: payload.type,
          deletedAt: null,
        },
        select: {
          id: true,
          slug: true,
          orderId: true,
          meta: true,
          updatedAt: true,
          paymentTerm: true,
          goodUntil: true,
        },
      });
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sales form not found for save.",
        });
      }
      currentId = order.id;
    }

    const currentMeta = safeMeta(order?.meta);
    const currentVersion = currentMeta.newSalesForm?.version;
    if (currentVersion && payload.version && currentVersion !== payload.version) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This form changed elsewhere. Reload the latest version before saving.",
      });
    }

    const nextVersion = `${Date.now()}-${generateRandomString(8)}`;
    const nextMeta: NewSalesFormContainer = {
      ...currentMeta,
      newSalesForm: {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        autosave: payload.autosave,
        lineItems: normalizedLines,
        summary,
        form: payload.meta,
      },
    };

    if (!order) {
      const identity = await generateSalesIdentity(ctx, payload.type);
      const created = await tx.salesOrders.create({
        data: {
          orderId: identity.orderId,
          slug: identity.slug,
          type: payload.type,
          status,
          isDyke: true,
          customerId: payload.meta.customerId || null,
          customerProfileId: payload.meta.customerProfileId || null,
          billingAddressId: payload.meta.billingAddressId || null,
          shippingAddressId: payload.meta.shippingAddressId || null,
          paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
          goodUntil: safeDate(payload.meta.goodUntil),
          deliveryOption: payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
          taxPercentage: summary.taxRate,
          subTotal: summary.subTotal,
          tax: summary.taxTotal,
          grandTotal: summary.grandTotal,
          meta: nextMeta as any,
        },
        select: {
          id: true,
          slug: true,
          orderId: true,
        },
      });
      currentId = created.id;
      order = {
        ...created,
        meta: nextMeta,
        updatedAt: new Date(),
        paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
        goodUntil: safeDate(payload.meta.goodUntil),
      };
    } else {
      await tx.salesOrders.update({
        where: {
          id: order.id,
        },
        data: {
          status,
          customerId: payload.meta.customerId || null,
          customerProfileId: payload.meta.customerProfileId || null,
          billingAddressId: payload.meta.billingAddressId || null,
          shippingAddressId: payload.meta.shippingAddressId || null,
          paymentTerm:
            payload.meta.paymentTerm || order.paymentTerm || DEFAULT_PAYMENT_TERM,
          goodUntil: safeDate(payload.meta.goodUntil) || order.goodUntil,
          deliveryOption: payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
          taxPercentage: summary.taxRate,
          subTotal: summary.subTotal,
          tax: summary.taxTotal,
          grandTotal: summary.grandTotal,
          meta: nextMeta as any,
        },
      });
      await tx.salesOrderItems.updateMany({
        where: {
          salesOrderId: order.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    if (!currentId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to persist sales form.",
      });
    }

    if (normalizedLines.length) {
      await tx.salesOrderItems.createMany({
        data: normalizedLines.map((line) => ({
          salesOrderId: currentId!,
          description: line.title,
          qty: line.qty,
          rate: line.unitPrice,
          total: line.lineTotal,
          meta: {
            uid: line.uid,
            title: line.title,
            description: line.description,
            meta: line.meta || {},
          } as any,
        })),
      });
    }

    return {
      salesId: currentId,
      slug: order.slug,
      orderId: order.orderId,
      type: payload.type,
      version: nextVersion,
      updatedAt: nextMeta.newSalesForm?.updatedAt,
      summary,
      status,
    };
  });
}

export async function saveDraftNewSalesForm(
  ctx: TRPCContext,
  input: SaveDraftNewSalesFormSchema,
) {
  const payload = saveDraftNewSalesFormSchema.parse(input);
  return saveNewSalesFormInternal(ctx, payload, "Draft");
}

export async function saveFinalNewSalesForm(
  ctx: TRPCContext,
  input: SaveFinalNewSalesFormSchema,
) {
  const payload = saveFinalNewSalesFormSchema.parse(input);
  return saveNewSalesFormInternal(ctx, payload, "Active");
}

export async function deleteNewSalesFormLineItem(
  ctx: TRPCContext,
  input: DeleteNewSalesFormLineItemSchema,
) {
  const payload = deleteNewSalesFormLineItemSchema.parse(input);
  const line = await ctx.db.salesOrderItems.findFirst({
    where: {
      id: payload.lineItemId,
      salesOrderId: payload.salesId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (!line) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Line item not found.",
    });
  }
  await ctx.db.salesOrderItems.update({
    where: {
      id: line.id,
    },
    data: {
      deletedAt: new Date(),
    },
  });
  return {
    ok: true,
    lineItemId: payload.lineItemId,
  };
}
