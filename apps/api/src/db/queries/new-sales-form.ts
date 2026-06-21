import type { TRPCContext } from "@api/trpc/init";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import { salesWorkflowCache } from "@gnd/cache/sales-workflow-cache";
import {
  bootstrapNewSalesFormSchema,
  deleteNewSalesFormShelfProductSchema,
  deleteNewSalesFormLineItemSchema,
  getNewSalesFormSchema,
  getNewSalesFormStepRoutingSchema,
  getNewSalesFormShelfCategoriesSchema,
  getNewSalesFormShelfProductDetailsSchema,
  getNewSalesFormShelfProductIndexSchema,
  getNewSalesFormShelfProductsSchema,
  recalculateNewSalesFormSchema,
  saveDraftNewSalesFormSchema,
  saveFinalNewSalesFormSchema,
  searchNewSalesCustomersSchema,
  searchNewSalesFormShelfProductsSchema,
  updateNewSalesFormShelfProductSchema,
  resolveNewSalesCustomerSchema,
  type BootstrapNewSalesFormSchema,
  type DeleteNewSalesFormShelfProductSchema,
  type DeleteNewSalesFormLineItemSchema,
  type GetNewSalesFormSchema,
  type GetNewSalesFormStepRoutingSchema,
  type GetNewSalesFormShelfCategoriesSchema,
  type GetNewSalesFormShelfProductDetailsSchema,
  type GetNewSalesFormShelfProductIndexSchema,
  type GetNewSalesFormShelfProductsSchema,
  type NewSalesFormLineItem,
  type NewSalesFormExtraCost,
  type NewSalesFormMeta,
  type NewSalesFormSummary,
  type RecalculateNewSalesFormSchema,
  type SaveDraftNewSalesFormSchema,
  type SaveFinalNewSalesFormSchema,
  type SearchNewSalesCustomersSchema,
  type SearchNewSalesFormShelfProductsSchema,
  type UpdateNewSalesFormShelfProductSchema,
  type ResolveNewSalesCustomerSchema,
} from "@api/schemas/new-sales-form";
import { getSalesCustomer } from "@api/db/queries/customer";
import { salesAddressLines } from "@api/utils/sales";
import { TRPCError } from "@trpc/server";
import { projectLegacyOrderPayments } from "@gnd/sales";
import { generateRandomString } from "@gnd/utils";
import {
  calculateLegacyPaymentDueDate,
  calculateSalesFormSummary,
  collapseLegacyGroupedLines,
  expandGroupedLineForLegacySave,
  hydrateHptDoorRowFromLegacy,
  normalizeHptLineForLegacy,
  projectSalesFormMetaToLegacyMeta,
  readLegacySalesFormMeta,
} from "@gnd/sales/sales-form";
import { generateSalesSlug } from "@gnd/sales/utils";
import { queueSalesInventoryLineItemsSync } from "@gnd/sales/sales-inventory-sync-job";

const DEFAULT_DELIVERY_OPTION = "pickup";
const DEFAULT_PAYMENT_TERM = "None";

type NewSalesFormPersistedMeta = {
  version: string;
  updatedAt: string;
  autosave: boolean;
  lineItems: NewSalesFormLineItem[];
  extraCosts: NewSalesFormExtraCost[];
  summary: NewSalesFormSummary;
  form: NewSalesFormMeta;
};

type NewSalesFormContainer = {
  newSalesForm?: NewSalesFormPersistedMeta;
  [key: string]: unknown;
};

type NewSalesFormSettings = {
  cccPercentage: number;
  taxCode: string | null;
  customerProfileId: number | null;
};

