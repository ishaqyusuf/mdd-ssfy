import type {
    NewSalesFormExtraCost,
    NewSalesFormLineItem,
    NewSalesFormMeta,
    NewSalesFormRecord,
    NewSalesFormSaveDraftInput,
    NewSalesFormSummary,
} from "./schema";

function roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function createLineItemUid(index = 0) {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `line-${index + 1}-${stamp}-${random}`;
}

export function createEmptyLineItem(index = 0): NewSalesFormLineItem {
    return {
        id: null,
        uid: createLineItemUid(index),
        title: "",
        description: "",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        meta: {},
        formSteps: [],
        shelfItems: [],
        housePackageTool: null,
    };
}

export function normalizeLineItem(
    line: Partial<NewSalesFormLineItem>,
    index = 0,
): NewSalesFormLineItem {
    const qty = Number(line.qty ?? 0);
    const unitPrice = Number(line.unitPrice ?? 0);
    const computedTotal = roundCurrency(qty * unitPrice);
    return {
        id: line.id ?? null,
        uid: line.uid || createLineItemUid(index),
        title: String(line.title ?? "").trim(),
        description: line.description ?? "",
        qty,
        unitPrice,
        lineTotal: roundCurrency(Number(line.lineTotal ?? computedTotal)),
        meta: line.meta ?? {},
        formSteps: line.formSteps ?? [],
        shelfItems: line.shelfItems ?? [],
        housePackageTool: line.housePackageTool ?? null,
    };
}

export function normalizeLineItems(
    lines: Partial<NewSalesFormLineItem>[],
): NewSalesFormLineItem[] {
    return (lines || []).map((line, index) => normalizeLineItem(line, index));
}

export function normalizeMeta(meta: Partial<NewSalesFormMeta>): NewSalesFormMeta {
    return {
        customerId: meta.customerId ?? null,
        customerProfileId: meta.customerProfileId ?? null,
        billingAddressId: meta.billingAddressId ?? null,
        shippingAddressId: meta.shippingAddressId ?? null,
        paymentTerm: meta.paymentTerm ?? "None",
        goodUntil: meta.goodUntil ?? null,
        po: meta.po ?? "",
        notes: meta.notes ?? "",
        deliveryOption: meta.deliveryOption ?? "pickup",
        taxCode: meta.taxCode ?? null,
    };
}

