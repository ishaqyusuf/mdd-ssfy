import type {
  CalculateSalesFormSummaryInput,
  SalesFormExtraCostLike,
  SalesFormLineItemLike,
  SalesFormSummaryResult,
} from "../contracts/types";

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function normalizeTitle(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isExtraCostTaxable(cost: SalesFormExtraCostLike) {
  if (typeof cost.taxxable === "boolean") return cost.taxxable;
  const type = normalizeTitle(String(cost.type || ""));
  if (type === "discount" || type === "discountpercentage") return false;
  if (type === "labor" || type === "flatlabor") return false;
  if (type === "customtaxxable") return true;
  if (type === "customnontaxxable") return false;
  if (type === "delivery") return true;
  return false;
}

function inferItemType(line: SalesFormLineItemLike) {
  const itemTypeStep = (line.formSteps || []).find(
    (step) => normalizeTitle(step?.step?.title) === "item type",
  );
  return normalizeTitle(itemTypeStep?.value);
}

function isTaxableLineLegacy(line: SalesFormLineItemLike) {
  if (typeof line.taxxable === "boolean") return line.taxxable;
  const itemType = inferItemType(line);
  const isService = itemType === "services" || itemType === "service";
  if (isService) {
    const metaTaxxable = (line.meta as { taxxable?: unknown } | null)?.taxxable;
    if (typeof metaTaxxable === "boolean") return metaTaxxable;
    return false;
  }
  return true;
}

function isTaxableLineCurrent(line: SalesFormLineItemLike) {
  if (typeof line.taxxable === "boolean") return line.taxxable;
  return true;
}

function sumByType(extraCosts: SalesFormExtraCostLike[], types: string[]) {
  return roundCurrency(
    extraCosts
      .filter((cost) => types.includes(String(cost.type)))
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );
}

function deriveLaborFromLineItems(lineItems: SalesFormLineItemLike[]) {
  const deriveRowsLabor = (rows: any[], fallbackRate: number) =>
    roundCurrency(
      (rows || []).reduce((rowSum: number, row: any) => {
        const unitLabor = safeNumber(
          row?.pricing?.unitLabor ??
            row?.unitLabor ??
            row?.meta?.unitLabor ??
            row?.meta?.laborConfig?.rate ??
            fallbackRate,
        );
        const laborQty = safeNumber(
          row?.pricing?.laborQty ??
            row?.laborQty ??
            row?.meta?.laborQty ??
            row?.qty ??
            row?.totalQty,
        );
        if (!unitLabor || !laborQty) return rowSum;
        return rowSum + roundCurrency(unitLabor * laborQty);
      }, 0),
    );

  return roundCurrency(
    (lineItems || []).reduce((sum, line) => {
      const lineAny = line as any;
      const fallbackRate = safeNumber(lineAny?.meta?.laborConfig?.rate);
      const doors = Array.isArray(lineAny?.housePackageTool?.doors) ? lineAny.housePackageTool.doors : [];
      const serviceRows = Array.isArray(lineAny?.meta?.serviceRows) ? lineAny.meta.serviceRows : [];
      const mouldingRows = Array.isArray(lineAny?.meta?.mouldingRows) ? lineAny.meta.mouldingRows : [];
      const shelfRows = Array.isArray(lineAny?.shelfItems) ? lineAny.shelfItems : [];

      const lineLabor =
        deriveRowsLabor(doors, fallbackRate) +
        deriveRowsLabor(serviceRows, fallbackRate) +
        deriveRowsLabor(mouldingRows, fallbackRate) +
        deriveRowsLabor(shelfRows, fallbackRate);

      return sum + roundCurrency(lineLabor);
    }, 0),
  );
}

function deriveShelfLineTotal(line: SalesFormLineItemLike) {
  const lineAny = line as any;
  const shelfRows = Array.isArray(lineAny?.shelfItems) ? lineAny.shelfItems : [];
  if (!shelfRows.length) return null;
  return roundCurrency(
    shelfRows.reduce((sum: number, row: any) => {
      const explicitTotal = safeNumber(row?.totalPrice);
      if (explicitTotal > 0) return sum + explicitTotal;
      const qty = safeNumber(row?.qty);
      const unitPrice = firstPositiveNumber(
        row?.customPrice,
        row?.salesPrice,
        row?.unitPrice,
        row?.basePrice,
        row?.meta?.customPrice,
        row?.meta?.salesPrice,
        row?.meta?.unitPrice,
        row?.meta?.basePrice,
      );
      return sum + roundCurrency(qty * unitPrice);
    }, 0),
  );
}

function deriveLineTotalForSummary(line: SalesFormLineItemLike) {
  const shelfTotal = deriveShelfLineTotal(line);
  if (shelfTotal != null) return shelfTotal;
  const qty = safeNumber(line.qty);
  const unitPrice = safeNumber(line.unitPrice);
  const computed = roundCurrency(qty * unitPrice);
  return line.lineTotal == null ? computed : safeNumber(line.lineTotal);
}

export function calculateSalesFormSummary(
  input: CalculateSalesFormSummaryInput,
): SalesFormSummaryResult {
  const strategy = input.strategy || "current";
  const lineItems = input.lineItems || [];
  const extraCosts = input.extraCosts || [];

  const subTotal = roundCurrency(
    lineItems.reduce((sum, line) => {
      return sum + deriveLineTotalForSummary(line);
    }, 0),
  );

  const discount = sumByType(extraCosts, ["Discount"]);
  const discountPct = sumByType(extraCosts, ["DiscountPercentage"]);
  const labor = sumByType(extraCosts, ["Labor"]);
  const flatLabor = sumByType(extraCosts, ["FlatLabor"]);
  const derivedLabor = deriveLaborFromLineItems(lineItems);
  const effectiveLabor = derivedLabor > 0 ? derivedLabor : labor;
  const delivery = sumByType(extraCosts, ["Delivery"]);
  const deliveryTaxable = roundCurrency(
    extraCosts
      .filter((cost) => String(cost.type) === "Delivery")
      .filter((cost) => isExtraCostTaxable(cost))
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );
  const deliveryNonTaxable = roundCurrency(delivery - deliveryTaxable);
  const otherCosts = roundCurrency(
    extraCosts
      .filter(
        (cost) =>
          ![
            "Labor",
            "FlatLabor",
            "Delivery",
            "Discount",
            "DiscountPercentage",
          ].includes(String(cost.type)),
      )
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );
  const otherTaxableCosts = roundCurrency(
    extraCosts
      .filter(
        (cost) =>
          ![
            "Labor",
            "FlatLabor",
            "Delivery",
            "Discount",
            "DiscountPercentage",
          ].includes(String(cost.type)),
      )
      .filter((cost) => isExtraCostTaxable(cost))
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );
  const otherNonTaxableCosts = roundCurrency(otherCosts - otherTaxableCosts);

  const normalizedTaxRate = Math.max(0, Math.min(100, safeNumber(input.taxRate)));
  const percentDiscountValue = roundCurrency(subTotal * (discountPct / 100));
  const adjustedSubTotal = roundCurrency(
    subTotal - discount - percentDiscountValue + effectiveLabor + delivery + otherCosts,
  );

  if (strategy === "legacy") {
    const taxableLineSubTotal = roundCurrency(
      lineItems.reduce((sum, line) => {
        const lineTotalRaw = deriveLineTotalForSummary(line);
        return isTaxableLineLegacy(line) ? sum + lineTotalRaw : sum;
      }, 0),
    );

    const taxableBeforeDiscount = roundCurrency(
      taxableLineSubTotal + deliveryTaxable + otherTaxableCosts,
    );
    const maxTaxableDiscount = roundCurrency(
      Math.min(discount + percentDiscountValue, taxableBeforeDiscount),
    );
    const taxableSubTotal = roundCurrency(
      Math.max(0, taxableBeforeDiscount - maxTaxableDiscount),
    );
    const taxTotal = roundCurrency(taxableSubTotal * (normalizedTaxRate / 100));
    const subGrandTot = roundCurrency(
      subTotal - discount - percentDiscountValue + taxTotal,
    );
    const extraCostsBeforeCcc = roundCurrency(
      deliveryTaxable +
        deliveryNonTaxable +
        otherTaxableCosts +
        otherNonTaxableCosts,
    );
    const grandBeforeCcc = roundCurrency(
      subGrandTot + extraCostsBeforeCcc + effectiveLabor + flatLabor,
    );
    const isCreditCard =
      normalizeTitle(input.paymentMethod) === "credit card" ||
      normalizeTitle(input.paymentMethod) === "card";
    const cccPercentage = Math.max(0, safeNumber(input.cccPercentage ?? 3.5));
    const cccBase = roundCurrency(subGrandTot + extraCostsBeforeCcc + effectiveLabor);
    const ccc = isCreditCard
      ? roundCurrency((cccBase * cccPercentage) / 100)
      : 0;

    return {
      subTotal,
      adjustedSubTotal,
      taxRate: normalizedTaxRate,
      taxTotal,
      grandTotal: roundCurrency(grandBeforeCcc + ccc),
      discount,
      discountPct,
      percentDiscountValue,
      labor: roundCurrency(effectiveLabor + flatLabor),
      delivery,
      otherCosts,
      taxableSubTotal,
      ccc,
      strategy,
    };
  }

  const taxableLineSubTotalCurrent = roundCurrency(
    lineItems.reduce((sum, line) => {
      const lineTotalRaw = deriveLineTotalForSummary(line);
      return isTaxableLineCurrent(line) ? sum + lineTotalRaw : sum;
    }, 0),
  );
  const taxableBeforeDiscount = roundCurrency(
    taxableLineSubTotalCurrent + deliveryTaxable + otherTaxableCosts,
  );
  const maxTaxableDiscount = roundCurrency(
    Math.min(discount + percentDiscountValue, taxableBeforeDiscount),
  );
  const taxableSubTotal = roundCurrency(
    Math.max(0, taxableBeforeDiscount - maxTaxableDiscount),
  );
  const taxTotal = roundCurrency(taxableSubTotal * (normalizedTaxRate / 100));
  const grandTotal = roundCurrency(adjustedSubTotal + taxTotal);
  return {
    subTotal,
    adjustedSubTotal,
    taxRate: normalizedTaxRate,
    taxTotal,
    grandTotal,
    discount,
    discountPct,
    percentDiscountValue,
    labor: roundCurrency(effectiveLabor + flatLabor),
    delivery,
    otherCosts,
    taxableSubTotal,
    ccc: 0,
    strategy,
  };
}