type DealerProfileCardProfile = {
  id: number | null;
  title: string | null;
  salesPercentage: number | null;
  coefficient: number | null;
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

function resolveOrderCreatedAt(value?: string | null, fallback?: Date | null) {
  return safeDate(value) || fallback || new Date();
}

function resolveOrderPaymentDueDate(
  type: "order" | "quote",
  meta: NewSalesFormMeta,
  createdAt: Date,
) {
  if (type !== "order") return null;
  if (meta.paymentTerm === "None") return safeDate(meta.paymentDueDate);
  return safeDate(calculateLegacyPaymentDueDate(meta.paymentTerm, createdAt));
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function finiteOptionalNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveDealerProfileCard(order: {
  dealerAuth?: {
    id?: number | null;
    email?: string | null;
    name?: string | null;
    companyName?: string | null;
    dealer?: {
      name?: string | null;
      businessName?: string | null;
    } | null;
  } | null;
  dealerSale?: {
    dealerCustomerProfile?: Partial<DealerProfileCardProfile> | null;
  } | null;
  dealerSalesProfile?: Partial<DealerProfileCardProfile> | null;
}) {
  const dealer = order.dealerAuth;
  if (!dealer?.id) return null;

  const dealerName =
    dealer.companyName ||
    dealer.dealer?.businessName ||
    dealer.name ||
    dealer.dealer?.name ||
    dealer.email ||
    null;

  return {
    dealerId: dealer.id,
    dealerName,
    email: dealer.email || null,
    profile: normalizeDealerProfileCardProfile(
      order.dealerSale?.dealerCustomerProfile || order.dealerSalesProfile,
    ),
  };
}

function normalizeDealerProfileCardProfile(
  profile?: Partial<DealerProfileCardProfile> | null,
) {
  if (!profile?.id) return null;
  return {
    id: profile.id,
    title: profile.title || null,
    salesPercentage:
      profile.salesPercentage == null ? null : Number(profile.salesPercentage),
    coefficient:
      profile.coefficient == null ? null : Number(profile.coefficient),
  };
}

function resolvePersistedPaymentMethod(
  container: NewSalesFormContainer,
  persisted?: NewSalesFormPersistedMeta,
) {
  const newFormPaymentMethod = persisted?.form?.paymentMethod;
  if (typeof newFormPaymentMethod === "string" && newFormPaymentMethod) {
    return newFormPaymentMethod;
  }
  const legacyPaymentMethod = container.payment_option;
  return typeof legacyPaymentMethod === "string" && legacyPaymentMethod
    ? legacyPaymentMethod
    : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function uniquePositiveNumbers(values: Array<unknown>) {
  return values
    .map((value) => Number(value || 0))
    .filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}

function legacyShelfCategoryIds(shelf: any) {
  const meta = safeRecord(shelf?.meta);
  if (Array.isArray(meta.categoryIds)) {
    return uniquePositiveNumbers(meta.categoryIds);
  }
  const categoryUid = String(meta.categoryUid || "").trim();
  if (categoryUid) {
    return uniquePositiveNumbers(categoryUid.split("-"));
  }
  return uniquePositiveNumbers([meta.shelfParentCategoryId, shelf?.categoryId]);
}

function legacyShelfMeta(shelf: any, index: number) {
  const meta = safeRecord(shelf?.meta);
  const categoryIds = legacyShelfCategoryIds(shelf);
  const lineUid =
    String(meta.lineUid || meta.sectionUid || "").trim() ||
    `shelf-line-${index + 1}`;
  const productUid =
    String(meta.productUid || meta.productRowUid || shelf?.uid || "").trim() ||
    `shelf-product-${index + 1}`;
  return {
    ...meta,
    categoryIds,
    categoryUid: categoryIds.join("-"),
    lineUid,
    productUid,
    itemIndex: Number(meta.itemIndex ?? index),
    basePrice: Number(meta.basePrice ?? shelf?.basePrice ?? 0),
    salesPrice: Number(
      meta.salesPrice ?? shelf?.salesPrice ?? shelf?.unitPrice ?? 0,
    ),
    customPrice: meta.customPrice ?? shelf?.customPrice ?? null,
  };
}

function normalizeSalesFormTitle(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getLineItemTypeTitle(line: {
  formSteps?: Array<{
    step?: { title?: string | null } | null;
    value?: string | null;
  }> | null;
}) {
  const itemTypeStep = (line.formSteps || []).find(
    (step) => normalizeSalesFormTitle(step?.step?.title) === "item type",
  );
  return String(itemTypeStep?.value || "").trim();
}

function getLineMetaRows(
  line: {
    meta?: unknown;
  },
  key: "mouldingRows" | "serviceRows",
) {
  const meta = safeRecord(line.meta);
  const rows = meta[key];
  return Array.isArray(rows) ? rows : [];
}

function isGroupedLine(line: {
  formSteps?: Array<{
    step?: { title?: string | null } | null;
    value?: string | null;
  }> | null;
  meta?: unknown;
}) {
  const itemType = normalizeSalesFormTitle(getLineItemTypeTitle(line));
  if (
    itemType === "moulding" ||
    itemType === "mouldings" ||
    itemType === "molding" ||
    itemType === "moldings" ||
    itemType === "service" ||
    itemType === "services"
  ) {
    return true;
  }
  return (
    getLineMetaRows(line, "mouldingRows").length > 0 ||
    getLineMetaRows(line, "serviceRows").length > 0
  );
}

function mergePersistedFormSteps(
  persistedSteps: Array<Record<string, unknown>> | undefined,
  dbSteps: Array<Record<string, unknown>> | undefined,
) {
  const persisted = Array.isArray(persistedSteps) ? persistedSteps : [];
  const database = Array.isArray(dbSteps) ? dbSteps : [];
  if (!persisted.length) return database;
  return persisted.map((step, index) => {
    const dbMatch =
      database.find(
        (dbStep) =>
          Number(dbStep.id || 0) > 0 &&
          Number(dbStep.id || 0) === Number(step.id || 0),
      ) ||
      database.find(
        (dbStep) =>
          Number(dbStep.stepId || 0) > 0 &&
          Number(dbStep.stepId || 0) === Number(step.stepId || 0),
      ) ||
      database.find(
        (dbStep) =>
          String(dbStep.prodUid || "").trim() &&
          String(dbStep.prodUid || "").trim() ===
            String(step.prodUid || "").trim(),
      ) ||
      database[index];
    return {
      ...(dbMatch || {}),
      ...step,
      meta: {
        ...(safeRecord(dbMatch?.meta) || {}),
        ...(safeRecord(step.meta) || {}),
      },
      step:
        safeRecord(step.step).id ||
        safeRecord(step.step).title ||
        safeRecord(step.step).uid
          ? {
              ...(safeRecord(dbMatch?.step) || {}),
              ...(safeRecord(step.step) || {}),
            }
          : safeRecord(dbMatch?.step),
    };
  });
}

function rowText(row: Record<string, unknown>, key: "moulding" | "service") {
  if (key === "service")
    return String(row.service || row.description || "").trim();
  return String(row.title || row.description || "").trim();
}

function mergeGroupedRowsByIdentity(
  persistedRows: unknown,
  dbRows: unknown,
  key: "moulding" | "service",
) {
  const persisted = Array.isArray(persistedRows) ? persistedRows : [];
  const database = Array.isArray(dbRows) ? dbRows : [];
  if (!persisted.length) return database;
  if (!database.length) return persisted;
  return persisted.map((row: Record<string, unknown>, index) => {
    const uid = String(row?.uid || "").trim();
    const text = rowText(row, key).toLowerCase();
    const dbMatch =
      database.find(
        (dbRow: Record<string, unknown>) =>
          uid && String(dbRow?.uid || "").trim() === uid,
      ) ||
      database.find(
        (dbRow: Record<string, unknown>) =>
          text && rowText(dbRow, key).toLowerCase() === text,
      ) ||
      database[index];
    return {
      ...(dbMatch || {}),
      ...row,
      salesItemId:
        (row as any)?.salesItemId ?? (dbMatch as any)?.salesItemId ?? null,
      hptId: (row as any)?.hptId ?? (dbMatch as any)?.hptId ?? null,
      groupUid: (row as any)?.groupUid ?? (dbMatch as any)?.groupUid ?? null,
      primaryGroupItem:
        (row as any)?.primaryGroupItem ??
        (dbMatch as any)?.primaryGroupItem ??
        index === 0,
    };
  });
}

function mergePersistedDoorRows(persistedRows: unknown, dbRows: unknown) {
  const persisted = Array.isArray(persistedRows) ? persistedRows : [];
  const database = Array.isArray(dbRows) ? dbRows : [];
  return database.map((dbRow: Record<string, unknown>, index) => {
    const dbId = Number(dbRow?.id || 0);
    const dbDimension = String(dbRow?.dimension || "")
      .trim()
      .toLowerCase();
    const dbStepProductId = Number(dbRow?.stepProductId || 0);
    const persistedMatch =
      persisted.find(
        (row: Record<string, unknown>) =>
          dbId > 0 && Number(row?.id || 0) === dbId,
      ) ||
      persisted.find((row: Record<string, unknown>) => {
        const dimension = String(row?.dimension || "")
          .trim()
          .toLowerCase();
        return (
          dbDimension &&
          dimension === dbDimension &&
          (!dbStepProductId ||
            Number(row?.stepProductId || 0) === dbStepProductId)
        );
      }) ||
      persisted[index];
    return hydrateHptDoorRowFromLegacy({
      ...(persistedMatch || {}),
      ...dbRow,
      meta: {
        ...safeRecord((persistedMatch as any)?.meta),
        ...safeRecord(dbRow?.meta),
      },
    });
  });
}

function mergeGroupedLineMeta(
  persistedMeta: Record<string, unknown>,
  dbMeta: Record<string, unknown>,
) {
  const merged = {
    ...dbMeta,
    ...persistedMeta,
  };
  if (
    Array.isArray(dbMeta.mouldingRows) ||
    Array.isArray(persistedMeta.mouldingRows)
  ) {
    merged.mouldingRows = mergeGroupedRowsByIdentity(
      persistedMeta.mouldingRows,
      dbMeta.mouldingRows,
      "moulding",
    );
  }
  if (
    Array.isArray(dbMeta.serviceRows) ||
    Array.isArray(persistedMeta.serviceRows)
  ) {
    merged.serviceRows = mergeGroupedRowsByIdentity(
      persistedMeta.serviceRows,
      dbMeta.serviceRows,
      "service",
    );
  }
  return merged;
}

function deriveNewSalesFormSettings(
  settingMeta?: unknown,
): NewSalesFormSettings {
  const settingsMeta = safeRecord(settingMeta);
  const nestedSettingsMeta = safeRecord(settingsMeta.data);
  return {
    cccPercentage:
      Number(settingsMeta.ccc ?? nestedSettingsMeta.ccc ?? 3.5) || 3.5,
    taxCode:
      (settingsMeta.taxCode as string | null | undefined) ??
      (nestedSettingsMeta.taxCode as string | null | undefined) ??
      null,
    customerProfileId:
      Number(
        settingsMeta.customerProfileId ??
          nestedSettingsMeta.customerProfileId ??
          0,
      ) || null,
  };
}

function recalculateSummary(
  input: RecalculateNewSalesFormSchema & { cccPercentage?: number | null },
) {
  const summary = calculateSalesFormSummary({
    strategy: "legacy",
    taxRate: input.taxRate,
    paymentMethod: input.paymentMethod,
    cccPercentage: input.cccPercentage,
    lineItems: input.lineItems,
    extraCosts: input.extraCosts,
  });
  return {
    subTotal: summary.subTotal,
    adjustedSubTotal: summary.adjustedSubTotal,
    taxRate: summary.taxRate,
    taxTotal: summary.taxTotal,
    grandTotal: summary.grandTotal,
    discount: summary.discount,
    discountPct: summary.discountPct,
    percentDiscountValue: summary.percentDiscountValue,
    labor: summary.labor,
    delivery: summary.delivery,
    otherCosts: summary.otherCosts,
    taxableSubTotal: summary.taxableSubTotal,
    ccc: summary.ccc,
  };
}

function normalizeLineItems(lines: NewSalesFormLineItem[]) {
  return lines.map((line, index) => {
    const normalizedHptLine = normalizeHptLineForLegacy(line as any) as any;
    const qty = Number(normalizedHptLine.qty || 0);
    const unitPrice = Number(normalizedHptLine.unitPrice || 0);
    const lineTotal = roundCurrency(
      Number.isFinite(normalizedHptLine.lineTotal)
        ? normalizedHptLine.lineTotal
        : qty * unitPrice,
    );
    return {
      ...normalizedHptLine,
      qty,
      unitPrice,
      lineTotal,
      uid:
        normalizedHptLine.uid || `line-${index + 1}-${generateRandomString(6)}`,
      formSteps: normalizedHptLine.formSteps || [],
      shelfItems: normalizedHptLine.shelfItems || [],
      housePackageTool: normalizedHptLine.housePackageTool || null,
    };
  });
}

async function generateSalesIdentity(
  ctx: TRPCContext,
  type: "order" | "quote",
): Promise<{ orderId: string; slug: string }> {
  const salesRep =
    ctx.userId != null
      ? await ctx.db.users.findFirst({
          where: { id: ctx.userId },
          select: { name: true },
        })
      : null;
  const orderId = String(
    await generateSalesSlug(
      type as any,
      ctx.db.salesOrders,
      salesRep?.name || "",
    ),
  );
  return {
    orderId,
    slug: `${type}-${orderId.toLowerCase()}`,
  };
}

function toBootstrapPayload(
  order: {
    id: number;
    slug: string;
    orderId: string;
    inventoryStatus: string | null;
    type: string | null;
    status: string | null;
    customerId: number | null;
    customerProfileId: number | null;
    billingAddressId: number | null;
    shippingAddressId: number | null;
    paymentTerm: string | null;
    createdAt: Date | null;
    paymentDueDate: Date | null;
    goodUntil: Date | null;
    prodDueDate: Date | null;
    deliveryOption: string | null;
    extraCosts: Array<{
      id: number;
      label: string;
      type: string;
      amount: number;
      taxxable: boolean | null;
    }>;
    taxPercentage: number | null;
    subTotal: number | null;
    tax: number | null;
    grandTotal: number | null;
    updatedAt: Date | null;
    items: Array<{
      id: number;
      multiDykeUid: string | null;
      multiDyke: boolean | null;
      dykeProduction: boolean | null;
      dykeDescription: string | null;
      description: string | null;
      qty: number | null;
      rate: number | null;
      total: number | null;
      meta: unknown;
      deletedAt: Date | null;
      formSteps: Array<{
        id: number;
        stepId: number;
        componentId: number | null;
        prodUid: string | null;
        value: string | null;
        qty: number | null;
        price: number | null;
        basePrice: number | null;
        meta: unknown;
        step: {
          id: number;
          uid: string | null;
          title: string | null;
        };
      }>;
      shelfItems: Array<{
        id: number;
        categoryId: number;
        productId: number | null;
        description: string | null;
        qty: number | null;
        unitPrice: number | null;
        totalPrice: number | null;
        meta: unknown;
      }>;
      housePackageTool: {
        id: number;
        deletedAt: Date | null;
        height: string | null;
        doorType: string | null;
        doorId: number | null;
        dykeDoorId: number | null;
        jambSizeId: number | null;
        casingId: number | null;
        moldingId: number | null;
        stepProductId: number | null;
        totalPrice: number | null;
        totalDoors: number | null;
        meta: unknown;
        molding: {
          id: number;
          deletedAt: Date | null;
          title: string | null;
          value: string;
          price: number | null;
        } | null;
        doors: Array<{
          id: number;
          dimension: string;
          swing: string | null;
          doorType: string | null;
          doorPrice: number | null;
          jambSizePrice: number | null;
          casingPrice: number | null;
          unitPrice: number | null;
          lhQty: number | null;
          rhQty: number | null;
          totalQty: number;
          lineTotal: number | null;
          stepProductId: number | null;
          meta: unknown;
        }>;
      } | null;
    }>;
    customer: {
      id: number;
      name: string | null;
      businessName: string | null;
      phoneNo: string | null;
      email: string | null;
    } | null;
    dealerAuth?: {
      id: number;
      email: string | null;
      name: string | null;
      companyName: string | null;
      dealer: {
        name: string | null;
        businessName: string | null;
      } | null;
    } | null;
    dealerSale?: {
      dealerCustomerProfile: {
        id: number;
        title: string | null;
        salesPercentage: number | null;
        coefficient: number | null;
      } | null;
    } | null;
    dealerSalesProfile?: {
      id: number;
      title: string | null;
      salesPercentage: number | null;
      coefficient: number | null;
    } | null;
    meta: unknown;
    payments?: { amount: number | null; status?: string | null }[];
  },
  settings: NewSalesFormSettings,
) {
  const container = safeMeta(order.meta);
  const persisted = container.newSalesForm;
  const persistedLines = persisted?.lineItems || [];
  const persistedExtraCosts = persisted?.extraCosts || [];
  const rawDbLines = order.items
    .filter((item) => !item.deletedAt)
    .map((item, index) => {
      const itemMeta = safeRecord(item.meta);
      const lineMeta = safeRecord(itemMeta.meta);
      const housePackageTool =
        item.housePackageTool && !item.housePackageTool.deletedAt
          ? {
              id: item.housePackageTool.id,
              height: item.housePackageTool.height,
              doorType: item.housePackageTool.doorType,
              doorId: item.housePackageTool.doorId,
              dykeDoorId: item.housePackageTool.dykeDoorId,
              jambSizeId: item.housePackageTool.jambSizeId,
              casingId: item.housePackageTool.casingId,
              moldingId: item.housePackageTool.moldingId,
              stepProductId: item.housePackageTool.stepProductId,
              totalPrice: Number(item.housePackageTool.totalPrice || 0),
              totalDoors: Number(item.housePackageTool.totalDoors || 0),
              meta: safeRecord(item.housePackageTool.meta),
              molding:
                item.housePackageTool.molding &&
                !item.housePackageTool.molding.deletedAt
                  ? {
                      id: item.housePackageTool.molding.id,
                      title: item.housePackageTool.molding.title,
                      value: item.housePackageTool.molding.value,
                      price: Number(item.housePackageTool.molding.price || 0),
                    }
                  : null,
              doors: (item.housePackageTool.doors || []).map((door) => ({
                id: door.id,
                dimension: door.dimension,
                swing: door.swing,
                doorType: door.doorType,
                doorPrice: Number(door.doorPrice || 0),
                jambSizePrice: Number(door.jambSizePrice || 0),
                casingPrice: Number(door.casingPrice || 0),
                unitPrice: Number(door.unitPrice || 0),
                lhQty: Number(door.lhQty || 0),
                rhQty: Number(door.rhQty || 0),
                totalQty: Number(door.totalQty || 0),
                lineTotal: Number(door.lineTotal || 0),
                stepProductId: door.stepProductId,
                meta: safeRecord(door.meta),
              })),
            }
          : null;
      const rawLine = {
        id: item.id,
        multiDykeUid: item.multiDykeUid || null,
        multiDyke: item.multiDyke ?? null,
        dykeProduction: item.dykeProduction ?? false,
        sourceMeta: itemMeta,
        uid:
          (typeof itemMeta.uid === "string" && itemMeta.uid) ||
          `line-${index + 1}-${generateRandomString(6)}`,
        title:
          item.dykeDescription ||
          (typeof itemMeta.title === "string" ? itemMeta.title : "") ||
          item.description ||
          "",
        description: item.description,
        qty: Number(item.qty || 0),
        unitPrice: Number(item.rate || 0),
        lineTotal: Number(item.total || 0),
        meta: lineMeta,
        formSteps: item.formSteps.map((step) => ({
          id: step.id,
          stepId: step.stepId,
          componentId: step.componentId,
          prodUid: step.prodUid,
          value: step.value,
          qty: Number(step.qty || 0),
          price: Number(step.price || 0),
          basePrice: Number(step.basePrice || 0),
          meta: safeRecord(step.meta),
          step: {
            id: step.step.id,
            uid: step.step.uid,
            title: step.step.title,
          },
        })),
        shelfItems: item.shelfItems.map((shelf) => ({
          id: shelf.id,
          categoryId: shelf.categoryId,
          productId: shelf.productId,
          description: shelf.description,
          qty: Number(shelf.qty || 0),
          unitPrice: Number(shelf.unitPrice || 0),
          totalPrice: Number(shelf.totalPrice || 0),
          meta: safeRecord(shelf.meta),
        })),
        housePackageTool,
      };
      return normalizeHptLineForLegacy(rawLine as any) as typeof rawLine;
    });
  const dbLines = collapseLegacyGroupedLines(rawDbLines).map(
    ({ multiDykeUid, multiDyke, dykeProduction, sourceMeta, ...line }) => line,
  );

  const lineItems = (persistedLines.length ? persistedLines : dbLines).map(
    (line, index) => {
      const dbMatch =
        dbLines.find((dbLine) => dbLine.id && dbLine.id === line.id) ||
        dbLines.find((dbLine) => dbLine.uid === line.uid) ||
        dbLines[index];
      const mergedHousePackageTool =
        line.housePackageTool || dbMatch?.housePackageTool
          ? {
              ...(line.housePackageTool || {}),
              ...(dbMatch?.housePackageTool || {}),
              meta: {
                ...safeRecord(dbMatch?.housePackageTool?.meta),
                ...safeRecord(line.housePackageTool?.meta),
              },
              doors:
                dbMatch?.housePackageTool?.doors &&
                dbMatch.housePackageTool.doors.length
                  ? mergePersistedDoorRows(
                      line.housePackageTool?.doors,
                      dbMatch.housePackageTool.doors,
                    )
                  : line.housePackageTool?.doors || [],
              molding:
                line.housePackageTool?.molding ||
                dbMatch?.housePackageTool?.molding ||
                null,
            }
          : null;
      const persistedTitle =
        typeof line.title === "string" ? line.title.trim() : "";
      const persistedDescription =
        typeof line.description === "string" ? line.description.trim() : "";
      const dbTitle =
        typeof dbMatch?.title === "string" ? dbMatch.title.trim() : "";
      const groupedLine = isGroupedLine({
        formSteps:
          line.formSteps && line.formSteps.length
            ? line.formSteps
            : dbMatch?.formSteps || [],
        meta: {
          ...(dbMatch?.meta || {}),
          ...(line.meta || {}),
        },
      });
      const normalizedItemTypeTitle = getLineItemTypeTitle({
        formSteps:
          line.formSteps && line.formSteps.length
            ? line.formSteps
            : dbMatch?.formSteps || [],
      });
      const mergedMeta = mergeGroupedLineMeta(
        safeRecord(line.meta),
        safeRecord(dbMatch?.meta),
      );
      const mergedLine = {
        ...line,
        title: groupedLine
          ? dbTitle || normalizedItemTypeTitle || persistedTitle
          : dbTitle &&
              (!persistedTitle || persistedTitle === persistedDescription)
            ? dbTitle
            : persistedTitle || dbTitle,
        meta: mergedMeta,
        formSteps: mergePersistedFormSteps(
          line.formSteps as Array<Record<string, unknown>> | undefined,
          dbMatch?.formSteps as Array<Record<string, unknown>> | undefined,
        ),
        shelfItems:
          line.shelfItems && line.shelfItems.length
            ? line.shelfItems
            : dbMatch?.shelfItems || [],
        housePackageTool: mergedHousePackageTool,
      };
      return normalizeHptLineForLegacy(mergedLine as any) as typeof mergedLine;
    },
  );
  const taxRate = Number(
    order.taxPercentage || persisted?.summary?.taxRate || 0,
  );
  const paymentMethod = resolvePersistedPaymentMethod(container, persisted);
  const summary = recalculateSummary({
    taxRate,
    paymentMethod,
    cccPercentage: settings.cccPercentage,
    extraCosts: persistedExtraCosts.length
      ? persistedExtraCosts.map((cost) => ({
          type: cost.type,
          amount: Number(cost.amount || 0),
          taxxable: cost.taxxable ?? false,
        }))
      : order.extraCosts.map((cost) => ({
          type: cost.type as any,
          amount: Number(cost.amount || 0),
          taxxable: cost.taxxable ?? false,
        })),
    lineItems,
  });
  const paymentTotal = (order.payments || []).reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0,
  );
  const paymentMethodReviewDismissed = Boolean(
    container.paymentMethodReviewDismissed,
  );
  const legacyFormMeta = readLegacySalesFormMeta({
    meta: container,
    persistedForm: persisted?.form,
    order: {
      createdAt: order.createdAt,
      paymentDueDate: order.paymentDueDate,
      goodUntil: order.goodUntil,
      prodDueDate: order.prodDueDate,
      paymentTerm: order.paymentTerm,
      deliveryOption: order.deliveryOption,
    },
    defaults: {
      paymentTerm: DEFAULT_PAYMENT_TERM,
      deliveryOption: DEFAULT_DELIVERY_OPTION,
    },
  });

  return {
    salesId: order.id,
    slug: order.slug,
    orderId: order.orderId,
    inventoryStatus: order.inventoryStatus,
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
    dealerProfileCard: resolveDealerProfileCard(order),
    settings,
    paymentTotal,
    paymentCount: order.payments?.length || 0,
    paymentMethodReviewDismissed,
    form: {
      paymentTerm: DEFAULT_PAYMENT_TERM,
      createdAt: null,
      paymentDueDate: null,
      goodUntil: null,
      prodDueDate: null,
      po: "",
      notes: null,
      deliveryOption: DEFAULT_DELIVERY_OPTION,
      taxCode: null,
      ...legacyFormMeta,
      customerId: order.customerId,
      customerProfileId: order.customerProfileId,
      billingAddressId: order.billingAddressId,
      shippingAddressId: order.shippingAddressId,
      paymentMethod,
    },
    lineItems,
    extraCosts: persistedExtraCosts.length
      ? persistedExtraCosts
      : order.extraCosts.map((cost) => ({
          id: cost.id,
          label: cost.label,
          type: cost.type as any,
          amount: Number(cost.amount || 0),
          taxxable: cost.taxxable,
        })),
    summary: {
      subTotal: Number(order.subTotal ?? summary.subTotal),
      adjustedSubTotal: Number(summary.adjustedSubTotal ?? summary.subTotal),
      taxRate,
      taxTotal: Number(order.tax ?? summary.taxTotal),
      grandTotal: Number(order.grandTotal ?? summary.grandTotal),
      discount: Number(summary.discount || 0),
      discountPct: Number(summary.discountPct || 0),
      percentDiscountValue: Number(summary.percentDiscountValue || 0),
      labor: Number(summary.labor || 0),
      delivery: Number(summary.delivery || 0),
      otherCosts: Number(summary.otherCosts || 0),
      ccc: Number(summary.ccc || 0),
    },
  };
}

export async function bootstrapNewSalesForm(
  ctx: TRPCContext,
  input: BootstrapNewSalesFormSchema,
) {
  bootstrapNewSalesFormSchema.parse(input);
  const [setting, selectedCustomer] = await Promise.all([
    ctx.db.settings.findFirst({
      where: {
        type: "sales-settings",
      },
      select: {
        meta: true,
      },
    }),
    input.customerId
      ? ctx.db.customers.findFirst({
          where: {
            id: input.customerId,
          },
          select: {
            id: true,
            name: true,
            businessName: true,
            phoneNo: true,
            email: true,
          },
        })
      : null,
  ]);
  const settings = deriveNewSalesFormSettings(setting?.meta);
  const now = new Date().toISOString();
  return {
    salesId: null,
    slug: null,
    orderId: null,
    inventoryStatus: null,
    type: input.type,
    status: "Draft",
    version: `new-${Date.now()}-${generateRandomString(6)}`,
    updatedAt: now,
    customer: selectedCustomer,
    dealerProfileCard: null,
    settings,
    form: {
      customerId: input.customerId || null,
      customerProfileId: settings.customerProfileId,
      billingAddressId: null,
      shippingAddressId: null,
      paymentTerm: DEFAULT_PAYMENT_TERM,
      paymentMethod: null,
      createdAt: now,
      paymentDueDate: null,
      goodUntil: null,
      prodDueDate: null,
      po: null,
      notes: null,
      deliveryOption: DEFAULT_DELIVERY_OPTION,
      taxCode: settings.taxCode,
    },
    lineItems: [],
    extraCosts: [
      {
        id: null,
        label: "Labor",
        type: "Labor",
        amount: 0,
        taxxable: false,
      },
    ],
    summary: {
      subTotal: 0,
      adjustedSubTotal: 0,
      taxRate: 0,
      taxTotal: 0,
      grandTotal: 0,
      discount: 0,
      discountPct: 0,
      percentDiscountValue: 0,
      labor: 0,
      delivery: 0,
      otherCosts: 0,
      ccc: 0,
    },
  };
}

export async function getNewSalesForm(
  ctx: TRPCContext,
  input: GetNewSalesFormSchema,
) {
  getNewSalesFormSchema.parse(input);
  const [order, setting] = await Promise.all([
    ctx.db.salesOrders.findFirst({
      where: {
        slug: input.slug,
        type: input.type,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        orderId: true,
        inventoryStatus: true,
        type: true,
        status: true,
        customerId: true,
        customerProfileId: true,
        billingAddressId: true,
        shippingAddressId: true,
        paymentTerm: true,
        createdAt: true,
        paymentDueDate: true,
        goodUntil: true,
        prodDueDate: true,
        deliveryOption: true,
        extraCosts: {
          select: {
            id: true,
            label: true,
            type: true,
            amount: true,
            taxxable: true,
          },
        },
        taxPercentage: true,
        subTotal: true,
        tax: true,
        grandTotal: true,
        updatedAt: true,
        meta: true,
        payments: {
          where: {
            deletedAt: null,
          },
          select: {
            amount: true,
            status: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            businessName: true,
            phoneNo: true,
            email: true,
          },
        },
        dealerAuth: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            dealer: {
              select: {
                name: true,
                businessName: true,
              },
            },
          },
        },
        dealerSale: {
          select: {
            dealerCustomerProfile: {
              select: {
                id: true,
                title: true,
                salesPercentage: true,
                coefficient: true,
              },
            },
          },
        },
        dealerSalesProfile: {
          select: {
            id: true,
            title: true,
            salesPercentage: true,
            coefficient: true,
          },
        },
        items: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            multiDykeUid: true,
            multiDyke: true,
            dykeProduction: true,
            dykeDescription: true,
            description: true,
            qty: true,
            rate: true,
            total: true,
            meta: true,
            deletedAt: true,
            formSteps: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                stepId: true,
                componentId: true,
                prodUid: true,
                value: true,
                qty: true,
                price: true,
                basePrice: true,
                meta: true,
                step: {
                  select: {
                    id: true,
                    uid: true,
                    title: true,
                  },
                },
              },
            },
            shelfItems: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                categoryId: true,
                productId: true,
                description: true,
                qty: true,
                unitPrice: true,
                totalPrice: true,
                meta: true,
              },
            },
            housePackageTool: {
              select: {
                id: true,
                deletedAt: true,
                height: true,
                doorType: true,
                doorId: true,
                dykeDoorId: true,
                jambSizeId: true,
                casingId: true,
                moldingId: true,
                stepProductId: true,
                totalPrice: true,
                totalDoors: true,
                meta: true,
                molding: {
                  select: {
                    id: true,
                    deletedAt: true,
                    title: true,
                    value: true,
                    price: true,
                  },
                },
                doors: {
                  where: {
                    deletedAt: null,
                  },
                  select: {
                    id: true,
                    dimension: true,
                    swing: true,
                    doorType: true,
                    doorPrice: true,
                    jambSizePrice: true,
                    casingPrice: true,
                    unitPrice: true,
                    lhQty: true,
                    rhQty: true,
                    totalQty: true,
                    lineTotal: true,
                    stepProductId: true,
                    meta: true,
                  },
                },
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    }),
    ctx.db.settings.findFirst({
      where: {
        type: "sales-settings",
      },
      select: {
        meta: true,
      },
    }),
  ]);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Sales form not found.",
    });
  }
  return toBootstrapPayload(order, deriveNewSalesFormSettings(setting?.meta));
}