function toFinite(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function toProfileMultiplier(coefficient?: number | null) {
    const coeff = Number(coefficient);
    if (!Number.isFinite(coeff) || coeff === 0) return 1;
    return roundCurrency(1 / coeff);
}

export function repriceLineItemsByProfile(
    lineItems: NewSalesFormLineItem[],
    previousProfileCoefficient?: number | null,
    nextProfileCoefficient?: number | null,
): NewSalesFormLineItem[] {
    const prevMultiplier = toProfileMultiplier(previousProfileCoefficient);
    const nextMultiplier = toProfileMultiplier(nextProfileCoefficient);
    const ratio = prevMultiplier === 0 ? 1 : nextMultiplier / prevMultiplier;

    return (lineItems || []).map((line, index) => {
        const formSteps = (line.formSteps || []).map((step: any) => {
            const basePrice = toFinite(step?.basePrice);
            const currentPrice = toFinite(step?.price);
            const nextPrice =
                basePrice != null
                    ? roundCurrency(basePrice * nextMultiplier)
                    : currentPrice != null
                      ? roundCurrency(currentPrice * ratio)
                      : currentPrice;
            const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
                ? step.meta.selectedComponents.map((component: any) => {
                      const componentBase = toFinite(component?.basePrice);
                      const currentSales = toFinite(component?.salesPrice);
                      return {
                          ...component,
                          salesPrice:
                              componentBase != null
                                  ? roundCurrency(componentBase * nextMultiplier)
                                  : currentSales != null
                                    ? roundCurrency(currentSales * ratio)
                                    : currentSales,
                      };
                  })
                : step?.meta?.selectedComponents;

            return {
                ...step,
                price: nextPrice,
                meta:
                    selectedComponents == null
                        ? step?.meta
                        : {
                              ...(step?.meta || {}),
                              selectedComponents,
                          },
            };
        });

        const shelfItems = (line.shelfItems || []).map((row: any) => {
            const unitPrice = toFinite(row?.unitPrice) ?? 0;
            const qty = toFinite(row?.qty) ?? 0;
            const nextUnitPrice = roundCurrency(unitPrice * ratio);
            return {
                ...row,
                unitPrice: nextUnitPrice,
                totalPrice: roundCurrency(qty * nextUnitPrice),
            };
        });

        const existingDoors = line.housePackageTool?.doors || [];
        const doors = existingDoors.map((door: any) => {
            const currentUnit = toFinite(door?.unitPrice) ?? 0;
            const totalQty = toFinite(door?.totalQty) ?? 0;
            const nextUnit = roundCurrency(currentUnit * ratio);
            return {
                ...door,
                unitPrice: nextUnit,
                lineTotal: roundCurrency(totalQty * nextUnit),
            };
        });
        const doorQty = doors.reduce(
            (sum, row: any) => sum + Number(row?.totalQty || 0),
            0,
        );
        const doorTotal = doors.reduce(
            (sum, row: any) => sum + Number(row?.lineTotal || 0),
            0,
        );
        const stepUnit = formSteps.reduce((sum, step: any) => {
            const value = toFinite(step?.price);
            return sum + Number(value || 0);
        }, 0);
        const shelfTotal = shelfItems.reduce(
            (sum, row: any) => sum + Number(row?.totalPrice || 0),
            0,
        );

        let qty = Number(line.qty || 0);
        let unitPrice = Number(line.unitPrice || 0);
        let lineTotal = Number(line.lineTotal || qty * unitPrice);

        if (doors.length) {
            qty = doorQty || qty;
            lineTotal = roundCurrency(doorTotal);
            unitPrice = qty > 0 ? roundCurrency(lineTotal / qty) : unitPrice;
        } else if (shelfItems.length) {
            lineTotal = roundCurrency(shelfTotal);
            unitPrice = qty > 0 ? roundCurrency(lineTotal / qty) : unitPrice;
        } else if (formSteps.length) {
            unitPrice = roundCurrency(stepUnit);
            lineTotal = roundCurrency(qty * unitPrice);
        } else {
            unitPrice = roundCurrency(unitPrice * ratio);
            lineTotal = roundCurrency(qty * unitPrice);
        }

        return normalizeLineItem(
            {
                ...line,
                qty,
                unitPrice,
                lineTotal,
                formSteps,
                shelfItems,
                housePackageTool: line.housePackageTool
                    ? {
                          ...line.housePackageTool,
                          doors,
                          totalDoors: doors.length
                              ? doorQty
                              : line.housePackageTool.totalDoors,
                          totalPrice: doors.length
                              ? roundCurrency(doorTotal)
                              : line.housePackageTool.totalPrice,
                      }
                    : line.housePackageTool,
            },
            index,
        );
    });
}

export function computeSummary(
    lineItems: NewSalesFormLineItem[],
    taxRate = 0,
    extraCosts: NewSalesFormExtraCost[] = [],
): NewSalesFormSummary {
    const subTotal = roundCurrency(
        lineItems.reduce((sum, line) => {
            const lineTotal = Number.isFinite(line.lineTotal)
                ? Number(line.lineTotal)
                : Number(line.qty) * Number(line.unitPrice);
            return sum + lineTotal;
        }, 0),
    );
    const normalizedTaxRate = Math.max(0, Math.min(100, Number(taxRate || 0)));
    const discount = roundCurrency(
        extraCosts
            .filter((cost) => cost.type === "Discount")
            .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    );
    const discountPct = roundCurrency(
        extraCosts
            .filter((cost) => cost.type === "DiscountPercentage")
            .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    );
    const labor = roundCurrency(
        extraCosts
            .filter((cost) => cost.type === "Labor")
            .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    );
    const delivery = roundCurrency(
        extraCosts
            .filter((cost) => cost.type === "Delivery")
            .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    );
    const otherCosts = roundCurrency(
        extraCosts
            .filter(
                (cost) =>
                    !["Labor", "Delivery", "Discount", "DiscountPercentage"].includes(
                        cost.type,
                    ),
            )
            .reduce((sum, cost) => sum + Number(cost.amount || 0), 0),
    );
    const percentDiscountValue = roundCurrency(subTotal * (discountPct / 100));
    const adjustedSubTotal = roundCurrency(
        subTotal - discount - percentDiscountValue + labor + delivery + otherCosts,
    );
    const taxableSubTotal = Math.max(0, adjustedSubTotal);
    const taxTotal = roundCurrency(taxableSubTotal * (normalizedTaxRate / 100));
    const grandTotal = roundCurrency(taxableSubTotal + taxTotal);
    return {
        subTotal,
        adjustedSubTotal,
        taxRate: normalizedTaxRate,
        taxTotal,
        grandTotal,
        discount,
        discountPct,
        percentDiscountValue,
        labor,
        delivery,
        otherCosts,
    };
}

export function normalizeExtraCosts(
    costs: Partial<NewSalesFormExtraCost>[] = [],
): NewSalesFormExtraCost[] {
    const normalized = (costs || []).map((cost, index) => ({
        id: cost.id ?? null,
        label: (cost.label || `Cost ${index + 1}`).trim(),
        type: (cost.type || "CustomNonTaxxable") as NewSalesFormExtraCost["type"],
        amount: Number(cost.amount || 0),
        taxxable: cost.taxxable ?? false,
    }));
    if (!normalized.some((cost) => cost.type === "Labor")) {
        normalized.push({
            id: null,
            label: "Labor",
            type: "Labor",
            amount: 0,
            taxxable: false,
        });
    }
    return normalized;
}

export function hydrateRecord(record: NewSalesFormRecord): NewSalesFormRecord {
    const normalized = normalizeLineItems(record.lineItems || []);
    const lineItems = normalized.length
        ? normalized
        : [createEmptyLineItem(0)];
    const meta = normalizeMeta(record.form || {});
    const extraCosts = normalizeExtraCosts(record.extraCosts || []);
    const summary = computeSummary(
        lineItems,
        record.summary?.taxRate || 0,
        extraCosts,
    );
    return {
        ...record,
        form: meta,
        lineItems,
        extraCosts,
        summary: {
            ...summary,
            ...record.summary,
        },
    };
}

export function toSaveDraftInput(
    source: Pick<
        NewSalesFormRecord,
        | "type"
        | "salesId"
        | "slug"
        | "version"
        | "form"
        | "lineItems"
        | "extraCosts"
        | "summary"
    >,
    autosave = true,
): NewSalesFormSaveDraftInput {
    const lineItems = normalizeLineItems(source.lineItems || []).map(
        (line, index) => ({
            ...line,
            title: line.title?.trim() || `Line ${index + 1}`,
        }),
    );
    const extraCosts = normalizeExtraCosts(source.extraCosts || []);
    const meta = normalizeMeta(source.form || {});
    const summary = computeSummary(
        lineItems,
        source.summary?.taxRate || 0,
        extraCosts,
    );
    return {
        type: source.type,
        salesId: source.salesId,
        slug: source.slug,
        version: source.version,
        autosave,
        meta,
        lineItems: lineItems as NewSalesFormSaveDraftInput["lineItems"],
        extraCosts,
        summary,
    };
}
