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
        title: "New line item",
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
        title: (line.title || `Line ${index + 1}`).trim(),
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
    const lineItems = normalizeLineItems(record.lineItems || []);
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
    const lineItems = normalizeLineItems(source.lineItems || []);
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