export async function getNewSalesFormStepRouting(
  ctx: TRPCContext,
  input: GetNewSalesFormStepRoutingSchema,
) {
  getNewSalesFormStepRoutingSchema.parse(input);
  return salesWorkflowCache.getOrSetStepRouting(() =>
    fetchNewSalesFormStepRoutingFromDb(ctx),
  );
}

async function fetchNewSalesFormStepRoutingFromDb(ctx: TRPCContext) {
  const [setting, steps] = await Promise.all([
    ctx.db.settings.findFirst({
      where: {
        type: "sales-settings",
      },
      select: {
        id: true,
        meta: true,
      },
    }),
    ctx.db.dykeSteps.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        meta: true,
        stepProducts: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            uid: true,
            name: true,
            img: true,
            redirectUid: true,
            product: {
              select: {
                title: true,
                img: true,
              },
            },
            door: {
              select: {
                title: true,
                img: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const settingsMeta = safeRecord(setting?.meta);
  const nestedRouteData = safeRecord(settingsMeta.data);
  const rawRoute = safeRecord(
    Object.keys(safeRecord(settingsMeta.route)).length
      ? settingsMeta.route
      : nestedRouteData.route,
  );
  const composedRouter: Record<
    string,
    {
      config?: unknown;
      routeSequence: Array<{ uid: string }>;
      route: Record<string, string>;
    }
  > = {};

  for (const [rootUid, routeDef] of Object.entries(rawRoute)) {
    const routeObj = safeRecord(routeDef);
    const routeSequence = Array.isArray(routeObj.routeSequence)
      ? routeObj.routeSequence
          .map((entry) => safeRecord(entry))
          .map((entry) => ({ uid: String(entry.uid || "") }))
          .filter((entry) => !!entry.uid)
      : [];
    const route: Record<string, string> = {};
    let current = rootUid;
    for (const next of routeSequence) {
      route[current] = next.uid;
      current = next.uid;
    }
    composedRouter[rootUid] = {
      config: routeObj.config,
      routeSequence,
      route,
    };
  }

  const stepsByUid: Record<
    string,
    {
      id: number;
      uid: string;
      title: string | null;
      meta: Record<string, unknown>;
      components: Array<{
        id: number;
        uid: string;
        title: string | null;
        redirectUid: string | null;
        img: string | null;
      }>;
    }
  > = {};
  const stepsById: Record<number, string> = {};

  for (const step of steps) {
    if (!step.uid) continue;
    stepsById[step.id] = step.uid;
    stepsByUid[step.uid] = {
      id: step.id,
      uid: step.uid,
      title: step.title,
      meta: safeRecord(step.meta),
      components: (step.stepProducts || [])
        .filter((component) => !!component.uid)
        .map((component) => ({
          id: component.id,
          uid: component.uid!,
          title:
            component.name ||
            component.product?.title ||
            component.door?.title ||
            null,
          redirectUid: component.redirectUid || null,
          img:
            component.img ||
            component.product?.img ||
            component.door?.img ||
            null,
        })),
    };
  }

  const configuredRootComponentUids = Object.keys(composedRouter);
  const rootStepFromRoute =
    Object.values(stepsByUid)
      .map((step) => ({
        step,
        score: (step.components || []).filter((component) =>
          configuredRootComponentUids.includes(component.uid),
        ).length,
      }))
      .sort((a, b) => b.score - a.score)[0] || null;
  const rootStep =
    (rootStepFromRoute && rootStepFromRoute.score > 0
      ? rootStepFromRoute.step
      : null) ||
    Object.values(stepsByUid).find((step) => step.id === 1) ||
    null;
  return {
    settingId: setting?.id || null,
    settingsMeta,
    composedRouter,
    stepsByUid,
    stepsById,
    rootStepUid: rootStep?.uid || null,
    rootComponents: rootStep?.components || [],
  };
}

export async function searchNewSalesCustomers(
  ctx: TRPCContext,
  input: SearchNewSalesCustomersSchema,
) {
  const data = searchNewSalesCustomersSchema.parse(input);
  const query = data.query?.trim();
  if (!query && !data.recent) return [];

  const mapCustomerResult = (customer: {
    id: number;
    name: string | null;
    businessName: string | null;
    phoneNo: string | null;
    email: string | null;
    profile: {
      id: number;
      title: string | null;
    } | null;
    taxProfiles: Array<{
      tax: {
        title: string | null;
        taxCode: string | null;
      } | null;
    }>;
    addressBooks: Array<{
      id: number;
      name: string | null;
      address1: string | null;
      address2: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      phoneNo: string | null;
      email: string | null;
      meta: unknown;
      isPrimary: boolean | null;
    }>;
  }) => {
    const businessName = String(customer?.businessName || "").trim();
    const [taxProfile] = customer.taxProfiles || [];
    const [addressBook] = customer.addressBooks || [];
    const shippingLines = addressBook
      ? salesAddressLines(addressBook as any, customer as any)
      : [];
    return {
      id: Number(customer?.id || 0),
      customerId: Number(customer?.id || 0),
      name: String(customer?.name || ""),
      businessName,
      phoneNo: String(customer?.phoneNo || ""),
      phone: String(customer?.phoneNo || ""),
      email: String(customer?.email || ""),
      profileId:
        customer?.profile?.id == null ? null : Number(customer.profile.id || 0),
      profileName: String(customer?.profile?.title || ""),
      taxName: String(taxProfile?.tax?.title || ""),
      taxCode: String(taxProfile?.tax?.taxCode || ""),
      billingAddressId:
        addressBook?.id == null ? null : Number(addressBook.id || 0),
      shippingAddressId:
        addressBook?.id == null ? null : Number(addressBook.id || 0),
      shippingAddress: shippingLines.join(", "),
      shippingAddressLines: shippingLines,
      isBusiness: businessName.length > 0,
    };
  };

  if (data.recent && !query) {
    const recentCustomerLimit = Math.max(data.limit * 3, data.limit + 10);
    const recentCustomerGroups = await ctx.db.salesOrders.groupBy({
      by: ["customerId"],
      take: recentCustomerLimit,
      where: {
        deletedAt: null,
        customerId: {
          not: null,
        },
        type: data.type || undefined,
      },
      _max: {
        updatedAt: true,
      },
      orderBy: {
        _max: {
          updatedAt: "desc",
        },
      },
    });
    const customerIds = recentCustomerGroups
      .map((group) => Number(group.customerId || 0))
      .filter((customerId) => customerId > 0);
    if (!customerIds.length) return [];
    const customers = await ctx.db.customers.findMany({
      where: {
        id: {
          in: customerIds,
        },
      },
      select: {
        id: true,
        name: true,
        businessName: true,
        phoneNo: true,
        email: true,
        profile: {
          select: {
            id: true,
            title: true,
          },
        },
        taxProfiles: {
          take: 1,
          select: {
            tax: {
              select: {
                title: true,
                taxCode: true,
              },
            },
          },
        },
        addressBooks: {
          take: 1,
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            country: true,
            phoneNo: true,
            email: true,
            meta: true,
            isPrimary: true,
          },
        },
      },
    });
    const customerById = new Map(
      customers.map((customer) => [Number(customer.id || 0), customer]),
    );
    return customerIds
      .map((customerId) => customerById.get(customerId))
      .filter((customer): customer is NonNullable<typeof customer> =>
        Boolean(customer),
      )
      .slice(0, data.limit)
      .map(mapCustomerResult);
  }

  const customers = await ctx.db.customers.findMany({
    take: data.limit,
    distinct: ["id"],
    where: {
      OR: [
        { name: { contains: query } },
        { businessName: { contains: query } },
        { phoneNo: { contains: query } },
        { email: { contains: query } },
        { address: { contains: query } },
        {
          addressBooks: {
            some: {
              OR: [
                { name: { contains: query } },
                { address1: { contains: query } },
                { address2: { contains: query } },
                { city: { contains: query } },
                { state: { contains: query } },
                { country: { contains: query } },
                { phoneNo: { contains: query } },
                { email: { contains: query } },
              ],
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
      profile: {
        select: {
          id: true,
          title: true,
        },
      },
      taxProfiles: {
        take: 1,
        select: {
          tax: {
            select: {
              title: true,
              taxCode: true,
            },
          },
        },
      },
      addressBooks: {
        take: 1,
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          phoneNo: true,
          email: true,
          meta: true,
          isPrimary: true,
        },
      },
    },
  });
  return customers.map(mapCustomerResult);
}

export async function getNewSalesFormShelfCategories(
  ctx: TRPCContext,
  input: GetNewSalesFormShelfCategoriesSchema,
) {
  getNewSalesFormShelfCategoriesSchema.parse(input);
  return ctx.db.dykeShelfCategories.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      categoryId: true,
      parentCategoryId: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

async function activeShelfCategoryIds(ctx: TRPCContext) {
  const categories = await ctx.db.dykeShelfCategories.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  return categories.map((category) => Number(category.id || 0)).filter(Boolean);
}

async function activeShelfProductWhere(ctx: TRPCContext) {
  const activeCategoryIds = await activeShelfCategoryIds(ctx);
  return {
    deletedAt: null,
    AND: [
      {
        OR: [
          {
            categoryId: null,
          },
          {
            categoryId: {
              in: activeCategoryIds,
            },
          },
        ],
      },
      {
        OR: [
          {
            parentCategoryId: null,
          },
          {
            parentCategoryId: {
              in: activeCategoryIds,
            },
          },
        ],
      },
    ],
  };
}

export async function getNewSalesFormShelfProducts(
  ctx: TRPCContext,
  input: GetNewSalesFormShelfProductsSchema,
) {
  const payload = getNewSalesFormShelfProductsSchema.parse(input);
  if (!payload.categoryIds.length) return [];
  const visibilityWhere = await activeShelfProductWhere(ctx);
  return ctx.db.dykeShelfProducts.findMany({
    where: {
      ...visibilityWhere,
      OR: [
        {
          categoryId: {
            in: payload.categoryIds,
          },
        },
        {
          parentCategoryId: {
            in: payload.categoryIds,
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      img: true,
      unitPrice: true,
      categoryId: true,
      parentCategoryId: true,
    },
    orderBy: [{ title: "asc" }],
  });
}

export async function getNewSalesFormShelfProductIndex(
  ctx: TRPCContext,
  input: GetNewSalesFormShelfProductIndexSchema,
) {
  getNewSalesFormShelfProductIndexSchema.parse(input);
  const visibilityWhere = await activeShelfProductWhere(ctx);
  return ctx.db.dykeShelfProducts.findMany({
    where: visibilityWhere,
    select: {
      id: true,
      title: true,
      unitPrice: true,
    },
    orderBy: [{ title: "asc" }],
  });
}

function shelfCategoryPathForProduct(
  product: {
    categoryId?: number | null;
    parentCategoryId?: number | null;
  },
  categories: Array<{
    id?: number | null;
    name?: string | null;
    categoryId?: number | null;
    parentCategoryId?: number | null;
  }>,
) {
  const byId = new Map(
    categories
      .map((category) => [Number(category?.id || 0), category] as const)
      .filter(([id]) => id > 0),
  );
  const child = byId.get(Number(product.categoryId || 0));
  const parentId =
    Number(product.parentCategoryId || 0) ||
    Number(child?.parentCategoryId || 0) ||
    Number(child?.categoryId || 0) ||
    0;
  return [byId.get(parentId), child]
    .filter(
      (category, index, list) =>
        category &&
        Number(category.id || 0) > 0 &&
        list.findIndex(
          (entry) => Number(entry?.id || 0) === Number(category.id || 0),
        ) === index,
    )
    .map((category) => ({
      id: category?.id,
      name: category?.name,
    }));
}

export async function getNewSalesFormShelfProductDetails(
  ctx: TRPCContext,
  input: GetNewSalesFormShelfProductDetailsSchema,
) {
  const payload = getNewSalesFormShelfProductDetailsSchema.parse(input);
  const ids = payload.ids.filter(
    (id, index, list) => id > 0 && list.indexOf(id) === index,
  );
  if (!ids.length) return [];
  const visibilityWhere = await activeShelfProductWhere(ctx);
  const products = await ctx.db.dykeShelfProducts.findMany({
    where: {
      ...visibilityWhere,
      id: {
        in: ids,
      },
    },
    select: {
      id: true,
      title: true,
      img: true,
      unitPrice: true,
      categoryId: true,
      parentCategoryId: true,
    },
    orderBy: [{ title: "asc" }],
  });
  const categoryIds = Array.from(
    new Set(
      products
        .flatMap((product) => [
          Number(product?.parentCategoryId || 0),
          Number(product?.categoryId || 0),
        ])
        .filter((id) => id > 0),
    ),
  );
  const categories = categoryIds.length
    ? await ctx.db.dykeShelfCategories.findMany({
        where: {
          deletedAt: null,
          id: {
            in: categoryIds,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          categoryId: true,
          parentCategoryId: true,
        },
      })
    : [];
  return products.map((product) => ({
    ...product,
    categoryPath: shelfCategoryPathForProduct(product, categories),
  }));
}

async function getRecentShelfProducts(
  ctx: TRPCContext,
  visibilityWhere: any,
  productSelect: any,
  limit: number,
) {
  if (limit <= 0) return [];

  const products: any[] = [];
  const seenProductIds = new Set<number>();
  const batchSize = Math.max(limit * 4, 25);
  let skip = 0;

  while (products.length < limit) {
    const recentRows = await ctx.db.dykeSalesShelfItem.findMany({
      where: {
        deletedAt: null,
        productId: {
          not: null,
        },
      },
      select: {
        productId: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: batchSize,
      skip,
    });

    if (!recentRows.length) break;

    const candidateIds = recentRows
      .map((row) => Number(row?.productId || 0))
      .filter((id) => {
        if (id <= 0 || seenProductIds.has(id)) return false;
        seenProductIds.add(id);
        return true;
      });

    const visibleProducts = candidateIds.length
      ? await ctx.db.dykeShelfProducts.findMany({
          where: {
            ...visibilityWhere,
            id: {
              in: candidateIds,
            },
          },
          select: productSelect,
        })
      : [];
    const visibleProductById = new Map(
      visibleProducts.map(
        (product) => [Number(product?.id || 0), product] as const,
      ),
    );

    for (const id of candidateIds) {
      const product = visibleProductById.get(id);
      if (product) products.push(product);
      if (products.length >= limit) break;
    }

    if (recentRows.length < batchSize) break;
    skip += recentRows.length;
  }

  if (products.length < limit) {
    const fallbackRows = await ctx.db.dykeShelfProducts.findMany({
      where: {
        ...visibilityWhere,
        id: {
          notIn: Array.from(seenProductIds),
        },
      },
      select: productSelect,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit - products.length,
    });
    products.push(...fallbackRows);
  }

  return products.slice(0, limit);
}

export async function updateNewSalesFormShelfProduct(
  ctx: TRPCContext,
  input: UpdateNewSalesFormShelfProductSchema,
) {
  const payload = updateNewSalesFormShelfProductSchema.parse(input);
  return ctx.db.dykeShelfProducts.update({
    where: {
      id: payload.id,
    },
    data: {
      title: payload.title,
      unitPrice:
        payload.unitPrice == null ? null : Number(payload.unitPrice || 0),
    },
    select: {
      id: true,
      title: true,
      img: true,
      unitPrice: true,
      categoryId: true,
      parentCategoryId: true,
    },
  });
}

export async function deleteNewSalesFormShelfProduct(
  ctx: TRPCContext,
  input: DeleteNewSalesFormShelfProductSchema,
) {
  const payload = deleteNewSalesFormShelfProductSchema.parse(input);
  return ctx.db.dykeShelfProducts.update({
    where: {
      id: payload.id,
    },
    data: {
      deletedAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}

export async function searchNewSalesFormShelfProducts(
  ctx: TRPCContext,
  input: SearchNewSalesFormShelfProductsSchema,
) {
  const payload = searchNewSalesFormShelfProductsSchema.parse(input);
  const query = payload.query.trim();
  const limit = query ? payload.limit : Math.min(payload.limit, 15);
  const visibilityWhere = await activeShelfProductWhere(ctx);
  const productSelect = {
    id: true,
    title: true,
    img: true,
    unitPrice: true,
    categoryId: true,
    parentCategoryId: true,
  } as const;
  const rows = query
    ? await ctx.db.dykeShelfProducts.findMany({
        where: {
          ...visibilityWhere,
          title: {
            contains: query,
          },
        },
        select: productSelect,
        orderBy: [{ title: "asc" }],
        take: limit,
      })
    : await getRecentShelfProducts(ctx, visibilityWhere, productSelect, limit);
  const rowIds = new Set(rows.map((row) => Number(row?.id || 0)));
  const selectedIds = payload.selectedIds.filter(
    (id, index, list) =>
      id > 0 && list.indexOf(id) === index && !rowIds.has(id),
  );
  const selectedRows = selectedIds.length
    ? await ctx.db.dykeShelfProducts.findMany({
        where: {
          ...visibilityWhere,
          id: {
            in: selectedIds,
          },
        },
        select: productSelect,
        orderBy: [{ title: "asc" }],
      })
    : [];
  const products = [...rows, ...selectedRows].filter(
    (product, index, list) =>
      Number(product?.id || 0) > 0 &&
      list.findIndex(
        (entry) => Number(entry?.id || 0) === Number(product?.id || 0),
      ) === index,
  );
  const categoryIds = Array.from(
    new Set(
      products
        .flatMap((product) => [
          Number(product?.parentCategoryId || 0),
          Number(product?.categoryId || 0),
        ])
        .filter((id) => id > 0),
    ),
  );
  const categories = categoryIds.length
    ? await ctx.db.dykeShelfCategories.findMany({
        where: {
          deletedAt: null,
          id: {
            in: categoryIds,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          categoryId: true,
          parentCategoryId: true,
        },
      })
    : [];
  return products.map((product) => ({
    ...product,
    categoryPath: shelfCategoryPathForProduct(product, categories),
  }));
}

export async function recalculateNewSalesForm(
  ctx: TRPCContext,
  input: RecalculateNewSalesFormSchema,
) {
  const data = recalculateNewSalesFormSchema.parse(input);
  const setting = await ctx.db.settings.findFirst({
    where: {
      type: "sales-settings",
    },
    select: {
      meta: true,
    },
  });
  return recalculateSummary({
    ...data,
    cccPercentage: deriveNewSalesFormSettings(setting?.meta).cccPercentage,
  });
}

export async function resolveNewSalesCustomer(
  ctx: TRPCContext,
  input: ResolveNewSalesCustomerSchema,
) {
  const payload = resolveNewSalesCustomerSchema.parse(input);
  return getSalesCustomer(ctx, {
    customerId: payload.customerId,
    billingId: payload.billingId,
    shippingId: payload.shippingId,
  });
}

async function saveNewSalesFormInternal(
  ctx: TRPCContext,
  payload: SaveDraftNewSalesFormSchema | SaveFinalNewSalesFormSchema,
  status: string,
) {
  const normalizedLines = normalizeLineItems(payload.lineItems);
  const legacySaveLines = normalizedLines.flatMap((line) =>
    expandGroupedLineForLegacySave(line),
  );
  const setting = await ctx.db.settings.findFirst({
    where: {
      type: "sales-settings",
    },
    select: {
      meta: true,
    },
  });
  const settings = deriveNewSalesFormSettings(setting?.meta);
  const summary = recalculateSummary({
    taxRate: payload.summary.taxRate,
    extraCosts: payload.extraCosts.map((cost) => ({
      type: cost.type,
      amount: Number(cost.amount || 0),
      taxxable: cost.taxxable ?? false,
    })),
    lineItems: normalizedLines,
    paymentMethod: payload.meta.paymentMethod || null,
    cccPercentage: settings.cccPercentage,
  });

  return ctx.db.$transaction(async (tx) => {
    const isNew = !(payload.salesId || payload.slug);
    let currentId = payload.salesId || null;
    const persistedLineItemIds = new Map<string, number>();
    const persistedExtraCosts: NewSalesFormExtraCost[] = [];
    let order = null as null | {
      id: number;
      slug: string;
      orderId: string;
      meta: unknown;
      inventoryStatus: string | null;
      updatedAt: Date | null;
      createdAt: Date | null;
      paymentTerm: string | null;
      paymentDueDate: Date | null;
      goodUntil: Date | null;
      prodDueDate: Date | null;
      payments: { amount: number | null; status: string | null }[];
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
          inventoryStatus: true,
          updatedAt: true,
          createdAt: true,
          paymentTerm: true,
          paymentDueDate: true,
          goodUntil: true,
          prodDueDate: true,
          payments: {
            where: {
              deletedAt: null,
            },
            select: {
              amount: true,
              status: true,
            },
          },
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
    if (
      currentVersion &&
      payload.version &&
      currentVersion !== payload.version
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This form changed elsewhere. Reload the latest version before saving.",
      });
    }
    const salesProfile = payload.meta.customerProfileId
      ? await tx.customerTypes.findFirst({
          where: {
            id: payload.meta.customerProfileId,
          },
          select: {
            coefficient: true,
          },
        })
      : null;
    const salesCoefficient =
      finiteOptionalNumber(salesProfile?.coefficient) ??
      finiteOptionalNumber(currentMeta.salesCoefficient) ??
      finiteOptionalNumber(currentMeta.sales_percentage);

    const nextVersion = `${Date.now()}-${generateRandomString(8)}`;
    const nextCreatedAt = resolveOrderCreatedAt(
      payload.meta.createdAt,
      order?.createdAt,
    );
    const nextPaymentDueDate = resolveOrderPaymentDueDate(
      payload.type,
      payload.meta,
      nextCreatedAt,
    );
    const nextFormMeta = {
      ...payload.meta,
      paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
      createdAt: nextCreatedAt.toISOString(),
      paymentDueDate: nextPaymentDueDate?.toISOString() || null,
      goodUntil: safeDate(payload.meta.goodUntil)?.toISOString() || null,
      prodDueDate: safeDate(payload.meta.prodDueDate)?.toISOString() || null,
    };
    const legacyMeta = projectSalesFormMetaToLegacyMeta({
      existingMeta: currentMeta,
      form:
        salesCoefficient == null
          ? nextFormMeta
          : {
              ...nextFormMeta,
              salesCoefficient,
            },
      summary,
      extraCosts: payload.extraCosts,
      cccPercentage: settings.cccPercentage,
    });
    const nextMeta: NewSalesFormContainer = {
      ...legacyMeta,
      newSalesForm: {
        version: nextVersion,
        updatedAt: new Date().toISOString(),
        autosave: payload.autosave,
        lineItems: normalizedLines,
        extraCosts: payload.extraCosts,
        summary,
        form: nextFormMeta,
      },
    };
    const nextAmountDue =
      order?.id != null
        ? projectLegacyOrderPayments({
            salesOrderId: order.id,
            grandTotal: summary.grandTotal,
            payments: order.payments || [],
          }).amountDue
        : summary.grandTotal;

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
          createdAt: nextCreatedAt,
          paymentDueDate: nextPaymentDueDate,
          goodUntil: safeDate(payload.meta.goodUntil),
          prodDueDate: safeDate(payload.meta.prodDueDate),
          deliveryOption:
            payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
          inventoryStatus:
            payload.type === "order" ? payload.inventoryStatus || null : null,
          taxPercentage: summary.taxRate,
          subTotal: summary.subTotal,
          tax: summary.taxTotal,
          grandTotal: summary.grandTotal,
          amountDue: nextAmountDue,
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
        inventoryStatus:
          payload.type === "order" ? payload.inventoryStatus || null : null,
        updatedAt: new Date(),
        createdAt: nextCreatedAt,
        paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
        paymentDueDate: nextPaymentDueDate,
        goodUntil: safeDate(payload.meta.goodUntil),
        prodDueDate: safeDate(payload.meta.prodDueDate),
        payments: [],
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
            payload.meta.paymentTerm ||
            order.paymentTerm ||
            DEFAULT_PAYMENT_TERM,
          createdAt: nextCreatedAt,
          paymentDueDate: nextPaymentDueDate,
          goodUntil: safeDate(payload.meta.goodUntil),
          prodDueDate: safeDate(payload.meta.prodDueDate),
          deliveryOption:
            payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
          inventoryStatus:
            payload.type === "order"
              ? payload.inventoryStatus || order.inventoryStatus || null
              : null,
          taxPercentage: summary.taxRate,
          subTotal: summary.subTotal,
          tax: summary.taxTotal,
          grandTotal: summary.grandTotal,
          amountDue: nextAmountDue,
          meta: nextMeta as any,
        },
      });
      await tx.salesExtraCosts.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          amount: 0,
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
      await tx.dykeStepForm.updateMany({
        where: {
          salesId: order.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      await tx.dykeSalesShelfItem.updateMany({
        where: {
          salesOrderItem: {
            salesOrderId: order.id,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      await tx.housePackageTools.updateMany({
        where: {
          salesOrderId: order.id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      await tx.dykeSalesDoors.updateMany({
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

    if (legacySaveLines.length) {
      for (const legacyLine of legacySaveLines) {
        const line = legacyLine.line;
        const row = legacyLine.row || {};
        const rowQty =
          legacyLine.kind === "service" || legacyLine.kind === "moulding"
            ? Number(row.qty || 0)
            : line.qty;
        const rowUnitPrice =
          legacyLine.kind === "service"
            ? Number(row.unitPrice || 0)
            : legacyLine.kind === "moulding"
              ? row.customPrice == null || row.customPrice === ""
                ? Number(row.salesPrice || 0) + Number(row.addon || 0)
                : Number(row.customPrice || 0) + Number(row.addon || 0)
              : line.unitPrice;
        const rowTotal =
          legacyLine.kind === "service" || legacyLine.kind === "moulding"
            ? roundCurrency(
                Number.isFinite(Number(row.lineTotal))
                  ? Number(row.lineTotal || 0)
                  : rowQty * rowUnitPrice,
              )
            : line.lineTotal;
        const rowDescription =
          legacyLine.kind === "service"
            ? String(row.service || row.description || "").trim()
            : legacyLine.kind === "moulding"
              ? String(row.description || row.title || "Moulding").trim()
              : line.description || line.title;
        const rowUid =
          String(row.uid || "").trim() ||
          (legacyLine.kind ? `${line.uid}-${legacyLine.kind}` : line.uid);
        const itemMeta = {
          uid: rowUid,
          title: line.title,
          description: rowDescription,
          meta: line.meta || {},
          ...(legacyLine.kind === "service"
            ? {
                tax: Boolean(row.taxxable),
              }
            : {}),
        };
        const itemData = {
          salesOrderId: currentId!,
          dykeDescription: line.title || null,
          description: rowDescription,
          qty: rowQty,
          rate: rowUnitPrice,
          total: rowTotal,
          multiDykeUid: legacyLine.groupUid,
          multiDyke: Boolean(legacyLine.primaryGroupItem),
          dykeProduction:
            legacyLine.kind === "service" ? Boolean(row.produceable) : false,
          meta: itemMeta as any,
          deletedAt: null,
        };
        const existingSalesItemId = Number(
          row.salesItemId ||
            (legacyLine.kind && !legacyLine.primaryGroupItem ? 0 : line.id) ||
            0,
        );
        const createdItem =
          existingSalesItemId > 0
            ? await tx.salesOrderItems.update({
                where: {
                  id: existingSalesItemId,
                },
                data: itemData,
                select: {
                  id: true,
                },
              })
            : await tx.salesOrderItems.create({
                data: itemData,
                select: {
                  id: true,
                },
              });
        if (!legacyLine.kind || legacyLine.primaryGroupItem) {
          persistedLineItemIds.set(line.uid, createdItem.id);
        }

        const formSteps =
          legacyLine.kind && !legacyLine.primaryGroupItem
            ? []
            : line.formSteps || [];
        if (formSteps.length) {
          const stepRows = formSteps
            .map((step) => ({
              stepId: Number(step.stepId || step.step?.id || 0),
              componentId: step.componentId || null,
              prodUid: step.prodUid || null,
              value: step.value || null,
              qty: Number(step.qty || 0),
              price: Number(step.price || 0),
              basePrice: Number(step.basePrice || 0),
              meta: safeRecord(step.meta) as any,
              salesId: currentId!,
              salesItemId: createdItem.id,
            }))
            .filter((step) => step.stepId > 0);
          if (stepRows.length) {
            await tx.dykeStepForm.createMany({
              data: stepRows,
            });
          }
        }

        const shelfItems = legacyLine.kind ? [] : line.shelfItems || [];
        if (shelfItems.length) {
          const shelfRows = shelfItems
            .map((shelf, index) => {
              const meta = legacyShelfMeta(shelf, index);
              const categoryIds = Array.isArray(meta.categoryIds)
                ? meta.categoryIds
                : [];
              const categoryId =
                Number(shelf.categoryId || 0) ||
                Number(categoryIds[categoryIds.length - 1] || 0);
              return {
                salesOrderItemId: createdItem.id,
                categoryId,
                productId: shelf.productId || null,
                description: shelf.description || null,
                qty: Number(shelf.qty || 0),
                unitPrice: Math.round(Number(shelf.unitPrice || 0)),
                totalPrice: Math.round(Number(shelf.totalPrice || 0)),
                meta: meta as any,
              };
            })
            .filter((shelf) => shelf.categoryId > 0);
          if (shelfRows.length) {
            await tx.dykeSalesShelfItem.createMany({
              data: shelfRows,
            });
          }
        }

        const hpt =
          legacyLine.kind === "moulding"
            ? {
                ...(line.housePackageTool || {}),
                doorType:
                  line.housePackageTool?.doorType ||
                  String(line.title || "Moulding"),
                moldingId:
                  Number(row.mouldingProductId || 0) ||
                  line.housePackageTool?.moldingId ||
                  null,
                stepProductId:
                  Number(row.stepProductId || 0) ||
                  line.housePackageTool?.stepProductId ||
                  null,
                totalPrice: rowTotal,
                totalDoors: 0,
                meta: {
                  ...safeRecord(line.housePackageTool?.meta),
                  priceTags: {
                    ...safeRecord(
                      safeRecord(line.housePackageTool?.meta).priceTags,
                    ),
                    moulding: {
                      ...safeRecord(
                        safeRecord(
                          safeRecord(line.housePackageTool?.meta).priceTags,
                        ).moulding,
                      ),
                      addon: Number(row.addon || 0),
                      overridePrice:
                        row.customPrice == null || row.customPrice === ""
                          ? null
                          : Number(row.customPrice || 0),
                      salesPrice: Number(row.salesPrice || 0),
                      basePrice: Number(row.basePrice || 0),
                      price: rowUnitPrice,
                      laborQty: row.laborQty ?? null,
                      unitLabor: row.unitLabor ?? null,
                    },
                  },
                  legacyGroupUid: legacyLine.groupUid,
                  legacySalesItemId: row.salesItemId ?? null,
                  legacyHptId: row.hptId ?? null,
                },
                doors: [],
              }
            : legacyLine.kind
              ? null
              : line.housePackageTool;
        const hasHpt =
          !!hpt &&
          (!!hpt.doorType ||
            !!hpt.dykeDoorId ||
            !!hpt.doorId ||
            !!hpt.moldingId ||
            !!hpt.stepProductId ||
            !!hpt.totalDoors ||
            !!hpt.totalPrice ||
            !!(hpt.doors || []).length);

        if (hasHpt && hpt) {
          const hptData = {
            salesOrderId: currentId!,
            orderItemId: createdItem.id,
            height: hpt.height || null,
            doorType: hpt.doorType || null,
            doorId: hpt.doorId || null,
            dykeDoorId: hpt.dykeDoorId || null,
            jambSizeId: hpt.jambSizeId || null,
            casingId: hpt.casingId || null,
            moldingId: hpt.moldingId || null,
            stepProductId: hpt.stepProductId || null,
            totalPrice: Number(hpt.totalPrice || 0),
            totalDoors: Number(hpt.totalDoors || 0),
            meta: safeRecord(hpt.meta) as any,
            deletedAt: null,
          };
          const existingHptId = Number(
            row.hptId ||
              (legacyLine.kind && !legacyLine.primaryGroupItem ? 0 : hpt.id) ||
              0,
          );
          const createdHpt =
            existingHptId > 0
              ? await tx.housePackageTools.update({
                  where: {
                    id: existingHptId,
                  },
                  data: hptData,
                  select: {
                    id: true,
                  },
                })
              : await tx.housePackageTools.create({
                  data: hptData,
                  select: {
                    id: true,
                  },
                });

          const doors = (hpt.doors || []).filter(
            (door) =>
              !!door.dimension && (door.lhQty || door.rhQty || door.totalQty),
          );
          if (doors.length) {
            for (const door of doors) {
              const doorData = {
                housePackageToolId: createdHpt.id,
                salesOrderId: currentId!,
                salesOrderItemId: createdItem.id,
                dimension: door.dimension!,
                swing: door.swing || null,
                doorType: door.doorType || hpt.doorType || null,
                doorPrice: Number(door.doorPrice || 0),
                jambSizePrice: Number(door.jambSizePrice || 0),
                casingPrice: Number(door.casingPrice || 0),
                unitPrice: Number(door.unitPrice || 0),
                lhQty: Math.round(Number(door.lhQty || 0)),
                rhQty: Math.round(Number(door.rhQty || 0)),
                totalQty: Math.round(
                  Number(door.totalQty || 0) ||
                    Number(door.lhQty || 0) + Number(door.rhQty || 0),
                ),
                lineTotal: Number(door.lineTotal || 0),
                stepProductId: door.stepProductId || null,
                meta: safeRecord(door.meta) as any,
                deletedAt: null,
              };
              const existingDoorId = Number(door.id || 0);
              if (existingDoorId > 0) {
                await tx.dykeSalesDoors.update({
                  where: {
                    id: existingDoorId,
                  },
                  data: doorData,
                });
              } else {
                await tx.dykeSalesDoors.create({
                  data: doorData,
                });
              }
            }
          }
        }
      }
    }

    if (payload.extraCosts.length) {
      const existingCostIds = payload.extraCosts
        .map((cost) => Number(cost.id || 0))
        .filter((id) => id > 0);

      await tx.salesExtraCosts.deleteMany({
        where: {
          orderId: currentId,
          id: {
            notIn: existingCostIds.length ? existingCostIds : [0],
          },
        },
      });

      for (const cost of payload.extraCosts) {
        if (cost.id) {
          const updatedCost = await tx.salesExtraCosts.update({
            where: { id: cost.id },
            data: {
              label: cost.label,
              amount: Number(cost.amount || 0),
              type: cost.type as any,
              taxxable: cost.taxxable ?? false,
            },
            select: {
              id: true,
            },
          });
          persistedExtraCosts.push({
            ...cost,
            id: updatedCost.id,
          });
          continue;
        }
        const createdCost = await tx.salesExtraCosts.create({
          data: {
            orderId: currentId!,
            label: cost.label,
            amount: Number(cost.amount || 0),
            type: cost.type as any,
            taxxable: cost.taxxable ?? false,
          },
          select: {
            id: true,
          },
        });
        persistedExtraCosts.push({
          ...cost,
          id: createdCost.id,
        });
      }
    }

    const hydratedLineItems = normalizedLines.map((line) => ({
      ...line,
      id: persistedLineItemIds.get(line.uid) ?? line.id ?? null,
    }));
    const hydratedExtraCosts = persistedExtraCosts.length
      ? persistedExtraCosts
      : payload.extraCosts;
    nextMeta.newSalesForm = {
      ...nextMeta.newSalesForm,
      lineItems: hydratedLineItems,
      extraCosts: hydratedExtraCosts,
    };
    await tx.salesOrders.update({
      where: {
        id: currentId,
      },
      data: {
        meta: nextMeta as any,
      },
    });

    await tx.salesTaxes.deleteMany({
      where: {
        salesId: currentId,
      },
    });

    if (payload.meta.taxCode) {
      await tx.salesTaxes.create({
        data: {
          salesId: currentId,
          taxCode: payload.meta.taxCode,
          taxxable: summary.taxableSubTotal,
          tax: summary.taxTotal,
        },
      });
    }

    return {
      salesId: currentId,
      slug: order.slug,
      orderId: order.orderId,
      inventoryStatus:
        payload.type === "order"
          ? payload.inventoryStatus || order.inventoryStatus || null
          : null,
      type: payload.type,
      isNew,
      version: nextVersion,
      updatedAt: nextMeta.newSalesForm?.updatedAt,
      form: nextFormMeta,
      lineItems: hydratedLineItems,
      extraCosts: hydratedExtraCosts,
      summary,
      settings,
      status,
    };
  });
}

export async function saveDraftNewSalesForm(
  ctx: TRPCContext,
  input: SaveDraftNewSalesFormSchema,
) {
  const payload = saveDraftNewSalesFormSchema.parse(input);
  const result = await saveNewSalesFormInternal(ctx, payload, "Draft");
  await queueSalesInventoryLineItemsSync({
    salesOrderId: result.salesId,
    source: "new-form",
    triggeredByUserId: ctx.userId ?? null,
  });
  const isQuote = result.type === "quote";
  await expireCurrentSalesDocumentSnapshots({
    db: ctx.db,
    salesOrderId: result.salesId,
    reason: "invoice_updated",
    documentPrefixes: isQuote
      ? ["quote_pdf"]
      : [
          "invoice_pdf",
          "production_pdf",
          "packing_slip_pdf",
          "order_packing_pdf",
          "quote_pdf",
        ],
  });
  await queueSalesDocumentSnapshotWarmups(
    isQuote
      ? [{ salesOrderId: result.salesId, mode: "quote" }]
      : [
          { salesOrderId: result.salesId, mode: "invoice" },
          { salesOrderId: result.salesId, mode: "production" },
          { salesOrderId: result.salesId, mode: "packing-slip" },
          { salesOrderId: result.salesId, mode: "order-packing" },
        ],
  );
  return result;
}

export async function saveFinalNewSalesForm(
  ctx: TRPCContext,
  input: SaveFinalNewSalesFormSchema,
) {
  const payload = saveFinalNewSalesFormSchema.parse(input);
  const result = await saveNewSalesFormInternal(ctx, payload, "Active");
  await queueSalesInventoryLineItemsSync({
    salesOrderId: result.salesId,
    source: "new-form",
    triggeredByUserId: ctx.userId ?? null,
  });
  const isQuote = result.type === "quote";
  await expireCurrentSalesDocumentSnapshots({
    db: ctx.db,
    salesOrderId: result.salesId,
    reason: "invoice_updated",
    documentPrefixes: isQuote
      ? ["quote_pdf"]
      : [
          "invoice_pdf",
          "production_pdf",
          "packing_slip_pdf",
          "order_packing_pdf",
          "quote_pdf",
        ],
  });
  await queueSalesDocumentSnapshotWarmups(
    isQuote
      ? [{ salesOrderId: result.salesId, mode: "quote" }]
      : [
          { salesOrderId: result.salesId, mode: "invoice" },
          { salesOrderId: result.salesId, mode: "production" },
          { salesOrderId: result.salesId, mode: "packing-slip" },
          { salesOrderId: result.salesId, mode: "order-packing" },
        ],
  );
  return result;
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
      salesOrderId: true,
      meta: true,
    },
  });
  if (!line) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Line item not found.",
    });
  }
  const result = await ctx.db.$transaction(async (tx) => {
    const deletedAt = new Date();
    await tx.salesOrderItems.update({
      where: {
        id: line.id,
      },
      data: {
        deletedAt,
      },
    });
    await tx.dykeStepForm.updateMany({
      where: {
        salesId: line.salesOrderId,
        salesItemId: line.id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });
    await tx.dykeSalesShelfItem.updateMany({
      where: {
        salesOrderItemId: line.id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });
    await tx.housePackageTools.updateMany({
      where: {
        salesOrderId: line.salesOrderId,
        orderItemId: line.id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });
    await tx.dykeSalesDoors.updateMany({
      where: {
        salesOrderId: line.salesOrderId,
        salesOrderItemId: line.id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    const order = await tx.salesOrders.findFirst({
      where: {
        id: line.salesOrderId,
        deletedAt: null,
      },
      select: {
        meta: true,
        payments: {
          where: {
            deletedAt: null,
          },
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });
    const container = safeMeta(order?.meta);
    const persisted = container.newSalesForm;
    const lineMeta = safeRecord(line.meta);
    const lineUid = String(lineMeta.uid || "").trim();
    const nextVersion = `${Date.now()}-${generateRandomString(8)}`;
    const updatedAt = deletedAt.toISOString();
    const nextLineItems = (persisted?.lineItems || []).filter((item: any) => {
      if (Number(item?.id || 0) === line.id) return false;
      if (lineUid && String(item?.uid || "") === lineUid) return false;
      const meta = safeRecord(item?.meta);
      if (Number(meta.salesItemId || meta.legacySalesItemId || 0) === line.id) {
        return false;
      }
      const groupedRows = [
        ...(((item as any)?.shelfItems || []) as any[]),
        ...(((item as any)?.formSteps || []) as any[]),
      ];
      return !groupedRows.some((row) => {
        const rowMeta = safeRecord(row?.meta);
        return Number(row?.salesItemId || rowMeta.salesItemId || 0) === line.id;
      });
    });
    const setting = await tx.settings.findFirst({
      where: {
        type: "sales-settings",
      },
      select: {
        meta: true,
      },
    });
    const settings = deriveNewSalesFormSettings(setting?.meta);
    const nextSummary = persisted
      ? recalculateSummary({
          taxRate: Number(persisted.summary?.taxRate || 0),
          paymentMethod: persisted.form?.paymentMethod || null,
          cccPercentage: settings.cccPercentage,
          lineItems: nextLineItems,
          extraCosts: (persisted.extraCosts || []).map((cost) => ({
            type: cost.type,
            amount: Number(cost.amount || 0),
            taxxable: cost.taxxable ?? false,
          })),
        })
      : null;
    const nextAmountDue = nextSummary
      ? projectLegacyOrderPayments({
          salesOrderId: line.salesOrderId,
          grandTotal: nextSummary.grandTotal,
          payments: order?.payments || [],
        }).amountDue
      : null;
    const nextMeta: NewSalesFormContainer = persisted
      ? {
          ...container,
          newSalesForm: {
            ...persisted,
            version: nextVersion,
            updatedAt,
            lineItems: nextLineItems,
            summary: nextSummary,
          },
        }
      : container;
    await tx.salesOrders.update({
      where: {
        id: line.salesOrderId,
      },
      data: {
        ...(nextSummary
          ? {
              subTotal: nextSummary.subTotal,
              tax: nextSummary.taxTotal,
              grandTotal: nextSummary.grandTotal,
              amountDue: nextAmountDue,
            }
          : {}),
        meta: nextMeta as any,
      },
    });
    if (nextSummary) {
      await tx.salesTaxes.deleteMany({
        where: {
          salesId: line.salesOrderId,
        },
      });
      if (persisted?.form?.taxCode) {
        await tx.salesTaxes.create({
          data: {
            salesId: line.salesOrderId,
            taxCode: persisted.form.taxCode,
            taxxable: nextSummary.taxableSubTotal,
            tax: nextSummary.taxTotal,
          },
        });
      }
    }

    return {
      version: nextVersion,
      updatedAt,
      lineItems: nextLineItems,
      ...(nextSummary ? { summary: nextSummary } : {}),
    };
  });
  return {
    ok: true,
    lineItemId: payload.lineItemId,
    ...result,
  };
}
